> [!WARNING]
> **This repository is archived and no longer maintained.**
>
> NimbleTools has been superseded by the **NimbleBrain Platform**, which includes first-class remote MCP server support — no external bridge required.
>
> **👉 Active successor:** [NimbleBrain Platform](https://github.com/NimbleBrainInc/nimblebrain)
>
> Issues and pull requests are closed. Please open any new reports against the successor repository.
>
> *The `@nimbletools/mcp-http-bridge` npm package has been deprecated. Existing installations will continue to work but will not receive updates. Previous documentation preserved below for historical reference.*

---

# NimbleTools - MCP HTTP Bridge

Bridge the Model Context Protocol (MCP) stdio interface to HTTP-based MCP services. This allows MCP clients like Claude Code to seamlessly connect to remote MCP servers running over HTTP.

For more information about MCP and related tools, visit [www.nimbletools.ai](http://www.nimbletools.ai).

## Requirements

- Node.js 20.0.0 or higher
- npm 9.0.0 or higher

## Installation

```bash
npm install -g @nimbletools/mcp-http-bridge
```

Or use directly with npx:

```bash
npx @nimbletools/mcp-http-bridge --endpoint "https://..." --token "..."
```

### Updating

To update to the latest version:

```bash
npm install -g @nimbletools/mcp-http-bridge@latest
```

## Usage

### Command Line

```bash
mcp-http-bridge \
  --endpoint "https://api.example.com/mcp" \
  --token "your-bearer-token" \
  --timeout 15000 \
  --retries 2
```

### With Claude Code

Add to your Claude Code configuration:

```json
{
  "mcpServers": {
    "my-remote-server": {
      "command": "npx",
      "args": [
        "@nimbletools/mcp-http-bridge",
        "--endpoint",
        "https://api.example.com/mcp",
        "--token",
        "your-bearer-token"
      ]
    }
  }
}
```

### With Environment Variables

For better security, use environment variables:

```json
{
  "mcpServers": {
    "my-remote-server": {
      "command": "mcp-http-bridge",
      "args": ["--endpoint", "https://api.example.com/mcp"],
      "env": {
        "MCP_BEARER_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

## Options

| Option       | Alias | Default    | Description                       |
| ------------ | ----- | ---------- | --------------------------------- |
| `--endpoint` | `-e`  | _required_ | HTTP endpoint for the MCP service |
| `--token`    | `-t`  | _required_ | Bearer token for authentication   |
| `--timeout`  |       | `30000`    | Request timeout in milliseconds   |
| `--retries`  |       | `3`        | Number of retry attempts          |
| `--verbose`  | `-v`  | `false`    | Enable verbose logging            |

## How It Works

The bridge acts as a protocol translator:

1. **Input**: Accepts MCP JSON-RPC messages via stdin
2. **Translation**: Forwards them as HTTP POST requests to your endpoint
3. **Session Management**: Automatically captures and manages `mcp-session-id` headers
4. **Output**: Returns responses via stdout in MCP format

```
Claude Code ↔ stdio/JSON-RPC ↔ MCP HTTP Bridge ↔ HTTP/JSON ↔ Your MCP Service
```

### Features

- ✅ **Session ID Management**: Automatically captures and includes `mcp-session-id` headers
- ✅ **Server-Sent Events**: Supports both JSON and SSE response formats
- ✅ **Content Type Negotiation**: Accepts `application/json` and `text/event-stream`
- ✅ **Error Handling**: Robust retry logic with exponential backoff
- ✅ **Authentication**: Bearer token support

## Authentication

The bridge adds Bearer token authentication to all HTTP requests:

```http
POST /mcp HTTP/1.1
Authorization: Bearer your-token-here
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

## Error Handling

- **4xx Client Errors**: Returned immediately (no retries)
- **5xx Server Errors**: Retried with exponential backoff
- **Network Errors**: Retried with exponential backoff
- **Timeouts**: Configurable per request

## Examples

### Basic Usage

```bash
mcp-http-bridge \
  --endpoint "https://mcp.example.com/api" \
  --token "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### With Custom Timeout

```bash
mcp-http-bridge \
  --endpoint "https://slow-service.com/mcp" \
  --token "abc123" \
  --timeout 60000 \
  --retries 5
```

### Testing Connectivity

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | \
  mcp-http-bridge --endpoint "https://api.com/mcp" --token "token"
```

## Development

```bash
# Clone the repository
git clone https://github.com/nimbletools/mcp-http-bridge.git
cd mcp-http-bridge

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run locally
npm run dev -- --endpoint "https://..." --token "..."
```

### Local Development with Claude Code

For testing during development, you can configure Claude Code to use either your local build or the published package:

**Using local build:**

```json
{
  "mcpServers": {
    "national-parks": {
      "command": "node",
      "args": [
        "/path/to/your/mcp-http-bridge/dist/cli.js",
        "--endpoint",
        "https://mcp.nimbletools.dev/v1/workspaces/your-workspace-id/servers/nationalparks-mcp/mcp",
        "--token",
        "your-auth-token-here",
        "--insecure"
      ],
      "auth": null,
      "oauth": false
    }
  }
}
```

**Using published package with npx:**

```json
{
  "mcpServers": {
    "national-parks": {
      "command": "npx",
      "args": [
        "@nimbletools/mcp-http-bridge",
        "--endpoint",
        "https://mcp.nimbletools.dev/v1/workspaces/your-workspace-id/servers/nationalparks-mcp/mcp",
        "--token",
        "your-auth-token-here",
        "--insecure"
      ],
      "auth": null,
      "oauth": false
    }
  }
}
```

Replace the workspace ID and token with your actual credentials. The `--insecure` flag is useful for development against local or test endpoints.

## Contributing

We welcome contributions! If you're interested in contributing, please read our [Contributing Guide](CONTRIBUTING.md) for details on our development process, how to propose bugfixes and improvements, and how to build and test your changes.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 [Report Issues](https://github.com/nimbletools/mcp-http-bridge/issues)
- 📖 [Documentation](https://github.com/nimbletools/mcp-http-bridge)
- 💬 [Discussions](https://github.com/nimbletools/mcp-http-bridge/discussions)
- 💬 [Join our Slack Community](https://join.slack.com/t/nimblebrain-users/shared_invite/zt-2jpyzxgvl-7_kFJQHyJSmJzWXmYK8cMg)
