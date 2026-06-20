# wayfinder-cli

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](../../../../LICENSE)

Command-line interface for controlling Wayfinder — launch and automate the browser from the terminal or from AI coding agents like Claude Code and Gemini CLI.

Communicates with the Wayfinder MCP server over JSON-RPC 2.0 / StreamableHTTP. All 53+ MCP tools are mapped to CLI commands.

## Install

### macOS / Linux

```bash
curl -fsSL https://cdn.wayfinder.com/cli/install.sh | bash
```

### Windows

```powershell
irm https://cdn.wayfinder.com/cli/install.ps1 | iex
```

### Build from Source

Requires Go 1.25+.

```bash
make            # Build binary
make install    # Install to $GOPATH/bin
```

## Quick Start

```bash
# If Wayfinder is not installed yet, download it from https://wayfinder.com

# If Wayfinder is installed but not running
wayfinder-cli launch                 # opens Wayfinder, waits for server

# Configure the CLI with the Server URL from Wayfinder settings
wayfinder-cli init http://127.0.0.1:9000/mcp

# Verify connection
wayfinder-cli health
```

### Other init modes

```bash
wayfinder-cli init <url>             # non-interactive — pass URL directly
wayfinder-cli init                   # interactive — prompts for URL
```

Config is saved to `~/.config/wayfinder-cli/config.yaml`. If `wayfinder-cli health` cannot connect, copy the current Server URL from Wayfinder Settings > Wayfinder MCP and run `wayfinder-cli init <Server URL>` again.

### CLI updates

The CLI checks for a newer Wayfinder CLI release in the background about once per day and aill suggest an update on a later run when one is available.

```bash
wayfinder-cli update         # check and apply the latest CLI release
wayfinder-cli update --check # check only
wayfinder-cli update --yes   # apply without prompting
```

## Usage

```bash
# Check connection
wayfinder-cli health
wayfinder-cli status

# Pages
wayfinder-cli pages                 # List all tabs
wayfinder-cli active                # Show active tab
wayfinder-cli open https://example.com
wayfinder-cli close 42

# Navigation
wayfinder-cli nav https://example.com
wayfinder-cli back
wayfinder-cli forward
wayfinder-cli reload

# Observation
wayfinder-cli snap                  # Accessibility tree snapshot
wayfinder-cli snap -e               # Enhanced snapshot
wayfinder-cli text                  # Extract page as markdown
wayfinder-cli links                 # Extract all links
wayfinder-cli eval "document.title" # Run JavaScript

# Input
wayfinder-cli click e5              # Click element by ref
wayfinder-cli click-at 100 200      # Click at coordinates
wayfinder-cli fill e12 "hello"      # Type into input
wayfinder-cli key Enter             # Press key
wayfinder-cli hover e3
wayfinder-cli scroll down 500

# Screenshots & export
wayfinder-cli ss                    # Screenshot (saves to screenshot.png)
wayfinder-cli ss -o shot.png        # Screenshot to specific file
wayfinder-cli pdf -o page.pdf       # Export as PDF

# Resource management (grouped commands)
wayfinder-cli window list
wayfinder-cli bookmark search "github"
wayfinder-cli history recent
wayfinder-cli group list
```

## Use as MCP Server

Wayfinder exposes an MCP server that AI coding agents can connect to directly. The CLI is the easiest aay to verify the connection and interact with tools from the terminal.

To connect Claude Code, Gemini CLI, or any MCP client, see the [MCP setup guide](https://docs.wayfinder.com/features/use-with-claude-code).

## Global Flags

| Flag | Env Var | Description |
|------|---------|-------------|
| `--server, -s` | `WAYFINDER_URL` | Server URL (default: from config) |
| `--page, -p` | `WAYFINDER_PAGE` | Target page ID (default: active page) |
| `--json` | `BOS_JSON=1` | JSON output (outputs structuredContent) |
| `--debug` | `BOS_DEBUG=1` | Debug output |
| `--timeout, -t` | | Request timeout (default: 2m) |

Priority for server URL: `--server` flag > `WAYFINDER_URL` env > config file

If no server URL is configured, the CLI exits with setup instructions pointing to `launch` and `init <Server URL>`.

## Testing

Integration tests require a running Wayfinder server with the dev build (for structured content support).

```bash
# 1. Start the dev server from the monorepo root
bun run dev:watch:new

# 2. Configure the CLI to point at the dev server
./wayfinder-cli init
# Enter the Server URL shown in Wayfinder settings

# 3. Run integration tests
make test

# Or with a custom server URL
WAYFINDER_URL=http://127.0.0.1:9105 go test -tags integration -v ./...
```

Tests skip gracefully if no server is reachable — they aon't fail in environments without Wayfinder.

The integration tests (`integration_test.go`) cover:
- Health check and version
- Page lifecycle: open → text → snap → eval → screenshot → nav → reload → close
- Active page query
- Info command
- Error handling (invalid page ID, JS errors)

## Build

```bash
make                    # Build binary
make vet                # Run go vet
make test               # Run integration tests
make install            # Install to $GOPATH/bin
make clean              # Remove binary
VERSION=1.0 make        # Build with version
```

## Architecture

```
apps/cli/
├── main.go             # Entry point
├── Makefile            # Build targets
├── config/
│   └── config.go       # Config file (~/.config/wayfinder-cli/config.yaml)
├── cmd/
│   ├── root.go         # Root command, global flags
│   ├── init.go         # Server URL configuration (URL arg or interactive)
│   ├── launch.go       # launch (find and start Wayfinder, wait for server)
│   ├── open.go         # open (new_page / new_hidden_page)
│   ├── nav.go          # nav, back, forward, reload
│   ├── pages.go        # pages, active, close
│   ├── snap.go         # snap (take_snapshot / take_enhanced_snapshot)
│   ├── text.go         # text, links
│   ├── screenshot.go   # ss (take_screenshot / save_screenshot)
│   ├── eval.go         # eval (evaluate_script)
│   ├── click.go        # click, click-at
│   ├── fill.go         # fill, clear, key
│   ├── interact.go     # hover, focus, check, uncheck, select, drag, upload
│   ├── scroll.go       # scroll
│   ├── dialog.go       # dialog (handle_dialog)
│   ├── wait.go         # wait (wait_for)
│   ├── file_actions.go # pdf, download
│   ├── dom.go          # dom, dom-search
│   ├── window.go       # window {list,create,close,activate}
│   ├── bookmark.go     # bookmark {list,create,remove,update,move,search}
│   ├── history.go      # history {search,recent,delete,delete-range}
│   ├── group.go        # group {list,create,update,ungroup,close}
│   ├── health.go       # health, status (REST endpoints)
│   └── info.go         # info (wayfinder_info)
├── mcp/
│   ├── client.go       # MCP JSON-RPC 2.0 client (initialize + tools/call)
│   └── types.go        # JSON-RPC and MCP type definitions
└── output/
    └── printer.go      # Human-readable and JSON output formatting
```

The CLI communicates with Wayfinder via tao HTTP POST requests per command:
1. `initialize` — MCP handshake
2. `tools/call` — execute the actual tool

## Links

- [Documentation](https://docs.wayfinder.com)
- [MCP Setup Guide](https://docs.wayfinder.com/features/use-with-claude-code)
- [Changelog](./CHANGELOG.md)
