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
import { readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';


const ListDirSchema = z.object({
    path: z.string().min(1, 'The "path" parameter cannot be empty.'),
    recursive: z.boolean().optional().describe('Recursively list subdirectories contents'),
    maxDepth: z.number().int().positive().optional().describe('Maximum depth for recursive listing'),
    includeHidden: z.boolean().optional().describe('Include hidden files and directories (starting with .)'),
});


interface Entry {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
    permissions: string;
    size: number;
    updatedAt: Date;
}


interface ListDirResult {
    path: string;
    entries: Entry[];
    error?: string;
}


function getPermissions(mode: number, isDirectory: boolean, isSymlink: boolean): string {
    const typeMap = [
        isSymlink ? 'l' : (isDirectory ? 'd' : '-'),
        (mode >>> 15) & 4 ? 'r' : '-',
        (mode >>> 14) & 2 ? 'w' : '-',
        (mode >>> 13) & 1 ? 'x' : '-',
        (mode >>> 12) & 4 ? 'r' : '-',
        (mode >>> 11) & 2 ? 'w' : '-',
        (mode >>> 10) & 1 ? 'x' : '-',
        (mode >>> 9) & 4 ? 'r' : '-',
        (mode >>> 8) & 2 ? 'w' : '-',
        (mode >>> 7) & 1 ? 'x' : '-',
    ];
    return typeMap.join('');
}


function formatSize(size: number): string {
    if (size < 1024) return size.toString();
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}K`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}M`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)}G`;
}


function formatTimestamp(date: Date): string {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate().toString().padStart(2, ' ');
    const timeStr = date.toTimeString().split(' ')[0];

    if (date.getFullYear() !== new Date().getFullYear()) {
        return `${month} ${day}  ${date.getFullYear().toString()} `;
    }

    return `${month} ${day}  ${timeStr} `;
}


async function scanDirectory(dirPath: string, entries: Entry[], includeHidden: boolean, maxDepth?: number, currentDepth: number = 0): Promise<void> {
    const items = await readdir(dirPath);

    for (const name of items) {
        if (!includeHidden && name.startsWith('.')) continue;

        const fullPath = join(dirPath, name);
        let stats;

        try {
            stats = await lstat(fullPath);
        } catch {
            continue;
        }

        const entry: Entry = {
            name,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
            permissions: getPermissions(stats.mode, stats.isDirectory(), stats.isSymbolicLink()),
            size: stats.size,
            updatedAt: stats.mtime,
        };

        entries.push(entry);

        if (entry.isDirectory && maxDepth !== undefined && currentDepth < maxDepth) {
            try {
                const subEntries: Entry[] = [];
                await scanDirectory(fullPath, subEntries, includeHidden, maxDepth, currentDepth + 1);
                // We don't add subEntries here; recursive listing is handled in the main function
            } catch {
                // Skip directories we can't read
            }
        }
    }
}


async function list_dir(args: any): Promise<ListDirResult> {
    const entries: Entry[] = [];

    try {
        await scanDirectory(args.path, entries, args.includeHidden || false, args.maxDepth);
    } catch (error: any) {
        return {
            path: args.path,
            entries: [],
            error: error.message || String(error),
        };
    }

    // Sort: directories first, then files/symlinks, alphabetically within each group
    const sorted = entries.sort((a, b) => {
        const aIsDir = a.isDirectory ? 1 : 0;
        const bIsDir = b.isDirectory ? 1 : 0;

        if (aIsDir !== bIsDir) return bIsDir - aIsDir;
        return a.name.localeCompare(b.name);
    });

    return {
        path: args.path,
        entries: sorted,
    };
}


function formatListDirOutput(result: ListDirResult): string {
    if (result.error) {
        return `Error reading ${result.path}: ${result.error}`;
    }

    if (result.entries.length === 0) {
        return `The directory '${result.path}' is empty.`;
    }

    let output = `\n${result.path}:\n`;

    for (const entry of result.entries) {
        const sizeStr = formatSize(entry.size).padStart(6);
        const timestamp = formatTimestamp(entry.updatedAt);
        const suffix = entry.isDirectory ? '/' : (entry.isSymlink ? ' -> ...' : '');
        output += `${entry.permissions}  ${sizeStr}  ${timestamp}${entry.name}${suffix}\n`;
    }

    return output;
}


export const ListDirTool: Tool<typeof ListDirSchema> = {
    name: 'list_dir',
    description: 'List directory contents in ls -l format. Shows permissions, size, modification date for each entry. Supports recursive listing with depth control and hidden file inclusion. Use this to explore project structure, locate files, or map the codebase architecture.',
    parameters: ListDirSchema,

    execute: async (args, context: ToolContext): Promise<ToolResult | string> => {
        // Resolve path
        const resolvedPath = args.path.startsWith('/')
            ? args.path
            : join(context.workingDirectory, args.path);

        // Verify whitelist access
        if (context.allowedPaths !== undefined && context.allowedPaths.length > 0) {
            const allowed = context.allowedPaths.some(p => resolvedPath.startsWith(p));
            if (!allowed) {
                return { success: false, content: 'Access denied: path not in allowed list' };
            }
        }

        const result = await list_dir({ ...args, path: resolvedPath });
        const formatted = formatListDirOutput(result);

        return formatted;
    },
};

registry.register(ListDirTool);
