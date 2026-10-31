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


const ReadFileSchema = z.object({
    path: z.string().min(1, 'The "path" parameter cannot be empty.')
});

export const ReadFileTool: Tool<typeof ReadFileSchema> = {
    name: 'read_file',
    description: 'Read the contents of a file in the filesystem',
    parameters: ReadFileSchema,

    execute: async (args, context: ToolContext): Promise<ToolResult | string> => {
        // 1. Verify unrestricted access
        if (context.allowedPaths === undefined) {
            // Unlimited access. skip checks
        } else {
            // Resolve absolute path
            const resolved = args.path.startsWith('/') 
                ? args.path 
                : `${context.workingDirectory}/${args.path}`;
            
            // Verify whitelist
            const allowed = context.allowedPaths.some(p => resolved.startsWith(p));
            if (!allowed) {
                return { success: false, content: 'Access denied: path not allowed' };
            }
        }

        // 2. Block dangerous paths
        const dangerous = ['/etc/', '/proc/', '/sys/', '/dev/'];
        if (dangerous.some(d => args.path.includes(d))) {
            return { success: false, content: 'Access denied: dangerous path' };
        }

        const content = await Bun.file(args.path).text();
        return { success: true, content };
    }
};
