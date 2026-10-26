/*
Copyright 2026 Andrea Michael Molino

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/


import { getModel, setConsoleTitle, setModel, writeToStdout, setRandomTitle } from './utils/utils';
import { exit } from './commands/exit';
import { getAvailableModels, getModelInfo } from './commands/models';
import { loadSettingsOnEnv, getUnrestrictedAccess } from './utils/config';
import { createResponse } from './llm/client';
import { getSystemPrompt } from './prompts/system';
import { Memory } from './agent/memory';
import { StateModel } from './agent/state';
import { registry } from './tools/registry';
import { ToolExecutor } from './agent/tool_executor';
import type { FunctionCallOutput } from './types/openai';
import { Orchestrator } from './agents/orchestrator';
import { registerBuiltinAgents } from './agents/agent_registry';


import './tools/read_file';
import './tools/write_file';
import './tools/glob';
import './tools/execute_command';
import './tools/read_env';
import './tools/list_dir';
import './tools/grep';
import './tools/patch_file';


let globalOrchestrator: Orchestrator | null = null;


async function initializeOrchestrator(): Promise<Orchestrator> {
    if (!globalOrchestrator) {
        globalOrchestrator = new Orchestrator();
        registerBuiltinAgents(globalOrchestrator);
        await globalOrchestrator.loadExternalAgents();
    }
    return globalOrchestrator;
}


async function processCommand(prompt: string, orchestrator: Orchestrator): Promise<void> {
    const trimmed = prompt.trim().toLowerCase();

    switch (trimmed.split(" ")[0]) {
        case "/exit":
            return exit(0);
        
        case "/clear":
            console.clear();
            break;

        // FIXME: Implement a menu that displays the models, allows the user to select the one to use, sets it in the environment, and saves it to the settings.json file.
        case "/models":
            await getAvailableModels();
            break;

        case "/agents":
            writeToStdout(orchestrator.listAgents());
            break;

        default:
            if (trimmed.startsWith("/agent ")) {
                const rest = trimmed.slice("/agent ".length);
                const spaceIndex = rest.indexOf(' ');
                
                if (spaceIndex === -1) return;
                
                const agentName = rest.slice(0, spaceIndex).trim();
                const userPrompt = rest.slice(spaceIndex + 1).trim();
                
                if (!userPrompt) return;
                
                try {
                    const context = {
                        workingDirectory: process.cwd(),
                        allowedPaths: getUnrestrictedAccess() ? undefined : [process.cwd()],
                    };
                    
                    const systemPrompt = await getSystemPrompt();
                    const result = await orchestrator.processPrompt(userPrompt, context, systemPrompt);
                    writeToStdout(result.text + '\n');
                } catch (error) {
                    console.error(`[Orchestrator] Error: ${error}`);
                    writeToStdout(`[Orchestrator] No agent matched for '${agentName}'.\n`);
                }
            }
            break;
    }
}


async function processPrompt(prompt: string, memory: Memory) {
    const context = {
        workingDirectory: process.cwd(),
        allowedPaths: getUnrestrictedAccess() ? undefined : [process.cwd()],
    };

    try {
        if (globalOrchestrator) {
            const result = await globalOrchestrator.processPrompt(prompt, context);
            memory.previousResponseId = null;
            memory.tokenUsed = result.tokensUsed;
            return result;
        }
    } catch (error) {
        // Fallback to general assistant mode when no agent matches
        let response;

        if (memory.previousResponseId === null) {
            response = await createResponse({
                model: getModel()!,
                input: prompt,
                instructions: await getSystemPrompt(),
                previous_response_id: null,
                tools: registry.getToolsForProvider(process.env.VICTOR_PROVIDER!),
                tool_choice: "auto"
            });
        } else {
            response = await createResponse({
                model: getModel()!,
                input: prompt,
                instructions: null,
                previous_response_id: memory.previousResponseId,
                tools: registry.getToolsForProvider(process.env.VICTOR_PROVIDER!),
                tool_choice: "auto"
            });
        }

        const executor = new ToolExecutor(registry, context);
        const toolCalls = response.output?.filter((item) => item.type === 'function_call') as FunctionCallOutput[] || [];

        if (toolCalls.length > 0) {
            let currentPrompt = executor.formatResultsAsUserMessage(await executor.executeCalls(toolCalls));

            for (let turn = 0; turn < 5; turn++) {
                const followUpResponse = await createResponse({
                    model: getModel()!,
                    input: currentPrompt,
                    instructions: null,
                    previous_response_id: memory.previousResponseId,
                    tools: registry.getToolsForProvider(process.env.VICTOR_PROVIDER!),
                    tool_choice: "auto"
                });

                const nextToolCalls = followUpResponse.output?.filter((item) => item.type === 'function_call') as FunctionCallOutput[] || [];

                if (nextToolCalls.length === 0) {
                    response = followUpResponse;
                    break;
                }

                currentPrompt = executor.formatResultsAsUserMessage(await executor.executeCalls(nextToolCalls));
            }
        }

        const output = response.output;
        let output_text = '';

        for (let i = 0; i < output?.length!; i++) {
            const item = output![i];

            if (item !== undefined && 'content' in item && Array.isArray(item.content)) {
                for (const c of item.content) {
                    if (c.type === 'output_text') {
                        output_text += c.text;
                    }
                }
            }
        }

        memory.previousResponseId = response.id;
        memory.tokenUsed = response.usage.total_tokens;

        return { text: output_text, tokensUsed: response.usage.total_tokens };
    }
}


async function interactiveMode(): Promise<void> {
    console.clear();

    const orchestrator = await initializeOrchestrator();
    const memory = new Memory();
    const state = new StateModel();
    
    const input = "> ";
    writeToStdout(input);
    for await (const line of console) {
        setRandomTitle();

        if (line.startsWith('/')) {
           await processCommand(line, orchestrator);
        } else {
            await getModelInfo(state);//FIXME: Refactor this function istead of void it returns a boolean value and notifies the user interface about the model's status (online or offline).
            
            const result = await processPrompt(line, memory);

            (result) ? writeToStdout(result.text) : writeToStdout("Something went wrong...");
            writeToStdout(`\n\nContext used: ${memory.computeTokenUsage(memory.tokenUsed, state.getMaxContextLength())}\n\n`)
        }

        setConsoleTitle("Victor");
        writeToStdout(input);
    }
}


export async function cli() {
    const args: string[] = process.argv.slice(2);

    switch (args[0]) {
        case "--version":
        case "--v":
            console.log(process.env.VICTOR_VERSION);
            return exit(0);
    
        case "--model":
            setModel(args[1]!);
            break;

        default:
            break;
    }

    await loadSettingsOnEnv();

    setConsoleTitle("Victor");
    return await interactiveMode();
}
