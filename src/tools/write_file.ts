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
import type { ToolResult, ToolContext } from '../types/tools';
import { registry } from './registry';


const WriteFileSchema = z.object({
    path: z.string().min(1, 'The "path" parameter cannot be empty.'),
    content: z.string(),
});

export const WriteFileTool: any = {
    name: 'write_file',
    description: 'Writing/creating a file in the filesystem.',
    parameters: WriteFileSchema,

    execute: async (args: z.infer<typeof WriteFileSchema>, context?: ToolContext): Promise<string> => {
        // TODO: Security: if !unrestricted_access_to_filesystem, check that args.path is inside allowedPaths or workingDirectory
    
        if (context?.allowedPaths !== undefined) {
            const resolved = args.path.startsWith('/') 
                ? args.path 
                : `${context.workingDirectory}/${args.path}`;
            
            const allowed = context.allowedPaths.some(p => resolved.startsWith(p));
            if (!allowed) {
                throw new Error('Access denied: path not allowed');
            }
        }

        // 2. Block dangerous paths
        const dangerous = ['/etc/', '/proc/', '/sys/', '/dev/'];
        if (dangerous.some(d => args.path.includes(d))) {
            throw new Error('Access denied: dangerous path');
        }
        
        // 3. Write content into the file using Bun
        await Bun.write(args.path, args.content);
        
        return `File successfully written to ${args.path}`;
    }
};

registry.register(WriteFileTool);