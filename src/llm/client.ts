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

import type { ResponsesCreateRequest, ResponsesCreateResponse } from '../types/openai';
import { getApiKey, getBaseUrl, getProvider } from '../utils/utils';


//FIXME: timeout settings, by default we don't set it but if the user want's i can set it
export async function createResponse(body: ResponsesCreateRequest) {
    const provider = getProvider();
    let endpoint = getBaseUrl();
    const apiKey = getApiKey();
    let response;

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
    
    try {
        switch (provider) {
            case "lmstudio":
            case "openai":
                response = await fetch(`${endpoint}/v1/responses`, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(body),
                });
                break;
        
            default:
                throw new Error(`[ERROR] Unsupported provider: ${getProvider()}`);
        }

        if (!response.ok) {
            console.error(`[ERROR] createResponse() -> ${response.status}: ${await response.text()}`);
        }
    } catch(error) {
        console.error(`[ERROR] ${error}`);
    }

    return (await response?.json()) as ResponsesCreateResponse;
}