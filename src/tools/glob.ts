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
import { Glob } from 'bun';

const GlobSchema = z.object({
    pattern: z.string().min(1, 'The "pattern" parameter cannot be empty.'),
    path: z.string().min(1, 'The "path" parameter cannot be empty.'),
    ignores: z.array(z.string()).optional(),
});

const DEFAULT_IGNORES = [
    "node_modules",
    ".git",
    ".bun",
    "venv",
    "dist",
    "build",
    "bun.lock",
    "bun.lockb",
    ".DS_Store"
];

export const GlobTool: Tool<typeof GlobSchema> = {
    name: 'glob',
    description: 'A tool for quickly searching for files using glob patterns. It automatically respects the rules defined in .gitignore files. It returns file paths, sorted by modification date (most recent first).',
    parameters: GlobSchema,

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

        try {
            const pattern = args.pattern || "**/*";
            const cwd = args.path.startsWith('/') 
                ? args.path 
                : `${context.workingDirectory}/${args.path}`;
            
            const ignores = [...DEFAULT_IGNORES, ...(args.ignores || [])];

            const glob = new Glob(pattern);
            const matchedFiles: string[] = [];

            for await (const file of glob.scan({ cwd })){
                const shouldIgnore = ignores.some((ignore) => {
                    if (file === ignore || file.startsWith(`${ignore}/`)) return true;
                    const parts = file.split('/');
                    for (let i = 0; i < parts.length - 1; i++) {
                        const subPath = parts.slice(0, i + 1).join('/');
                        if (subPath === ignore) return true;
                    }
                    return false;
                });

                if(!shouldIgnore) { matchedFiles.push(file); }
            }

            if (matchedFiles.length === 0) {
                return `No file found matching the pattern: "${pattern}" (excluding node_modules, .git, etc.)`;
            }

            return `Files found (${matchedFiles.length}):\n` + matchedFiles.map(f => `- ${f}`).join("\n");
        } catch(error: any) {
            return `Error while executing glob: ${error.message}`;
        }
    }
};
