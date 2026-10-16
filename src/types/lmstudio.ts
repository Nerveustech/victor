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

export interface LmStudio {
    models: Model[];
}

export interface Model {
    type:               string;
    publisher:          string;
    key:                string;
    display_name:       string;
    architecture?:      string;
    quantization:       Quantization;
    size_bytes:         number;
    params_string:      null | string;
    loaded_instances:   LoadedInstance[];
    max_context_length: number;
    format:             string;
    capabilities?:      Capabilities;
    description?:       null;
    variants?:          string[];
    selected_variant?:  string;
}

export interface Capabilities {
    vision:               boolean;
    trained_for_tool_use: boolean;
    reasoning:            Reasoning;
}

export interface Reasoning {
    allowed_options: string[];
    default:         string;
}

export interface LoadedInstance {
    id:     string;
    config: Config;
}

export interface Config {
    context_length:          number;
    eval_batch_size:         number;
    parallel:                number;
    flash_attention:         boolean;
    num_experts:             number;
    offload_kv_cache_to_gpu: boolean;
}

export interface Quantization {
    name:            string;
    bits_per_weight: number;
}