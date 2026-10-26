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
import { loadAllAgents, createAgentFromDefinition, type LoadedAgent } from './loader';
import type { ToolContext } from '../types/tools';


export class Orchestrator {
    private agents: Map<string, BaseAgent> = new Map();

    constructor() {}

    register(agent: BaseAgent): void {
        this.agents.set(agent.name.toLowerCase(), agent);
    }

    async loadExternalAgents(): Promise<void> {
        const loadedAgents = await loadAllAgents();

        for (const def of loadedAgents) {
            const agent = createAgentFromDefinition(def);
            this.register(agent);
        }
    }

    getAgent(name: string): BaseAgent | null {
        return this.agents.get(name.toLowerCase()) || null;
    }

    getAllAgents(): BaseAgent[] {
        return Array.from(this.agents.values());
    }

    listAgents(): string {
        const agents = this.getAllAgents();
        if (agents.length === 0) {
            return 'No custom agents registered.';
        }

        let output = 'Registered agents:\n\n';
        for (const agent of agents) {
            output += `- **${agent.name}**: ${agent.description}\n`;
            const tools = agent.getToolNames().join(', ');
            if (tools) {
                output += `  Tools: ${tools}\n`;
            }
            output += '\n';
        }
        return output;
    }

    route(prompt: string): BaseAgent | null {
        const trimmed = prompt.trim().toLowerCase();
        
        const agentPrefix = '/agent ';
        if (trimmed.startsWith(agentPrefix)) {
            const rest = trimmed.slice(agentPrefix.length);
            const spaceIndex = rest.indexOf(' ');
            
            if (spaceIndex === -1) return null;
            
            const agentName = rest.slice(0, spaceIndex).trim();
            const agent = this.getAgent(agentName);
            
            if (agent) {
                const userPrompt = rest.slice(spaceIndex + 1).trim();
                if (!userPrompt) return null;
                
                return agent;
            }
            
            const available = this.getAllAgents().map(a => a.name).join(', ');
            console.error(`[Orchestrator] Agent '${agentName}' not found. Available: ${available}`);
            return null;
        }

        let bestMatch: BaseAgent | null = null;
        let bestScore = 0;

        const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'are', 'use', 'to', 'in', 'on', 'is', 'it', 'be', 'an']);

        for (const agent of this.agents.values()) {
            const descriptionWords = agent.description.toLowerCase().split(/\s+/);
            let score = 0;

            for (const word of descriptionWords) {
                if (word.length < 3 || stopWords.has(word)) continue;
                
                if (trimmed.includes(word)) {
                    score += 10;
                }
            }

            const descPhrases = agent.description.toLowerCase().match(/\b\w+ \w+\b/g) || [];
            
            for (const phrase of descPhrases) {
                if (trimmed.includes(phrase)) {
                    score += 25;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = agent;
            }
        }

        return bestMatch;
    }

    async processPrompt(prompt: string, context?: ToolContext, systemPrompt?: string): Promise<{ text: string; tokensUsed: number }> {
        const agent = this.route(prompt);
        
        if (!agent) {
            throw new Error('No agent matched for prompt');
        }

        console.log(`🤖 ${agent.name}()`);

        try {
            return await agent.execute(prompt, 10, context, systemPrompt);
        } catch (error) {
            console.error(`[Orchestrator] Error executing agent '${agent.name}':`, error);
            throw new Error(`Failed to execute agent '${agent.name}'.`);
        }
    }
}
