<div align="center">

# Wayfinder

### The open-source, privacy-first AI browser that runs anywhere.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Chromium 148](https://img.shields.io/badge/Chromium-148-4777E6?logo=google-chrome)](https://www.chromium.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Go](https://img.shields.io/badge/Go-1.24-00ADD8?logo=go)](https://go.dev/)
[![Bun](https://img.shields.io/badge/Bun-1.3-FBF0DF?logo=bun)](https://bun.sh/)
[![Python 3.12+](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python)](https://python.org)
[![GitHub](https://img.shields.io/badge/GitHub-rahulcvwebsitehosting/wayfinder-181717?logo=github)](https://github.com/rahulcvwebsitehosting/wayfinder)

</div>

---

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#6366F1', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
flowchart TB
    User([You]) --> WAYFINDER
    
    subgraph WAYFINDER [Wayfinder Browser]
        direction TB
        CHROMIUM[Chromium 148 Engine] --> AGENT[AI Agent Engine]
        CHROMIUM --> EXT[Extension System]
        CHROMIUM --> MCP[MCP Server]
        AGENT --> WORKFLOWS[Visual Workflows]
        AGENT --> MEMORY[Persistent Memory]
        AGENT --> SCHEDULE[Scheduled Tasks]
        EXT --> WEB[Web Apps & Tabs]
        MCP --> CLI[wayfinder-cli]
        MCP --> CODE_AGENTS[Claude Code / Cursor / Gemini CLI]
    end
    
    WAYFINDER --> PROVIDERS
    
    subgraph PROVIDERS [Bring Your Own AI]
        CLAUDE[Claude - API Key]
        OPENAI[OpenAI / GPT - API Key]
        GEMINI[Gemini - API Key]
        OLLAMA[Ollama - Local]
        LMSTUDIO[LM Studio - Local]
        AZURE[Azure OpenAI]
        BEDROCK[AWS Bedrock]
        OPENROUTER[OpenRouter]
        CHATGPT[ChatGPT Pro - OAuth]
        COPILOT[GitHub Copilot - OAuth]
        QWEN[Qwen Code - OAuth]
    end
    
    WAYFINDER --> APPS
    
    subgraph APPS [Integrations]
        GMAIL[Gmail]
        SLACK[Slack]
        GITHUB[GitHub]
        LINEAR[Linear]
        NOTION[Notion]
        FIGMA[Figma]
        SALESFORCE[Salesforce]
        MORE[40+ MCP Apps]
    end

    style WAYFINDER fill:#6366F1,color:#fff
    style User fill:#1e1b4b,color:#fff
```

---

## What is Wayfinder?

Wayfinder is a **full-featured web browser** (based on Chromium 148) with a built-in **AI agent engine**. It can browse the web, interact with sites, extract data, fill forms, and automate workflows — all through natural language conversation. Your data and API keys stay on your machine.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#a5b4fc', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
flowchart LR
    subgraph YOU [You Control Everything]
        KEYS[Your API Keys]
        DATA[Your Data]
        LOCAL[Local Models]
    end
    
    subgraph NOT [Never Leaves Your Machine]
        BROWSER[Wayfinder Browser]
        AGENT_ENGINE[AI Agent Engine]
        FILES[Your Files]
    end
    
    KEYS --> AGENT_ENGINE
    LOCAL --> AGENT_ENGINE
    AGENT_ENGINE --> BROWSER
    BROWSER --> DATA
    
    style YOU fill:#1e1b4b,color:#fff
    style NOT fill:#6366F1,color:#fff
```

---

## Quick Start

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#a5b4fc', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
flowchart LR
    A[Download & Install] --> B[Import Chrome Data]
    B --> C[Add Your API Key]
    C --> D[Start Automating]
    
    style A fill:#6366F1,color:#fff
    style B fill:#6366F1,color:#fff
    style C fill:#6366F1,color:#fff
    style D fill:#4f46e5,color:#fff
```

### 1. Download

> **No pre-built installer yet.** This repo contains the full source code. Pre-built binaries will be available on the [Releases page](https://github.com/rahulcvwebsitehosting/wayfinder/releases) once the first build is published.

To build from source, see the [Development](#development) section below.

### 2. Import your Chrome data (optional)

First launch walks you through importing bookmarks, passwords, history, and extensions from Chrome. Everything stays local.

### 3. Connect an AI provider

Wayfinder is **bring-your-own-key**. Add one or more providers in Settings:

| Provider | How to connect |
|----------|---------------|
| **Claude (Anthropic)** | API key from console.anthropic.com |
| **OpenAI (GPT-4o, o3)** | API key from platform.openai.com |
| **Google Gemini** | API key from aistudio.google.com |
| **ChatGPT Pro/Plus** | OAuth login |
| **GitHub Copilot** | OAuth login |
| **Qwen Code** | OAuth login |
| **Azure OpenAI** | Endpoint + API key |
| **AWS Bedrock** | IAM credentials |
| **OpenRouter** | API key |
| **Ollama** | Run locally, connect from settings |
| **LM Studio** | Run locally, connect from settings |

### 4. Start using AI

Press `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux) to open the command center, or click the Wayfinder icon in the toolbar to open the AI chat side panel.

---

## Features

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#a5b4fc', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
mindmap
  root((Wayfinder))
    AI Agent
      Browse & Click
      Fill Forms
      Extract Data
      Natural Language
    MCP Server
      Claude Code
      Gemini CLI
      Cursor
      Any MCP Client
    Visual Workflows
      Graph Builder
      Repeatable
      Scheduled
    Privacy
      Local-first
      No Telemetry
      Your Keys Only
    Browser
      Chromium 148
      Vertical Tabs
      Ad Blocking MV2
      Chrome Extensions
    Integrations
      Gmail, Slack
      GitHub, Linear
      Notion, Figma
      40+ MCP Apps
```

### 🤖 AI Agent Engine

The core of Wayfinder. Ask the agent to do anything in the browser:

```
"Find all unread emails from GitHub about my PRs and summarize them"
"Go to Amazon, search for mechanical keyboards under $100, and sort by rating"
"Fill out this job application form with my saved profile"
"Monitor this product page for price drops and notify me"
```

The agent uses **50+ browser automation tools** — navigate, click, type, scroll, extract, screenshot, download — all composed automatically.

### 🔌 MCP Server

Wayfinder exposes a **Model Context Protocol (MCP) server** so external AI coding agents can control the browser:

- **Claude Code**: `"Run the test suite in the browser"`
- **Gemini CLI**: `"Take a screenshot of my app and find the CSS bug"`
- **Cursor**: `"Debug this page's console errors"`

Install with:
```bash
# macOS / Linux
curl -fsSL https://github.com/rahulcvwebsitehosting/wayfinder/releases/latest/download/install.sh | bash

# Windows PowerShell
irm https://github.com/rahulcvwebsitehosting/wayfinder/releases/latest/download/install.ps1 | iex
```

Then run `wayfinder-cli init` to link it to your browser.

### 🔁 Visual Workflows

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#a5b4fc', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
flowchart TD
    START([Start]) --> LOGIN[Login to Dashboard]
    LOGIN --> EXPORT[Export Reports]
    EXPORT --> SAVE[Save to Folder]
    SAVE --> EMAIL[Email Summary]
    EMAIL --> END([Done ✓])
    
    style START fill:#6366F1,color:#fff
    style END fill:#4f46e5,color:#fff
```

Build drag-and-drop automations that run on a schedule. No coding required.

### 🧠 Persistent Memory

The agent remembers context across conversations — your preferences, past tasks, and important information persist automatically.

### 🧩 LLM Hub

Compare responses from multiple AI providers side-by-side on any webpage.

### 📂 Cowork (Files + Browser)

Combine browser automation with local file operations — research the web, save reports to your folder, edit files, all in one workflow.

### ⏰ Scheduled Tasks

Run agents on autopilot:
- "Check for new job postings every morning at 8 AM"
- "Monitor competitor pricing daily"
- "Generate a weekly report every Friday"

### 🛡️ Privacy & Ad Blocking

- **uBlock Origin** pre-installed
- **Manifest V2** support (stronger ad blocking than Chrome)
- **No telemetry**, no tracking, no data collection
- Your API keys stay on your machine

### 📐 Vertical Tabs

Side-panel tab management that keeps you organized even with 100+ tabs open.

---

## How It Compares

| | Wayfinder | Chrome | Brave | Comet | Atlas |
|---|:---:|:---:|:---:|:---:|:---:|
| Open Source | ✅ | ❌ | ✅ | ❌ | ❌ |
| AI Agent | ✅ | ❌ | ❌ | ✅ | ✅ |
| MCP Server | ✅ | ❌ | ❌ | ❌ | ❌ |
| Visual Workflows | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cowork (files + browser) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Scheduled Tasks | ✅ | ❌ | ❌ | ❌ | ❌ |
| Bring Your Own Keys | ✅ | ❌ | ✅ | ❌ | ❌ |
| Local Models (Ollama) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Local-first Privacy | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ad Blocking (MV2) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Chrome Extension Compat | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#6366F1', 'primaryTextColor': '#fff', 'primaryBorderColor': '#4f46e5', 'lineColor': '#a5b4fc', 'secondaryColor': '#1e1b4b', 'tertiaryColor': '#f5f3ff'}}}%%
graph TB
    subgraph BROWSER [Browser - Chromium 148]
        CORE[Chromium Core Engine]
        CDP[Chrome DevTools Protocol]
        EXT_SYS[Extension System]
        LLM_CHAT[AI Chat Side Panel]
        LLM_HUB[LLM Hub Panel]
        VERT[Vertical Tabs]
        SETTINGS[Wayfinder Settings]
    end
    
    subgraph AGENT [Agent Platform]
        SERVER[Bun Server]
        MCP_SRV[MCP Protocol]
        AGENT_LOOP[AI Agent Loop]
        WORKFLOW[Workflow Engine]
        MEMORY[Memory Store]
        TOOLS[50+ Browser Tools]
        AUTH[Provider Auth]
    end
    
    subgraph CLI [CLI Tools]
        WAY_CLI[wayfinder-cli - Go]
        DEV_TOOL[dev Toolchain]
    end
    
    CORE <--> CDP
    CDP <--> SERVER
    EXT_SYS <--> AGENT_LOOP
    SERVER <--> MCP_SRV
    SERVER <--> AGENT_LOOP
    AGENT_LOOP <--> TOOLS
    AGENT_LOOP <--> WORKFLOW
    AGENT_LOOP <--> MEMORY
    SERVER <--> AUTH
    WAY_CLI <--> MCP_SRV
    DEV_TOOL <--> SERVER
    
    subgraph EXTERNAL [External]
        AI[AI Providers]
        CODE_AGENTS[Claude Code / Cursor]
        WEB[Websites & APIs]
    end
    
    AUTH <--> AI
    MCP_SRV <--> CODE_AGENTS
    CORE <--> WEB
    
    style BROWSER fill:#4f46e5,color:#fff
    style AGENT fill:#6366F1,color:#fff
    style CLI fill:#818cf8,color:#fff
    style EXTERNAL fill:#1e1b4b,color:#fff
```

### Repository Structure

```
wayfinder/
├── packages/wayfinder/                 # Chromium fork + build system
│   ├── chromium_patches/               # Patches applied to Chromium source
│   ├── build/                          # Python build CLI
│   ├── build_go/                       # Go build CLI (production)
│   └── resources/                      # Icons, entitlements, signing configs
│
└── packages/wayfinder-agent/           # Agent platform (TypeScript / Go)
    ├── apps/
    │   ├── server/                     # Bun server - AI agent loop + MCP
    │   ├── agent/                      # WXT browser extension (React)
    │   ├── cli/                        # Go CLI tool
    │   └── eval/                       # Benchmark framework
    │
    └── packages/
        ├── agent-sdk/                  # npm: @wayfinder/agent-sdk
        ├── cdp-protocol/               # CDP type bindings
        └── shared/                     # Shared constants & types
```

| Component | Language | What it does |
|-----------|----------|-------------|
| `packages/wayfinder/` | C++, Python, Go | Chromium fork — the browser itself with patches, build system, and signing |
| `apps/server/` | TypeScript (Bun) | MCP server + AI agent loop — connects to the browser via CDP, runs the agent, exposes MCP tools |
| `apps/agent/` | TypeScript (React, WXT) | Browser extension — new tab page, side panel chat, onboarding, settings UI |
| `apps/cli/` | Go | CLI tool — control Wayfinder from terminal or AI coding agents |
| `packages/agent-sdk/` | TypeScript | Node.js SDK for browser automation with natural language |
| `packages/cdp-protocol/` | TypeScript | Type-safe Chrome DevTools Protocol bindings |
| `packages/shared/` | TypeScript | Shared constants, provider types, and common code |

---

## Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | 1.3.6+ | JavaScript runtime for the agent platform |
| [Go](https://go.dev) | 1.24+ | CLI tooling |
| [Python](https://python.org) | 3.12+ | Chromium build system |
| [Node.js](https://nodejs.org) | — | Used by Bun-compatible tooling |

### Agent Platform (TypeScript / Go)

```bash
# Clone the repo
git clone https://github.com/rahulcvwebsitehosting/wayfinder.git
cd wayfinder

# Navigate to the agent platform
cd packages/wayfinder-agent

# Install dependencies
bun install

# Set up environment
cp .env.example .env
# Edit .env with your settings

# Start the development server
bun run dev:watch
```

This starts the agent server, MCP server, and browser extension in watch mode.

### Browser Development (C++ / Chromium)

Building the browser from source requires the full Chromium toolchain (~100 GB disk, 3-5 hours):

```bash
# Install the build CLI
pip install -e packages/wayfinder/

# Provision Chromium source
python scripts/ci/setup_chromium.py \
  --chromium-root /path/to/chromium_root \
  --step checkout

python scripts/ci/setup_chromium.py \
  --chromium-root /path/to/chromium_root \
  --step sync

# Build
wayfinder build \
  --config build/config/release.windows.yaml \
  --chromium-src /path/to/chromium_root/src
```

> Most contributors focus on the agent platform (TypeScript/Go). Browser development is only needed for deep Chromium-level changes.

---

## Downloading Pre-built Releases

Pre-built installers will be published on the [Releases page](https://github.com/rahulcvwebsitehosting/wayfinder/releases) once available. Each installer will include:

- The full Wayfinder browser (Chromium 148)
- The built-in AI agent engine
- The MCP server
- uBlock Origin with MV2 support
- All pre-installed extensions

In the meantime, you can run the agent platform directly without building Chromium (see [Development](#development)).

---

## FAQ

**Do I need an API key?** Yes. Wayfinder does not include a built-in LLM. You bring your own API key from Anthropic, OpenAI, Google, or run local models with Ollama.

**Is my data sent to any server?** No. Your API keys and data stay on your machine. The only network requests are to the AI provider you explicitly configure and to the websites you visit.

**Can I use Chrome extensions?** Yes. Wayfinder is a Chromium fork and supports all Chrome extensions. uBlock Origin is pre-installed with Manifest V2 support.

**Does it work with Claude Code?** Yes. Wayfinder runs an MCP server that Claude Code, Gemini CLI, Cursor, and any MCP client can connect to.

**How is this different from the Chrome built-in AI?** Chrome's built-in AI is a small on-device language model. Wayfinder connects to full-power models (Claude, GPT-4o, Gemini) with complete browsing automation.

**Can I run it headlessly?** Yes. Wayfinder supports headless mode for automated workflows and CI pipelines. Use `wayfinder-cli` to launch in headless mode.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

- [Report a bug](https://github.com/rahulcvwebsitehosting/wayfinder/issues/new)
- [Request a feature](https://github.com/rahulcvwebsitehosting/wayfinder/issues/new)
- [Submit a pull request](https://github.com/rahulcvwebsitehosting/wayfinder/compare)

**Quick start for contributors:**
```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/wayfinder.git
cd wayfinder/packages/wayfinder-agent
bun install
bun run dev:watch
```

*Note: The issue tracker and releases are at [github.com/rahulcvwebsitehosting/wayfinder](https://github.com/rahulcvwebsitehosting/wayfinder).*

---

## License

**AGPL-3.0** — See [LICENSE](LICENSE) for details.

Wayfinder is built on [Chromium](https://www.chromium.org/) and incorporates patches from [ungoogled-chromium](https://github.com/ungoogled-software/ungoogled-chromium).

---

<div align="center">

Built with ❤️ by the Wayfinder community.

[Get Started](#quick-start) · [Download](#download) · [Contribute](#contributing) · [Report Issue](https://github.com/rahulcvwebsitehosting/wayfinder/issues)

</div>
