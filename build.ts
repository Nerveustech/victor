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

import { build } from 'bun';
import { mkdir } from 'node:fs/promises';
import { exit } from 'node:process';

const VICTOR_VERSION = "0.1.0";

const targets = [
  { target: "bun-darwin-arm64", name: "mac-arm64" },
  { target: "bun-darwin-x64", name: "mac-x64" },
  { target: "bun-linux-x64", name: "linux-x64" },
  { target: "bun-linux-x64-modern", name: "linux-x64-modern" },
  { target: "bun-linux-musl-x64", name: "linux-musl-x64" },
  { target: "bun-windows-x64", name: "win-x64" },
  { target: "bun-windows-x64-modern", name: "win-x64-modern" },
];

await mkdir("./dist", { recursive: true });

for (const {target, name} of targets) {
    console.log(`[INFO] Compiling target: '${target}'`);

    const outfile = `./dist/victor-${name}${target.includes("windows") ? ".exe" : ""}`;

    const result = await build({
        entrypoints: ["./src/index.ts"],
        outdir: outfile,
        target: target as any,
        compile: {
            outfile: name
        },
        minify: true,
        bytecode: true,

        define: {
            "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
            "process.env.VICTOR_VERSION": JSON.stringify(VICTOR_VERSION),
        },
    });

    if (!result.success) {
        console.error(`[ERROR] When building: ${target}:`);
        for (const log of result.logs) {
            console.error(log);
        }
        exit(1);
    }

    console.log(`[OK] ${outfile}`);
}
