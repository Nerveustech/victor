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

export interface OpenAI {
    object: string;
    data:   Datum[];
}

export interface Datum {
    id:            string;
    object:        string;
    created:       number;
    owned_by:      string;
    shutdown_date: Date | null;
}


export type ResponseId = string;
export type ModelId = string;
export type ToolName = string;
export type ToolCallId = string;

export type Role = "system" | "developer" | "user" | "assistant";

export type ResponseStatus =
  | "in_progress"
  | "completed"
  | "incomplete"
  | "failed";

export type ItemStatus =
  | "in_progress"
  | "completed"
  | "incomplete"
  | "searching"
  | "generating"
  | "failed";

export type DetailLevel = "auto" | "low" | "high" | "original";

export type IncludeParam =
  | "file_search_call.results"
  | "web_search_call.results"
  | "web_search_call.action.sources"
  | "message.input_image.image_url"
  | "computer_call_output.output.image_url"
  | "code_interpreter_call.outputs"
  | "reasoning.encrypted_content"
  | "message.output_text.logprobs";


export interface InputTextContent {
    type: "input_text";
    text: string;
    prompt_cache_breakpoint?: {
        mode: "explicit";
    };
}

export interface InputImageContent {
    type: "input_image";
    image_url?: string | null;
    file_id?: string | null;
    detail?: DetailLevel;
    prompt_cache_breakpoint?: {
        mode: "explicit";
    };
}

export interface InputFileContent {
    type: "input_file";
    file_data?: string;
    file_id?: string | null;
    file_url?: string;
    filename?: string;
    detail?: "auto" | "low" | "high";
    prompt_cache_breakpoint?: {
        mode: "explicit";
    };
}

export type InputContent =
  | InputTextContent
  | InputImageContent
  | InputFileContent;

export interface InputMessage {
    type?: "message";
    role: Exclude<Role, "assistant">;
    content: string | InputContent[];
    status?: ItemStatus;
    phase?: "commentary" | "final_answer" | null;
}

export type ResponsesInput = string | InputMessage[];

/* ---------------------------------------------------------
 * Structured outputs
 * --------------------------------------------------------- */

export interface JsonSchemaFormat {
    type: "json_schema";
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
}

export interface TextFormatOptions {
    format: JsonSchemaFormat;
}

/* ---------------------------------------------------------
 * Tools
 * --------------------------------------------------------- */

export interface WebSearchTool {
    type: "web_search";
    search_context_size?: "low" | "medium" | "high";
}

export interface FileSearchTool {
    type: "file_search";
    vector_store_ids?: string[];
    max_num_results?: number;
}

export interface ComputerTool {
    type: "computer";
    display_width: number;
    display_height: number;
    environment?: "browser" | "desktop";
}

export interface FunctionTool {
    type: "function";
    name: string;
    description?: string | null;
    parameters?: Record<string, unknown> | null;
    strict?: boolean | null;
    allowed_callers?: Array<"direct" | "programmatic"> | null;
    async?: boolean;
    defer_loading?: boolean;
    output_schema?: Record<string, unknown> | null;
}

export interface CustomToolTextFormat {
    type: "text";
}

export interface CustomToolGrammarFormat {
    type: "grammar";
    syntax: "lark" | "regex";
    definition: string;
}

export type CustomToolFormat = CustomToolTextFormat | CustomToolGrammarFormat;

export interface CustomTool {
    type: "custom";
    name: string;
    description?: string;
    allowed_callers?: Array<"direct" | "programmatic"> | null;
    async?: boolean;
    defer_loading?: boolean;
    format?: CustomToolFormat;
}

export interface SearchOutputNamespaceTool {
    type: "tool_search_output_namespace";
    name: string;
    description: string;
    tools: Array<FunctionTool | CustomTool>;
}

export type Tool =
  | WebSearchTool
  | FileSearchTool
  | ComputerTool
  | FunctionTool
  | CustomTool
  | SearchOutputNamespaceTool;

/* ---------------------------------------------------------
 * Request body
 * --------------------------------------------------------- */

export interface ResponsesCreateRequest {
    model: ModelId;
    input?: ResponsesInput;
    instructions?: string | null;

    background?: boolean | null;
    store?: boolean | null;
    conversation?: string | { id: string } | null;
    previous_response_id?: string | null;

    include?: IncludeParam[] | null;
    text?: TextFormatOptions | null;

    tools?: Tool[] | null;
    tool_choice?:
        | "auto"
        | "none"
        | { type: "function"; name: string }
        | { type: "web_search" }
        | { type: "file_search" };

    temperature?: number;
    top_p?: number;
    max_output_tokens?: number;
    reasoning_effort?: "low" | "medium" | "high";

    metadata?: Record<string, string>;
    user?: string;
    parallel_tool_calls?: boolean;
    stream?: boolean | null;

    // escape hatch for future fields
    [key: string]: unknown;
}



export interface OutputText {
    type: "output_text";
    text: string;
    annotations?: unknown[];
    logprobs?: unknown[];
}

export interface OutputRefusal {
    type: "refusal";
    refusal: string;
}

export interface AssistantMessageOutput {
    id: string;
    type: "message";
    role: "assistant";
    status?: ItemStatus;
    phase?: "commentary" | "final_answer" | null;
    content: Array<OutputText | OutputRefusal>;
}

export interface ReasoningOutput {
    id: string;
    type: "reasoning";
    status?: ItemStatus;
    encrypted_content?: string | null;
    summary?: Array<{ type: "summary_text"; text: string }>;
    content?: Array<{ type: "reasoning_text"; text: string }>;
}

export interface FunctionCallOutput {
    id?: string;
    type: "function_call";
    call_id: ToolCallId;
    name: string;
    arguments: string;
}

export interface WebSearchCallOutput {
    id: string;
    type: "web_search_call";
    status: ItemStatus;
}

export interface FileSearchCallOutput {
    id: string;
    type: "file_search_call";
    status: ItemStatus;
    queries: string[];
}

export interface ComputerCallOutput {
    id: string;
    type: "computer_call";
    call_id: ToolCallId;
    status: ItemStatus;
}

export interface ImageGenerationCallOutput {
    id: string;
    type: "image_generation_call";
    status: ItemStatus;
    result?: string | null;
}

export type OutputItem =
  | AssistantMessageOutput
  | ReasoningOutput
  | FunctionCallOutput
  | WebSearchCallOutput
  | FileSearchCallOutput
  | ComputerCallOutput
  | ImageGenerationCallOutput
  | { type: string; [key: string]: unknown };


export interface ResponsesCreateResponse {
    id:                   string;
    object:               string;
    created_at:           number;
    completed_at:         number;
    status:               string;
    incomplete_details:   null;
    model:                string;
    previous_response_id: null;
    instructions:         null;
    output:               OutputItem[];
    error:                null;
    tools:                unknown[];
    tool_choice:          string;
    truncation:           string;
    parallel_tool_calls:  boolean;
    text:                 Text;
    top_p:                number;
    presence_penalty:     number;
    frequency_penalty:    number;
    top_logprobs:         number;
    temperature:          number;
    reasoning:            Reasoning;
    usage:                Usage;
    max_output_tokens:    null;
    max_tool_calls:       null;
    store:                boolean;
    background:           boolean;
    service_tier:         string;
    metadata:             Metadata;
    safety_identifier:    null;
    prompt_cache_key:     null;
}

export interface Metadata {
}

export interface Output {
    id:       string;
    type:     string;
    status:   string;
    summary?: unknown[];
    content:  Content[];
    role?:    string;
}

export interface Content {
    type:         string;
    text:         string;
    annotations?: unknown[];
    logprobs?:    unknown[];
}

export interface Reasoning {
    summary: null;
    effort:  null;
}

export interface Text {
    format: Format;
}

export interface Format {
    type: string;
}

export interface Usage {
    input_tokens:          number;
    output_tokens:         number;
    total_tokens:          number;
    input_tokens_details:  InputTokensDetails;
    output_tokens_details: OutputTokensDetails;
}

export interface InputTokensDetails {
    cached_tokens: number;
}

export interface OutputTokensDetails {
    reasoning_tokens: number;
}