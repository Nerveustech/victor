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

import { readFile, writeFile } from 'fs/promises';
import { getConfigPath, setBaseUrl, setModel, setProvider } from './utils';


interface Settings {
    base_url: string,
    provider: string,
    model?: string,
}


export async function getSettings() {
    const path = getConfigPath();

    try {
        const file = Bun.file(path);
        const data: Settings = await file.json();
        return data;
    } catch (error) {
        console.error("Failed to read or parse JSON file:", error);    
    }
}


export async function loadSettingsOnEnv() {
    const path = getConfigPath();

    try {
        const file = Bun.file(path);
        const data: Settings = await file.json();

        setBaseUrl(data.base_url);
        setProvider(data.provider);
        if (data.model !== undefined) setModel(data.model);

    } catch (error) {
        console.error("Failed to read or parse JSON file:", error);    
    }
}


export async function saveToSettings(key: string, value: string) {
    const buffer = await readFile(getConfigPath(), "utf-8");
    const data = JSON.parse(buffer);

    data[key] = value;

    await writeFile(getConfigPath(), JSON.stringify(data, null, 2), "utf-8");
}