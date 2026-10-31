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
import { readdir, lstat, stat, readFile } from 'node:fs/promises';
import { join } from 'node:path';


const ListDirSchema = z.object({
    path: z.string().min(1, 'The "path" parameter cannot be empty.'),
    recursive: z.union([
        z.boolean(),
        z.string().transform(val => {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return true;
            if (lower === 'false' || lower === 'no' || lower === '0') return false;
            throw new Error(`Invalid boolean value: "${val}"`);
        })
    ]).optional().describe('Recursively list subdirectories contents'),
    
    maxDepth: z.coerce.number()
        .int()
        .positive()
        .default(3)
        .optional()
        .describe('Maximum depth for recursive listing (default: 3)'),
    
    includeHidden: z.union([
        z.boolean(),
        z.string().transform(val => {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return true;
            if (lower === 'false' || lower === 'no' || lower === '0') return false;
            throw new Error(`Invalid boolean value: "${val}"`);
        })
    ]).optional().describe('Include hidden files and directories'),
    
    followSymlinks: z.union([
        z.boolean(),
        z.string().transform(val => {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes' || lower === '1') return true;
            if (lower === 'false' || lower === 'no' || lower === '0') return false;
            throw new Error(`Invalid boolean value: "${val}"`);
        })
    ]).optional().describe('Follow symbolic links to their targets'),

    globPattern: z.string().optional().describe('Filter results using glob pattern (e.g., "*.ts", "**/test/*")'),
});


interface Entry {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
    isSymlink: boolean;
    permissions: string;
    size: number;
    updatedAt: Date;
    target?: string; // For symlinks, shows the target path
}


interface ListDirResult {
    path: string;
    entries: Entry[];
    totalSize: number;
    fileCount: number;
    dirCount: number;
    symlinkCount: number;
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
    
    // Add special bits if present
    const hasSetuid = (mode >>> 6) & 4;
    const hasSetgid = (mode >>> 6) & 2;
    const hasSticky = (mode >>> 6) & 1;
    
    let suffix = '';
    if (hasSetuid) suffix += 'S';
    if (hasSetgid) suffix += 's';
    if (hasSticky) suffix += 't';
    
    return typeMap.join('') + suffix;
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


async function scanDirectory(
    dirPath: string, 
    entries: Entry[], 
    includeHidden: boolean,
    recursive?: boolean,
    maxDepth?: number, 
    currentDepth: number = 0,
    followSymlinks: boolean = false,
    globPattern?: string
): Promise<void> {
    const items = await readdir(dirPath);

    let globMatcher;
    if(globPattern) {
        try {
            globMatcher = new Bun.Glob(globPattern);
        } catch(error: any) {
            console.warn(`Invalid glob pattern "${globPattern}": ${error.message}`);
            globMatcher = null;
        }
    }

    for (const name of items) {
        // Skip hidden files if not requested
        if (!includeHidden && name.startsWith('.')) continue;

        const fullPath = join(dirPath, name);
        let stats;

        try {
            // Use stat instead of lstat when following symlinks
            stats = followSymlinks ? await stat(fullPath) : await lstat(fullPath);
        } catch (error: any) {
            // Skip files we can't access or that don't exist
            continue;
        }

        const isSymlink = !followSymlinks && stats.isSymbolicLink();
        
        let target: string | undefined;
        if (isSymlink) {
            try {
                target = await readFile(fullPath, 'utf8').catch(() => undefined);
            } catch {
                // Can't read symlink target
            }
        }

        const entry: Entry = {
            name,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            isSymlink,
            permissions: getPermissions(stats.mode, stats.isDirectory(), isSymlink),
            size: stats.size,
            updatedAt: stats.mtime,
            target,
        };

        // Apply glob pattern filter if specified
        if (globMatcher && !globMatcher.match(name)) {
            continue;
        }

        entries.push(entry);

        // Recursively scan subdirectories if requested and depth allows
        const shouldRecurse = followSymlinks ? entry.isDirectory : entry.isDirectory && !entry.isSymlink;
        
        if (shouldRecurse) {
            // Check both the recursive flag and the maximum depth
            const willExceedMaxDepth = maxDepth !== undefined && currentDepth >= maxDepth - 1;

            if (!willExceedMaxDepth && recursive !== false) {
                try {
                    await scanDirectory(fullPath, entries, includeHidden, recursive, maxDepth, currentDepth + 1, followSymlinks, globPattern);
                } catch {
                    continue;
                }
            }
        }
    }
}


async function list_dir(args: any): Promise<ListDirResult> {
    const entries: Entry[] = [];

    try {
        await scanDirectory(
            args.path, 
            entries, 
            args.includeHidden || false, 
            args.recursive !== undefined ? args.recursive : true,
            args.maxDepth || 3, // Default max depth of 3 levels
            0,
            args.followSymlinks || false,
            args.globPattern
        );
    } catch (error: any) {
        return {
            path: args.path,
            entries: [],
            totalSize: 0,
            fileCount: 0,
            dirCount: 0,
            symlinkCount: 0,
            error: error.message || String(error),
        };
    }

    // Sort: directories first, then symlinks, then files/symlinks, alphabetically within each group
    const sorted = entries.sort((a, b) => {
        const aIsDir = a.isDirectory ? 1 : 0;
        const bIsDir = b.isDirectory ? 1 : 0;

        if (aIsDir !== bIsDir) return bIsDir - aIsDir;
        
        // Sort symlinks before regular files/dirs
        const aIsSymlink = a.isSymlink ? 1 : 0;
        const bIsSymlink = b.isSymlink ? 1 : 0;
        if (aIsSymlink !== bIsSymlink) return bIsSymlink - aIsSymlink;
        
        return a.name.localeCompare(b.name);
    });

    // Calculate statistics
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const fileCount = entries.filter(e => e.isFile).length;
    const dirCount = entries.filter(e => e.isDirectory).length;
    const symlinkCount = entries.filter(e => e.isSymlink).length;

    return {
        path: args.path,
        entries: sorted,
        totalSize,
        fileCount,
        dirCount,
        symlinkCount,
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
        
        // Handle symlinks specially
        if (entry.isSymlink && entry.target) {
            output += `${entry.permissions}  ${sizeStr}  ${timestamp}${entry.name} -> ${entry.target}\n`;
        } else {
            const suffix = entry.isDirectory ? '/' : '';
            output += `${entry.permissions}  ${sizeStr}  ${timestamp}${entry.name}${suffix}\n`;
        }
    }

    // Add summary statistics
    output += `\nTotal: ${result.entries.length} entries (${result.fileCount} files, ${result.dirCount} directories, ${result.symlinkCount} symlinks)\n`;
    output += `Total size: ${formatSize(result.totalSize)}\n`;

    return output;
}


export const ListDirTool: Tool<typeof ListDirSchema> = {
    name: 'list_dir',
    description: 'List directory contents in ls -l format. Shows permissions, size, modification date for each entry. Supports recursive listing with depth control, hidden file inclusion, symlink following, and glob pattern filtering. Use this to explore project structure, locate files, or map the codebase architecture.',
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
