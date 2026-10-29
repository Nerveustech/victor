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

import path from 'node:path';
import { saveToSettings } from './config';
import { homedir } from 'node:os';


export function setRandomTitle() {
    const titles = ["On Duty!", "Processing prompt...", "Doing a magic trick", "Working on it!"];
    const randomIndex = Math.floor(Math.random() * titles.length);
    setConsoleTitle(`Victor | ${titles[randomIndex]}`);
}


export function isBaseUrlSet(): boolean {
    if (process.env.VICTOR_BASE_URL === undefined || process.env.VICTOR_BASE_URL === "") { return false; }
    return true;
}


export function setBaseUrl(url: string): void {
    process.env.VICTOR_BASE_URL = url;
    saveToSettings("base_url", url);
}


export function getBaseUrl(): string | undefined {
    return process.env.VICTOR_BASE_URL;
}


export function isProviderSet(): boolean {
    if (process.env.VICTOR_PROVIDER === undefined || process.env.VICTOR_PROVIDER === "") { return false; }
    return true;
}


export function setProvider(provider: string): void {
    process.env.VICTOR_PROVIDER = provider;
    saveToSettings("provider", provider);
}


export function getProvider(): string | undefined {
    return process.env.VICTOR_PROVIDER;
}


export function setModel(model: string): void {
    process.env.MODEL = model;
    saveToSettings("model", model);
}


export function getModel(): string | undefined {
    return process.env.MODEL;
}


export function setApiKey(api_key: string): void {
    process.env.VICTOR_API_KEY = api_key;
}


export function getApiKey(): string | undefined {
    return process.env.VICTOR_API_KEY;
}


export function setConsoleTitle(title: string): void {
    writeToStdout(`\x1b]0;${title}\x07`);
}


export function getConfigPath() {
    return `${homedir()}${path.normalize("/.config/victor/settings.json")}`;
}

export function getDumpPath() {
    return `${homedir()}${path.normalize("/.config/victor/dumps/")}`;
}


export function writeToStdout(text: string) {
    Bun.write(Bun.stdout, text);
}
