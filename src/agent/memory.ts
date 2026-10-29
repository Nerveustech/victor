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


export let globalBashHistory: BashHistory | null = null;


export async function initializeBashHistory(): Promise<BashHistory> {
    if (!globalBashHistory) {
        globalBashHistory = new BashHistory();
    }
    return globalBashHistory;
}


export class BashHistory {
    private _history: string[];
    private _currentIndex: number;
    private _maxLimit: number;

    constructor(maxLimit = 2000){
        this._history = [];
        this._currentIndex = -1;
        this._maxLimit = maxLimit;
    }

    public push(element: string) {
        if (this._history.length >= this._maxLimit) {
            this._history.shift();
        }

        this._history.push(element);
        this._currentIndex = this._history.length - 1;
    }
    
    get history() {
        return this._history;
    }

    //TODO: use this when a new session is created
    public clear() {
        this._history = [];
        this._currentIndex = -1;
    }
}


export class Memory {
    _tokenUsed: number;
    _previousResponseId: string | null;
    _contextSize: number;

    constructor() {
        this._tokenUsed = 0;
        this._previousResponseId = null;
        this._contextSize = 0;
    }

    computeTokenUsage(promptToken: number, totalContextWindow: number): string {
        if (promptToken === 0 || totalContextWindow === 0) { return "0.00%"; }
        const formula: number = (promptToken / totalContextWindow) * 100
        return `${formula.toFixed(2)}%`;
    }

    get previousResponseId(): string | null {
        return this._previousResponseId;
    }

    set previousResponseId(id: string | null) {
        this._previousResponseId = id;
    }

    get tokenUsed(): number {
        return this._tokenUsed;
    }

    set tokenUsed(num: number) {
        this._tokenUsed = num;
    }

}
