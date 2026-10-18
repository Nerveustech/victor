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

import { z } from 'zod';
import type { Tool, ToolResult, ToolContext } from '../types/tools';
import { registry } from './registry';

const ReadEnvSchema = z.object({
    name: z.string().min(1, 'The "name" parameter cannot be empty.'),
});

export const ReadEnvTool: Tool<typeof ReadEnvSchema> = {
    name: 'read_env',
    description: 'Read environment variables cross-platform (works on Windows/Linux/MacOS). Use Bun.env to access env vars without shell commands.',
    parameters: ReadEnvSchema,

    execute: async (args, context: ToolContext): Promise<ToolResult | string> => {
        const value = Bun.env[args.name];
        
        if (value === undefined) {
            return { success: false, content: `Environment variable "${args.name}" not found` };
        }

        return { 
            success: true, 
            content: `${args.name}=${value}`,
            metadata: { name: args.name, value }
        };
    },
};

registry.register(ReadEnvTool);
