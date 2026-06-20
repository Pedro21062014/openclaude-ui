# OpenClaude UI

A beautiful Claude/ChatGPT-like desktop interface for [OpenClaude](https://github.com/Gitlawb/openclaude).

![OpenClaude UI](https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-png/light/claude-color.png)

## Features

- 🎨 **Beautiful Claude/ChatGPT-like UI** — warm cream palette inspired by Claude.ai
- 🤔 **Animated "thinking" gradient orb** — the signature "boitinha" animation with a pulsing gradient
- 🎯 **Multi-provider model selector** with real logos from [lobehub/lobe-icons](https://github.com/lobehub/lobe-icons):
  - Claude (Anthropic) — Opus, Sonnet, Haiku
  - OpenAI — GPT-5, GPT-4.1, o3, o4-mini
  - Google Gemini — Gemini 3 Pro/Flash, 2.5 Pro/Flash
  - DeepSeek — V3.2, R1
  - Z.AI — GLM-4.7, GLM-4.6, GLM-4.5
  - OpenRouter — aggregated gateway
  - Ollama — local models (Llama 4, Qwen3, etc.)
  - Mistral, Qwen, Groq, xAI, Perplexity, Together AI, Fireworks AI
- 🚀 **Auto-installs OpenClaude CLI** on first launch with animated Claude Code logo
- ⚙️ **Unified settings** that configure both the UI and the OpenClaude CLI
- 💾 **Streaming responses** with markdown + syntax highlighting
- 🌗 **Light / dark / system theme** with multiple font options
- 📦 **Cross-platform builds**: Windows (.exe), macOS (.dmg), Linux (.AppImage, .deb)

## Quick start (development)

```bash
npm install
npm run dev
```

This launches Vite dev server on port 5173 and opens Electron pointed at it. Hot-reload is enabled for both the renderer and the main process.

## Build from source

```bash
# Build only for current platform
npm run dist

# Or platform-specific
npm run dist:win     # Windows: NSIS installer + portable
npm run dist:mac     # macOS: DMG + ZIP
npm run dist:linux   # Linux: AppImage + DEB + tar.gz
```

Outputs go into `release/`.

## Downloads (pre-built binaries)

Pre-built installers for Windows, macOS, and Linux are published on the [GitHub Releases page](https://github.com/Gitlawb/openclaude-ui/releases).

| Platform | File | Notes |
|----------|------|-------|
| Windows | `OpenClaude-UI-Setup-1.0.0.exe` | NSIS installer — recommended |
| Windows | `OpenClaude-UI-1.0.0.exe` | Standalone portable |
| macOS | `OpenClaude-UI-1.0.0.dmg` | Disk image |
| macOS | `OpenClaude-UI-1.0.0-mac.zip` | Zipped `.app` |
| Linux | `OpenClaude-UI-1.0.0.AppImage` | Portable AppImage |
| Linux | `openclaude-ui_1.0.0_amd64.deb` | Debian/Ubuntu package |
| Linux | `openclaude-ui-1.0.0.tar.gz` | Tarball |

## First-run experience

1. **Install screen**: On first launch, OpenClaude UI checks whether the `openclaude` CLI is installed on your machine. If not, you'll see an install screen with the animated Claude Code logo and a live install log.
2. **Settings**: Open Settings (gear icon) and paste your API key for your chosen provider. The key is stored locally in your OS's userData directory and passed to OpenClaude CLI on each session.
3. **Chat**: Pick a model from the dropdown, type a message, and hit Enter.

## How it works

OpenClaude UI is an Electron app (Vite + React + TypeScript + Tailwind). On chat:

1. The renderer (React UI) calls `openclaude.startSession()` via the preload-exposed IPC API.
2. The main process spawns `openclaude chat --stream --json --model <id> --api-key <key> ...` as a child process.
3. User messages are written to the child's stdin; NDJSON stream events from stdout are forwarded to the renderer and parsed into incremental text deltas.
4. The renderer renders the streamed text as markdown with syntax highlighting.

## Settings sync

All settings in the Settings modal map to OpenClaude CLI flags:

| UI setting | CLI flag |
|------------|----------|
| Default model | `--model <id>` |
| API key | `--api-key <key>` (or env var) |
| Base URL | `--base-url <url>` |
| System prompt | `--system <prompt>` |
| Temperature | `--temperature <n>` |
| Max tokens | `--max-tokens <n>` |
| Custom args | appended verbatim |

## Project structure

```
openclaude-ui/
├── electron/                  # Electron main + preload
│   ├── main.ts                # Main process: window, IPC, OpenClaude lifecycle
│   ├── preload.ts             # Secure contextBridge API
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── ChatInterface.tsx  # Main chat layout
│   │   ├── MessageList.tsx    # Renders messages with markdown
│   │   ├── MessageInput.tsx   # Auto-resizing textarea
│   │   ├── ModelSelector.tsx  # Provider/model dropdown with logos
│   │   ├── Sidebar.tsx        # Conversations + nav
│   │   ├── SettingsModal.tsx  # Unified settings panel
│   │   ├── InstallScreen.tsx  # First-run install flow
│   │   ├── ThinkingAnimation.tsx
│   │   └── WelcomeScreen.tsx
│   ├── data/models.ts         # All providers + models + logos
│   ├── hooks/
│   │   ├── useOpenClaude.ts   # Session management
│   │   └── useStore.ts        # Zustand global state
│   ├── types/index.ts
│   ├── styles/globals.css
│   ├── App.tsx
│   └── main.tsx
├── build/icon.png             # App icon (Claude logo)
├── .github/workflows/
│   ├── release.yml            # Multi-OS matrix build + GitHub Release
│   └── ci.yml                 # PR build check
├── package.json
├── electron-builder.yml       # (also configured in package.json#build)
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Publishing a release

Releases are built automatically by GitHub Actions on tag push:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the `release.yml` workflow which:
1. Builds Windows (.exe), macOS (.dmg), and Linux (.AppImage + .deb) in parallel
2. Generates SHA256 checksums
3. Creates a GitHub Release with all artifacts attached

You can also trigger a build manually via the Actions tab → "Build & Release" → "Run workflow".

## License

MIT
