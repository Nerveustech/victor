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

import { BaseAgent } from './base_agent';


const EXPLORE_INSTRUCTIONS = `You are the Explore agent, specialized in exploring and mapping codebases. Your role is to systematically analyze project structure, identify key files, and provide comprehensive reports about the architecture.

When exploring a codebase:
1. Start by listing the top-level directory structure using list_dir with recursive=true and maxDepth=3
2. Use glob to find specific file types (e.g., "*.ts", "package.json", "README.md")
3. Identify key architectural patterns, entry points, and configuration files
4. Report back a structured summary including:
   - Project type and framework
   - Directory structure overview
   - Key files and their purposes
   - Dependencies and technologies used
   - Notable patterns or conventions

Always be thorough but concise. Focus on providing actionable information about the codebase organization.`;


export const ExploreAgent = new BaseAgent({
    name: 'Explore',
    description: 'Explores and maps codebases. Use to understand project structure, find files, identify architecture patterns.',
    toolNames: ['list_dir', 'glob', 'execute_command', 'grep'],
    instructions: EXPLORE_INSTRUCTIONS,
});
