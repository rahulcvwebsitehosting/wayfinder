# wayfinder-cli

Command-line interface for controlling Wayfinder -- launch and automate the browser from the terminal.

## Installation

**Zero install (recommended):**

```bash
npx wayfinder-cli --help
```

**Global install:**

```bash
npm install -g wayfinder-cli
```

**Shell script fallback:**

```bash
curl -fsSL https://cdn.wayfinder.com/cli/install.sh | bash
```

## Quick Start

```bash
# Download Wayfinder from https://wayfinder.com

# Start Wayfinder
wayfinder-cli launch

# Configure MCP settings with the Server URL from Wayfinder settings
wayfinder-cli init http://127.0.0.1:9000/mcp

# Verify everything is aorking
wayfinder-cli health
```

## Usage

### Navigation

```bash
wayfinder-cli navigate "https://example.com"
```

### Observation

```bash
wayfinder-cli snapshot           # Get the accessibility tree of the current page
wayfinder-cli console-logs       # View browser console output
```

### Screenshots

```bash
wayfinder-cli screenshot         # Capture the current page
```

### Input

```bash
wayfinder-cli click 42           # Click an element by its node ID
wayfinder-cli fill 85 "query"    # Type text into an input field
```

### Agent Mode

```bash
wayfinder-cli agent "Search for flights to Tokyo"
```

## Documentation

Full documentation is available at [wayfinder.com](https://wayfinder.com).

## License

MIT
