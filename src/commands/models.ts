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

import { StateModel } from '../agent/state';
import type { Anthropic } from '../types/anthropic';
import type { LmStudio } from '../types/lmstudio';
import type { OpenAI } from '../types/openai';
import { getApiKey, getBaseUrl, getModel, getProvider } from '../utils/utils';


async function fetchModels<T>(api: string): Promise<T | undefined> {
    const provider = getProvider();
    let endpoint = `${getBaseUrl()}${api}`;
    const apiKey = getApiKey();
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    
    let response: Response;

    try {
        switch (provider) {
            case "lmstudio":
                response = await fetch(endpoint, { method: "GET", headers: apiKey !== undefined ? headers : { "Content-Type": "application/json" }, signal: AbortSignal.timeout(5000) })
                break;
            case "openai":
                response = await fetch(endpoint, { method: "GET", headers: headers, signal: AbortSignal.timeout(5000)});
                break;
            case "anthropic":
                response = await fetch(endpoint, { method: "GET", headers: { 'Content-Type': 'application/json', 'X-Api-Key': `${apiKey}` }, signal: AbortSignal.timeout(5000) });
                break;
            default:
                throw new Error(`[ERROR] Unsupported provider: ${provider}`);
        }
    
        if (response.ok) return (await response.json()) as T;

        //throw new Error(`[ERROR] fetchModels() -> ${response.status}`);
        console.error(`[ERROR] fetchModels() -> ${response.status}`);
    }

    catch(error: any) {
        if (error.name === 'TimeoutError'){
            console.error(`Request timed out after 5s`);
        }
        //throw new Error(`[ERROR] fetchModels() -> ${error}`);
    }
}


export async function getAvailableModels() {
    const provider = getProvider();
    let models;

    switch (provider) {
        case "lmstudio":
            models = (await fetchModels<LmStudio>("/api/v1/models"))?.models;
            break;
        
        case "openai":
            models = (await fetchModels<OpenAI>("/v1/models"))?.data;
            break;
        
        case "anthropic":
            models = (await fetchModels<Anthropic>("/v1/models"))?.data;
            break;
    
        default:
            break;
    }

    if (models === undefined) {
        console.log("No models available");
        return;
    }
    
    console.log("Models:");
    models?.forEach((value, _) => {
        console.log(`  ${"display_name" in value ? value.display_name : value.id}`);// NOTE: display all the models for the current selected provider
    });

}

export async function getModelInfo(state: StateModel) {
    const provider = getProvider();
    const model = getModel();

    switch (provider) {
        case "lmstudio":
            const models = (await fetchModels<LmStudio>("/api/v1/models"))?.models;

            if (models !== undefined) {
                for (let i = 0; i < models.length; i++) {
                    if (models[i]?.loaded_instances[0]?.id.includes(model!)){
                        state.setMaxContextLength(models[i]!.loaded_instances[0]?.config.context_length!);
                        break;
                    }
                }
            }

            break;
    
        default:
            break;
    }
    
    //console.log("Models:");
    //models?.forEach((value, _) => {
    //    console.log(`  ${"display_name" in value ? value.display_name : value.id}`);// NOTE: display all the models for the current selected provider
    //});

}