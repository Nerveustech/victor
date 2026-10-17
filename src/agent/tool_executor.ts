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

import type { ToolRegistry } from '../tools/registry';
import type { OutputItem, FunctionCallOutput } from '../types/openai';
import type { ToolResult, ToolContext } from '../types/tools';


export class ToolExecutor {
    constructor(
        private registry: ToolRegistry,
        private context: ToolContext
    ) {}

    async executeCalls(calls: OutputItem[]): Promise<ToolResult[]> {
        const results: ToolResult[] = [];

        for (const item of calls) {
            if (item.type !== 'function_call') continue;

            const call = item as FunctionCallOutput;
            const tool = this.registry.get(call.name);

            if (!tool) {
                results.push({
                    success: false,
                    toolName: call.name,
                    content: `Tool '${call.name}' not found in registry.`,
                });
                continue;
            }

            try {
                const args = JSON.parse(call.arguments);
                const validatedArgs = tool.parameters.parse(args);

                const rawResult = await tool.execute(validatedArgs, this.context);
                const content = typeof rawResult === 'string' ? rawResult : rawResult.content;

                results.push({ success: true, toolName: call.name, content });
            } catch (error) {
                results.push({
                    success: false,
                    toolName: call.name,
                    content: `Error executing '${call.name}': ${String(error)}`,
                });
            }
        }

        return results;
    }


    formatResultsAsUserMessage(results: ToolResult[]): string {
        return results.map(r =>
            r.success
                ? `Tool '${r.toolName}' succeeded:\n${r.content}`
                : `Tool failed: ${r.content}`
        ).join('\n---\n');
    }

    private extractTextFromResponse(response: any): string {
        let output_text = '';

        for (let i = 0; i < response.output?.length!; i++) {
            const item = response.output[i];
            if (!item.content || !Array.isArray(item.content)) continue;

            for (const content of item.content) {
                if (content.type === 'output_text' && content.text) {
                    output_text += content.text;
                }
            }
        }

        return output_text;
    }


    async runAgentLoop(
        prompt: string,
        createResponse: (body: any) => Promise<any>,
        maxTurns: number = 5
    ): Promise<string> {
        let currentPrompt = prompt;

        for (let turn = 0; turn < maxTurns; turn++) {
            const response = await createResponse({
                model: process.env.MODEL!,
                input: currentPrompt,
                tools: this.registry.getToolsForProvider(process.env.VICTOR_PROVIDER!),
            });

            const toolCalls = response.output?.filter(
                (item: OutputItem) => item.type === 'function_call'
            ) || [];

            if (toolCalls.length === 0) {
                return this.extractTextFromResponse(response);
            }

            const results = await this.executeCalls(toolCalls);
            currentPrompt = this.formatResultsAsUserMessage(results);
        }

        return `Limit of ${maxTurns} turns reached.`;
    }
}
