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
import { join, isAbsolute } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';


const GrepSchema = z.object({
    pattern: z.string().min(1, 'The "pattern" parameter cannot be empty.'),
    path: z.string().optional().describe('Directory or file to search in (defaults to working directory)'),
    glob: z.string().optional().describe('Optional glob pattern to filter files (e.g., "*.ts", "**/*.md")'),
    context_lines: z.number().min(0).max(50).default(2).optional().describe('Number of lines to show before and after each match (default: 2)'),
    case_sensitive: z.union([
        z.boolean(),
        z.string().transform(val => {
            const lower = val.toLowerCase();
            if (lower === 'true' || lower === 'yes') return true;
            if (lower === 'false' || lower === 'no') return false;
            throw new Error(`Invalid boolean value: "${val}"`);
        })
    ]).optional().describe('Make the search case sensitive (default: false)'),
});


interface GrepResult {
    file: string;
    lineNum: number;
    content: string;
    _lines?: string[];
}

const SEARCHABLE_EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.c', '.h', '.cpp', '.hpp', '.py', '.json', '.md', '.yaml', '.yml', '.txt']);


async function findFiles(dirPath: string, extensions: Set<string>): Promise<string[]> {
    const files: string[] = [];
    
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                // Skip node_modules and .git directories
                if (entry.name === 'node_modules' || entry.name === '.git') continue;
          
          const subFiles = await findFiles(fullPath, extensions);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = getExtension(entry.name);
          if (extensions.has(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Directory not accessible, skip
    }
    
    return files;
}


function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}


async function safeRegexTest(pattern: RegExp, line: string): Promise<boolean> {
    const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 100));
    const test = new Promise<boolean>(resolve => {
        try {
            const result = pattern.test(line);
            resolve(result);
        } catch {
            resolve(false);
        }
    });
    
    return await Promise.race([timeout, test]);
}


export const GrepTool: Tool<typeof GrepSchema> = {
    name: 'grep',
    description: 'Search for patterns in files using grep-like functionality. Supports regex patterns, glob filtering, and context lines around matches. Returns matching file paths with line numbers and matched content.',
    parameters: GrepSchema,

    execute: async (args, context: ToolContext): Promise<ToolResult | string> => {
        const cwd = args.path 
            ? (isAbsolute(args.path) ? args.path : join(context.workingDirectory, args.path))
            : context.workingDirectory;

        if (args.pattern.length > 500) {
            return { success: false, content: 'Pattern too long. Maximum length is 500 characters.' };
        }

        let searchPattern: RegExp;
        try {
            searchPattern = new RegExp(args.pattern, args.case_sensitive === true ? 'g' : 'gi');
        } catch (error) {
            return { success: false, content: `Invalid regex pattern: ${String(error)}` };
        }

        let filesToSearch: string[];
        
        if (args.glob) {
            const glob = new Bun.Glob(args.glob);
            filesToSearch = [];
            for await (const file of glob.scan({ cwd })) {
                filesToSearch.push(file);
            }
        } else {
            try {
                filesToSearch = await findFiles(cwd, SEARCHABLE_EXTENSIONS);
            } catch {
                return { success: false, content: `Error scanning directory: ${cwd}` };
            }
        }

        const MAX_FILES = 100;
        if (filesToSearch.length > MAX_FILES) {
            filesToSearch = filesToSearch.slice(0, MAX_FILES);
        }

        const results: GrepResult[] = [];
        let totalMatches = 0;

        for (const filePath of filesToSearch) {
            try {
                const absPath = isAbsolute(filePath) ? filePath : join(cwd, filePath);
                const fileContent = await readFile(absPath, 'utf-8');
                const lines = fileContent.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    if (await safeRegexTest(searchPattern, lines[i]!)) {
                        searchPattern.lastIndex = 0;
                        
                        results.push({
                            file: filePath,
                            lineNum: i + 1,
                            content: lines[i]!.trim(),
                            _lines: [...lines],
                        });
                        totalMatches++;

                        if (totalMatches >= MAX_FILES * 20) break;
                    }
                }
            } catch {
                continue;
            }
        }

        if (results.length === 0) {
            return `No matches found for pattern "${args.pattern}"`;
        }

        let output = `Matches found (${totalMatches}):\n\n`;
        
        const grouped: Map<string, GrepResult[]> = new Map();
        for (const r of results) {
            if (!grouped.has(r.file)) grouped.set(r.file, []);
            grouped.get(r.file)!.push(r);
        }

        for (const [file, matches] of grouped) {
            output += `${file}:\n`;
            for (const m of matches) {
                const contextLines = args.context_lines ?? 2;
                if (contextLines > 0 && m._lines) {
                    const lineIndex = m.lineNum - 1;
                    const startLine = Math.max(0, lineIndex - contextLines);
                    const endLine = Math.min(m._lines.length, lineIndex + contextLines + 1);
                    
                    for (let j = startLine; j < endLine; j++) {
                        const displayLineNum = j + 1;
                        const isMatch = displayLineNum === m.lineNum;
                        const prefix = isMatch ? '→' : ' ';
                        output += `  ${prefix} ${displayLineNum}: ${m._lines[j]}\n`;
                    }
                } else {
                    output += `  → ${m.lineNum}: ${m.content}\n`;
                }
            }
            output += '\n';
        }

        return output;
    },
};
