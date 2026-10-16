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

// Last check: 10/11/2026

export interface Anthropic {
    data:     Datum[];
    first_id: string;
    has_more: boolean;
    last_id:  string;
}

export interface Datum {
    id:               string;
    capabilities:     Capabilities;
    created_at:       Date;
    deprecated_at:    Date;
    display_name:     string;
    lifecycle:        string;
    line:             string;
    max_input_tokens: number;
    max_tokens:       number;
    retires_at:       Date;
    type:             string;
}

export interface Capabilities {
    batch:              Batch;
    citations:          Batch;
    code_execution:     Batch;
    context_management: ContextManagement;
    effort:             Effort;
    image_input:        Batch;
    pdf_input:          Batch;
    server_tools:       ServerTools;
    structured_outputs: Batch;
    thinking:           Thinking;
}

export interface Batch {
    supported: boolean;
}

export interface ContextManagement {
    clear_thinking_20251015:  Batch;
    clear_tool_uses_20250919: Batch;
    compact_20260112:         Batch;
    supported:                boolean;
}

export interface Effort {
    high:      Batch;
    low:       Batch;
    max:       Batch;
    medium:    Batch;
    supported: boolean;
    xhigh:     Batch;
}

export interface ServerTools {
    code_execution: Batch;
    supported:      boolean;
    web_search:     Batch;
}

export interface Thinking {
    supported: boolean;
    types:     Types;
}

export interface Types {
    adaptive: Batch;
    disabled: Batch;
    enabled:  Batch;
}