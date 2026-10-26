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

import { BaseAgent, type AgentDefinition } from './base_agent';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'path';


const TOOL_NAME_MAPPING: Record<string, string> = {
    'Read': 'read_file',
    'read_file': 'read_file',
    'Write': 'write_file',
    'write_file': 'write_file',
    'Glob': 'glob',
    'glob': 'glob',
    'List dir': 'list_dir',
    'list_dir': 'list_dir',
    'Execute command': 'execute_command',
    'Bash': 'execute_command',
    'execute_command': 'execute_command',
    'Grep': 'grep',
    'grep': 'grep',
    'Read env': 'read_env',
    'read_env': 'read_env',
};


export function mapToolName(name: string): string {
    return TOOL_NAME_MAPPING[name] ?? name;
}

export interface LoadedAgent extends AgentDefinition {
    sourcePath?: string;
}


function parseYamlFrontmatter(content: string): { metadata: Record<string, string>; body: string } | null {
    const trimmed = content.trim();
    
    if (!trimmed.startsWith('---')) {
        return null;
    }

    const afterFirst = trimmed.slice(3);
    const secondEnd = afterFirst.indexOf('---');
    
    if (secondEnd === -1) {
        return null;
    }

    const yamlContent = afterFirst.slice(0, secondEnd).trim();
    const body = afterFirst.slice(secondEnd + 3).trim();

    const metadata: Record<string, string> = {};
    const lines = yamlContent.split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) continue;

        const key = line.slice(0, colonIndex).trim().toLowerCase();
        let value = line.slice(colonIndex + 1).trim();

        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
        }

        metadata[key] = value;
    }

    return { metadata, body };
}


function parseToolString(toolStr: string): string[] {
    const tools = toolStr.split(',').map(t => t.trim()).filter(Boolean);
    return tools.map(mapToolName);
}


export async function loadAgentFromFile(filePath: string): Promise<LoadedAgent | null> {
    try {
        const content = await Bun.file(filePath).text();
        const parsed = parseYamlFrontmatter(content);

        if (!parsed) {
            return null;
        }

        const name = parsed.metadata['name'];
        const description = parsed.metadata['description'] || '';
        const toolsRaw = parsed.metadata['tools'] || '';
        const model = parsed.metadata['model'] || undefined;
        const instructions = parsed.body;

        if (!name) {
            return null;
        }

        const toolNames = parseToolString(toolsRaw);

        return {
            name,
            description,
            toolNames,
            model,
            instructions,
            sourcePath: filePath,
        };
    } catch (error) {
        console.warn(`[Loader] Error loading agent from ${filePath}:`, error);
        return null;
    }
}


export async function loadAgentsFromDirectory(dirPath: string): Promise<LoadedAgent[]> {
    const agents: LoadedAgent[] = [];

    try {
        const files = await readdir(dirPath);
        
        for (const fileName of files) {
            if (!fileName.endsWith('.md')) continue;

            const filePath = join(dirPath, fileName);
            const agent = await loadAgentFromFile(filePath);
            
            if (agent) {
                agents.push(agent);
            }
        }
    } catch (error) {
        console.warn(`[Loader] Error scanning directory ${dirPath}:`, error);
    }

    return agents;
}


export async function loadAllAgents(): Promise<LoadedAgent[]> {
    const agents: LoadedAgent[] = [];

    const globalDir = `${process.env.HOME}/.config/victor/agents`;
    const projectDir = `${process.cwd()}/.victor/agents`;

    await mkdir(globalDir, { recursive: true });

    try {
        const globalAgents = await loadAgentsFromDirectory(globalDir);
        agents.push(...globalAgents);
    } catch (error) {
        console.warn(`[Loader] Error loading global agents from ${globalDir}:`, error);
    }

    try {
        const projectAgents = await loadAgentsFromDirectory(projectDir);
        agents.push(...projectAgents);
    } catch {
        // Project dir doesn't exist, skip
    }

    return agents;
}


export function createAgentFromDefinition(def: AgentDefinition): BaseAgent {
    return new BaseAgent(def);
}
