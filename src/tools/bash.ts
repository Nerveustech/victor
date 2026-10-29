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
import { platform } from 'node:os';
import { globalBashHistory } from '../agent/memory';

const BashSchema = z.object({
    command: z.string().min(1, 'The "command" parameter cannot be empty.'),
    cwd: z.string().optional(),
    timeout_ms: z.number().min(1000).max(60000).default(30000),
});

export const BashTool: Tool<typeof BashSchema> = {
    name: 'bash',
    description: 'Execute a shell command in the working directory. Returns stdout and stderr separately. Cross-platform: uses cmd on Windows, sh on Linux/MacOS.',
    parameters: BashSchema,

    execute: async (args, context: ToolContext): Promise<ToolResult | string> => {
        globalBashHistory?.push(args.command);

        //TODO: Check whether args.command is a SUSPICIOUS_COMMAND; if so, notify the user, display the command, and ask whether they wish to execute it or not.
        //const SUSPICIOUS_COMMAND = ['/^curl -s( -m 10( -o( \/tmp\/)?)?)?$/'];

        // 1. Security: block dangerous commands
        const DANGEROUS_PATTERNS = [
            /^rm\s+(-rf?|--force)/,
            />\s*\/dev\//,
            /\bdd\b/,
            /\bwipe\b/i,
        ];

        if (DANGEROUS_PATTERNS.some(p => p.test(args.command))) {
            return { success: false, content: 'Access denied: dangerous command blocked' };
        }

        // 2. Cross-platform shell detection
        const isWindows = platform() === 'win32';
        let shell: string;
        let shellArgs: string[];

        if (isWindows) {
            shell = 'cmd';
            shellArgs = ['/c', args.command];
        } else {
            shell = 'sh';
            shellArgs = ['-c', args.command];
        }

        // 3. Resolve working directory
        const cwd = args.cwd || context.workingDirectory;

        try {
            // 4. Execute with timeout using Promise.race + process kill
            const MAX_OUTPUT = 10000; // chars per stream
            let stdout = '';
            let stderr = '';
            let stdoutTruncated = false;
            let stderrTruncated = false;

            const decoder = new TextDecoder();

            // Start the process once
            const proc = Bun.spawn({ cmd: [shell, ...shellArgs], cwd });

            // Collect stdout with truncation
            const collectStdout = (async () => {
                for await (const chunk of proc.stdout) {
                    if (stdoutTruncated) break;
                    const text = decoder.decode(chunk);
                    stdout += text;
                    if (stdout.length >= MAX_OUTPUT && !stdoutTruncated) {
                        stdout += '\n... [truncated]';
                        stdoutTruncated = true;
                    }
                }
            })();

            // Collect stderr with truncation
            const collectStderr = (async () => {
                for await (const chunk of proc.stderr ?? []) {
                    if (stderrTruncated) break;
                    const text = decoder.decode(chunk);
                    stderr += text;
                    if (stderr.length >= MAX_OUTPUT && !stderrTruncated) {
                        stderr += '\n... [truncated]';
                        stderrTruncated = true;
                    }
                }
            })();

            // Wait for process completion or timeout
            const timeoutPromise = new Promise((resolve) => 
                setTimeout(() => resolve('timeout'), args.timeout_ms)
            );

            await Promise.race([
                Promise.all([collectStdout, collectStderr]),
                timeoutPromise,
            ]);

            // Kill process if it's still running (timeout case)
            try {
                proc.kill();
            } catch {}

            const exitCode = await proc.exited;

            let result = '';
            if (stdout) result += `stdout:\n${stdout}`;
            if (stderr) result += `\nstderr:\n${stderr}`;
            if (!result) result = '(no output)';

            if (exitCode === 0) {
                return { success: true, content: result };
            } else {
                return { 
                    success: false, 
                    content: `Command failed (exit code ${exitCode}):\n${result}`,
                    metadata: { exitCode }
                };
            }
        } catch (error: any) {
            if (error.message?.includes('timeout')) {
                return { success: false, content: `Command timed out after ${args.timeout_ms}ms` };
            }
            return { success: false, content: `Execution error: ${error.message}` };
        }
    },
};

registry.register(BashTool);
