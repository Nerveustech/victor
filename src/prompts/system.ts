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

import { platform } from 'node:os';

const SYSTEM_PROMPT = `You are Victor, an autonomous cli agent, specialized in software engineering tasks.`

const ENVIRONMENT = `The current working directory (CWD) is: '${process.cwd()}'.
The agent is running under: '${platform()}${await getInfo()}'.
Always ensure your commands and file paths are fully compatible with this specific environment.`;

const TONE_AND_STYLE = `DO NOT USE emojis unless explicitly requested by the user.`


export async function getSystemPrompt() {
    let hostEnv = `# Host Environment\n${ENVIRONMENT}`;
    let toneAndStyle = `# Tone and Style\n${TONE_AND_STYLE}`;
    
    let fullPrompt = `${SYSTEM_PROMPT}\n${hostEnv}\n${toneAndStyle}`;

    return fullPrompt;
}


async function getInfo() {
    const wsl = process.env.WSL_DISTRO_NAME

    if(wsl !== undefined) {
        return `:${wsl} (WSL)`;
    }
}