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

export interface ToolError {
    type: 'validation_error' | 'execution_error' | 'permission_denied';
    message: string;
    details?: Record<string, unknown>;
}

export interface ToolResult {
    success: boolean;
    toolName?: string;
    content: string;
    error?: ToolError;
    metadata?: Record<string, unknown>;
}

export interface Tool<P extends z.ZodObject<any> = z.ZodObject<any>> {
    name: string;
    description: string;
    parameters: P;
    execute: (args: z.infer<P>, context: ToolContext) => Promise<ToolResult | string>;
}

export interface ToolContext {
    workingDirectory: string;
    allowedPaths?: string[];  // whitelist for filesystem security
    env?: Record<string, string>;
}

export type ToolRegistry = Map<string, Tool<any>>;
