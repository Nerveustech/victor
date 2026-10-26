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


import { ToolExecutor } from '../agent/tool_executor';
import { createResponse } from '../llm/client';
import { registry } from '../tools/registry';
import type { FunctionCallOutput, OutputItem } from '../types/openai';
import type { ToolContext } from '../types/tools';


export interface AgentDefinition {
    name: string;
    description: string;
    toolNames: string[];
    model?: string;
    instructions: string;
}

export class BaseAgent {
    readonly name: string;
    readonly description: string;
    private readonly _toolNames: string[];
    readonly model?: string;
    readonly instructions: string;

    constructor(def: AgentDefinition) {
        this.name = def.name;
        this.description = def.description;
        this._toolNames = def.toolNames;
        this.model = def.model;
        this.instructions = def.instructions;
    }

    async execute(prompt: string, maxTurns: number = 10, context?: ToolContext, systemPrompt?: string): Promise<{ text: string; tokensUsed: number }> {
        const toolContext: ToolContext = context || {
            workingDirectory: process.cwd(),
            allowedPaths: undefined,
        };

        const executor = new ToolExecutor(registry, toolContext);

        let currentPrompt = prompt;
        let previousResponseId: string | null = null;
        let tokensUsed = 0;

        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await createResponse({
                model: this.model || process.env.MODEL!,
                input: currentPrompt,
                instructions: turn === 0 ? systemPrompt + '\n\n' + this.instructions : null,
                previous_response_id: previousResponseId,
                tools: registry.getToolsForProvider(process.env.VICTOR_PROVIDER!),
                tool_choice: "auto"
            });

            tokensUsed += response.usage.total_tokens;

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

            previousResponseId = response.id;

            const toolCalls = output?.filter((item: OutputItem) => item.type === 'function_call') as FunctionCallOutput[] || [];

            if (toolCalls.length === 0) {
                return { text: output_text.trim(), tokensUsed };
            }

            const results = await executor.executeCalls(toolCalls);
            currentPrompt = executor.formatResultsAsUserMessage(results);
        }

        return { text: `Limit of ${maxTurns} turns reached.`, tokensUsed };
    }

    getToolNames(): string[] {
        return this._toolNames;
    }
}
