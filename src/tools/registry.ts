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

import type { Tool } from '../types/tools';
import type { FunctionTool } from '../types/openai';

import { BashTool } from './bash';
import { GlobTool } from './glob';
import { GrepTool } from './grep';
import { ListDirTool } from './list_dir';
import { PatchFileTool } from './patch_file';
import { ReadEnvTool } from './read_env';
import { ReadFileTool } from './read_file';
import { WriteFileTool } from './write_file';



export class ToolRegistry {
    private tools = new Map<string, Tool<any>>();

    register(tool: Tool<any>): void {
        this.tools.set(tool.name, tool);
    }

    get(name: string): Tool<any> | undefined {
        return this.tools.get(name);
    }

    getAll(): Tool<any>[] {
        return Array.from(this.tools.values());
    }


    getToolsForProvider(provider: string): FunctionTool[] {
        return this.getAll().map(tool => ({
            type: 'function',
            name: tool.name,
            description: tool.description,
            parameters: this.zodToJsonSchema(tool.parameters),
        }));
    }

    registerBuiltinTools(): void {
        const BUILTIN_TOOLS = [BashTool, GlobTool, GrepTool, ListDirTool, PatchFileTool, ReadEnvTool, ReadFileTool, WriteFileTool];
    
        for (const tool of BUILTIN_TOOLS) {
            registry.register(tool);
        }
    }

    private zodToJsonSchema(schema: any): Record<string, unknown> {
        const def = schema._def || schema.def;

        if (!def) {
            return {};
        }

        const shape = typeof def.shape === 'function' ? def.shape() : (def.shape || def.fields);

        if (shape && typeof shape === 'object') {
            const properties: Record<string, unknown> = {};
            const required: string[] = [];

            for (const [key, value] of Object.entries(shape)) {
                const fieldSchema = value as any;
                const jsonSchema = this.zodToJsonSchema(fieldSchema);
                properties[key] = jsonSchema;

                if (!fieldSchema.isOptional?.()) {
                    required.push(key);
                }
            }

            return {
                type: 'object',
                properties,
                required: required.length > 0 ? required : undefined,
                $schema: 'http://json-schema.org/draft-07/schema#',
            };
        }

        return {};
    }
}


export const registry = new ToolRegistry();
