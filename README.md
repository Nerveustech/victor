# Victor

An autonomous CLI agent specialized in software engineering tasks. Victor is an interactive command-line application that leverages large language models (LLMs) to assist with development workflows through a REPL-style interface.

## Features

- **Interactive REPL** — Natural language prompt interface (`> `) for conversational AI assistance
- **Multi-provider LLM support** — Works with OpenAI, Anthropic, and LM Studio APIs
- **Token tracking** — Displays token usage relative to the model's context window
- **File reading** — Built-in tool to read files from the filesystem (Zod-validated)
- **Cross-platform binaries** — Supports macOS (arm64/x64), Linux, Windows, and Alpine builds
- **Persistent configuration** — Settings stored in `~/.config/victor/settings.json`

## Installation

```bash
git clone https://github.com/Nerveustech/victor.git
cd victor
bun install
bun start
```

### Build binaries

```bash
bun run build
```

This compiles standalone binaries for multiple platforms into the `dist/` directory.

## Usage

Start Victor:

```bash
bun start
# or
bun run src/index.ts
```

### CLI Arguments

| Flag | Description |
|------|-------------|
| `-v`, `--version` | Display version number |
| `--model <name>` | Set the model to use |

### In-REPL Commands

| Command | Description |
|---------|-------------|
| `/exit` | Exit the application |
| `/clear` | Clear terminal screen |
| `/models` | List available models from the configured provider |

## Configuration

Victor loads settings from `~/.config/victor/settings.json`:

```json
{
  "base_url": "https://api.openai.com/v1",
  "provider": "openai",
  "model": "gpt-4"
}
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VICTOR_BASE_URL` | Base URL for the LLM API endpoint | Yes |
| `VICTOR_PROVIDER` | LLM provider: `"lmstudio"`, `"openai"`, or `"anthropic"` | Yes |
| `VICTOR_API_KEY` | API key for authentication | Yes |
| `MODEL` | The model ID to use for requests | Yes |

## Architecture

```
src/
├── index.ts          # Entry point
├── cli.ts            # Core CLI logic, REPL loop, command routing
├── agent/
│   ├── state.ts      # State management (context length tracking)
│   └── memory.ts     # Conversation memory (token usage, response IDs)
├── commands/         # Built-in REPL commands
├── llm/
│   └── client.ts     # LLM API client (OpenAI/LM Studio Responses API)
├── prompts/
│   └── system.ts     # System prompt generation with OS detection
├── tools/
│   └── read_file.ts  # File reading tool
├── types/            # API model type definitions
└── utils/
    ├── config.ts     # Settings persistence
    └── utils.ts      # Helper functions
```

## Development

| Script | Description |
|--------|-------------|
| `bun start` | Run the application |
| `bun dev` | Watch mode for development |
| `bun test` | Run tests |
| `bun run build` | Build cross-platform binaries |
| `bun run clean` | Remove dist folder |

## License

[Apache License 2.0](./LICENSE)
