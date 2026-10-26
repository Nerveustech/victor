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


const PatchFileSchema = z.object({
    path: z.string().min(1, 'The "path" parameter cannot be empty.'),
    search: z.string(),
    replacement: z.string(),
    replace_all: z.union([
        z.boolean(),
        z.string().transform(val => {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return true;
            if (lower === 'false' || lower === 'no' || lower === '0') return false;
            throw new Error(`Invalid boolean value: "${val}"`);
        })
    ]).optional(),
});

export const PatchFileTool: Tool<typeof PatchFileSchema> = {
    name: 'patch_file',
    description: 'Search and replace text in a file. Use search to find content, replacement to substitute it.',
    parameters: PatchFileSchema,

    execute: async (args: z.infer<typeof PatchFileSchema>, context?: ToolContext): Promise<ToolResult | string> => {
        // 1. Verify unrestricted access
        if (context?.allowedPaths === undefined) {
            // Unlimited access - skip checks
        } else {
            const resolved = args.path.startsWith('/') 
                ? args.path 
                : `${context.workingDirectory}/${args.path}`;
            
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

        // 3. Read file content
        let originalContent: string;
        try {
            originalContent = await Bun.file(args.path).text();
        } catch (error) {
            return { success: false, content: `Failed to read file at ${args.path}: ${(error as Error).message}` };
        }

        // 4. Perform replacement
        let newContent: string;
        if (args.replace_all) {
            newContent = originalContent.replaceAll(args.search, args.replacement);
        } else {
            newContent = originalContent.replace(args.search, args.replacement);
        }

        // 5. Check if content changed
        if (newContent === originalContent) {
            return { success: false, content: 'No matches found for search string.' };
        }

        // 6. Write updated content
        try {
            await Bun.write(args.path, newContent);
            const count = args.replace_all ? 'all' : 'first';
            return { success: true, content: `Successfully replaced ${count} occurrence(s).` };
        } catch (error) {
            return { success: false, content: `Failed to write file at ${args.path}: ${(error as Error).message}` };
        }
    }
};

registry.register(PatchFileTool);
