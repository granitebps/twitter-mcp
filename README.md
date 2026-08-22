# Twitter/X MCP

A read-only Model Context Protocol server for public X posts, replies, profiles, and search. Rettiwt is the default provider and does not require an official X developer plan. The official X API remains available as an optional mode.

## Requirements

- Node.js 22.21.0 or a newer Node 22 release. Node 23 and later are not supported by the current Rettiwt release.
- A `RETTIWT_API_KEY` for the default provider, or official X API credentials for API mode.

## Quick start

You do not need to clone this repository after the package is published. Configure your MCP client to run:

```bash
npx -y @granitebps/twitter-mcp
```

Rettiwt is selected when `TWITTER_MODE` is omitted. Every client configuration must provide a `RETTIWT_API_KEY` to the server process.

The server uses stdio. Keep stdout reserved for MCP traffic.

## Run from a cloned repository

You can build and run the same stdio server directly from a local checkout:

```bash
git clone https://github.com/granitebps/twitter-mcp.git
cd twitter-mcp
npm ci
npm run build
```

Use `node` as the client command and the absolute path to `dist/cli.js` as its argument:

```text
node /absolute/path/to/twitter-mcp/dist/cli.js
```

Run `npm run build` again after changing the source. Do not point an MCP client at `src` or use `npm run dev` as its stdio command because build output can interfere with MCP traffic.

## Client configuration

The examples below use the published package first and show the local checkout alternative immediately after it. Replace `/absolute/path/to/twitter-mcp` with the actual cloned repository path. Replace `your_key_here` with your Rettiwt key and keep that configuration out of version control.

### Claude

For Claude Code, add the published package with:

```bash
claude mcp add twitter --env RETTIWT_API_KEY=your_key_here -- npx -y @granitebps/twitter-mcp
```

To use a local checkout instead:

```bash
claude mcp add twitter --env RETTIWT_API_KEY=your_key_here -- node /absolute/path/to/twitter-mcp/dist/cli.js
```

Claude Code stores these commands in its local scope by default. Add `--scope user` before `twitter` if you want the server available across projects.

For Claude Desktop, add the equivalent entry to `claude_desktop_config.json`, then restart the app:

```json
{
  "mcpServers": {
    "twitter": {
      "command": "npx",
      "args": ["-y", "@granitebps/twitter-mcp"],
      "env": {
        "RETTIWT_API_KEY": "your_key_here"
      }
    }
  }
}
```

For a local checkout, change only the launch fields:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

### Codex

Add the published package to `~/.codex/config.toml`, or to `.codex/config.toml` in a trusted project:

```toml
[mcp_servers.twitter]
command = "npx"
args = ["-y", "@granitebps/twitter-mcp"]

[mcp_servers.twitter.env]
RETTIWT_API_KEY = "your_key_here"
```

For a local checkout, use:

```toml
[mcp_servers.twitter]
command = "node"
args = ["/absolute/path/to/twitter-mcp/dist/cli.js"]

[mcp_servers.twitter.env]
RETTIWT_API_KEY = "your_key_here"
```

Restart Codex after changing its configuration. The Codex CLI, IDE extension, and desktop app share this configuration on the same host.

### OpenCode

Add the published package to `opencode.json` or `opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "twitter": {
      "type": "local",
      "command": ["npx", "-y", "@granitebps/twitter-mcp"],
      "enabled": true,
      "environment": {
        "RETTIWT_API_KEY": "your_key_here"
      }
    }
  }
}
```

For a local checkout, change only the command array:

```json
{
  "command": ["node", "/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

### Cursor

Add the published package to `.cursor/mcp.json` in a project, or to `~/.cursor/mcp.json` for global use:

```json
{
  "mcpServers": {
    "twitter": {
      "command": "npx",
      "args": ["-y", "@granitebps/twitter-mcp"],
      "env": {
        "RETTIWT_API_KEY": "your_key_here"
      }
    }
  }
}
```

For a local checkout, change only the launch fields:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

## Providers

| Mode         | Selection                          | Credentials                                | Cost and tradeoff                                                                                          |
| ------------ | ---------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Rettiwt      | Default, or `TWITTER_MODE=rettiwt` | `RETTIWT_API_KEY`                          | No official X developer plan. Uses unofficial internal endpoints and may break or put the account at risk. |
| Official API | `TWITTER_MODE=api`                 | Bearer token or complete OAuth credentials | Uses the supported X API. X controls access tiers and pricing.                                             |

### Rettiwt setup

Rettiwt requires authenticated user mode in this server. Guest mode is not supported.

1. Generate an API key using the [Rettiwt authentication instructions](https://github.com/Rishikant181/Rettiwt-API#authentication).
2. Store it as `RETTIWT_API_KEY` in the MCP client's environment.
3. Start the server without `TWITTER_MODE`, or set `TWITTER_MODE=rettiwt` explicitly.

A Rettiwt key is a base64 encoding of X session cookies and has the authority of that account. Treat it like a password. Do not commit it, paste it into issues, include it in logs, or pass it as a command-line argument. Use only a key for an account you own or are authorized to access.

Rettiwt is unofficial. X's current [automation rules](https://help.x.com/en/rules-and-policies/x-automation) prohibit non-API website automation and warn that violations may lead to account suspension. Review the [X Rules](https://help.x.com/en/rules-and-policies/x-rules) before use. You are responsible for compliance and account risk.

### Official X API setup

Use a bearer token:

```env
TWITTER_MODE=api
TWITTER_BEARER_TOKEN=your_bearer_token
```

Or provide the complete OAuth set:

```env
TWITTER_MODE=api
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

Create credentials in the [X Developer Portal](https://developer.x.com/en/portal/dashboard). X sets API access and pricing. Check its current terms before choosing this mode.

## Configuration

| Variable                     | Required        | Meaning                                                     |
| ---------------------------- | --------------- | ----------------------------------------------------------- |
| `TWITTER_MODE`               | No              | `rettiwt` by default, or `api`. Other values fail startup.  |
| `RETTIWT_API_KEY`            | Rettiwt mode    | Authenticated Rettiwt session key.                          |
| `TWITTER_BEARER_TOKEN`       | API mode option | Official API bearer token.                                  |
| `TWITTER_API_KEY`            | OAuth option    | OAuth application key.                                      |
| `TWITTER_API_SECRET`         | OAuth option    | OAuth application secret.                                   |
| `TWITTER_ACCESS_TOKEN`       | OAuth option    | OAuth access token.                                         |
| `TWITTER_ACCESS_SECRET`      | OAuth option    | OAuth access secret.                                        |
| `TWITTER_REQUEST_TIMEOUT_MS` | No              | Request deadline from 1,000 to 120,000 ms. Default: 30,000. |

Partial OAuth configuration fails startup. Credentials are read from the process environment and are never returned by `get_server_info`.

## Tools

| Tool                | Input                              | Result                                                                               |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `get_tweet`         | `tweet_id`                         | One post. Accepts a numeric ID or an `x.com` or `twitter.com` status URL.            |
| `get_tweet_replies` | `tweet_id`, optional `max_results` | Replies and available page metadata.                                                 |
| `get_user_profile`  | `username`                         | One public profile. A leading `@` is accepted.                                       |
| `search_tweets`     | `query`, optional `max_results`    | Matching posts and available page metadata. Search operators depend on the provider. |
| `get_server_info`   | None                               | Version, active provider, tools, limits, and capabilities.                           |

`max_results` defaults to 10 and accepts 1 through 100. Each successful call returns structured MCP content and JSON text for older clients. The collection tools keep the Phase 1 JSON text shape as an array while exposing cursors and warnings in structured content.

## Errors

Tool failures use stable codes:

- `INVALID_INPUT`
- `AUTH_REQUIRED`
- `AUTH_FAILED`
- `NOT_FOUND`
- `RATE_LIMITED`
- `UPSTREAM_UNAVAILABLE`
- `TIMEOUT`
- `UNSUPPORTED_OPERATION`
- `INTERNAL_ERROR`

Errors include the provider and whether retrying is useful. Raw upstream response bodies and credentials are excluded from tool-safe messages.

## Architecture

```text
stdio CLI
  -> validated environment configuration
  -> MCP server and tool handlers
  -> TwitterProvider contract
       -> Rettiwt adapter
       -> official X API adapter
```

Canonical domain schemas do not depend on either provider. Provider adapters own upstream mapping, limits, deadlines, and error translation. `src/index.ts` contains programmatic exports and has no startup side effects.

## Development

```bash
npm ci
npm run check
```

`npm run check` runs formatting validation, linting, type checking, coverage, a production build, and package-content validation. Tests use fakes and do not need live X credentials.

Useful focused commands:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run check:package
npx @modelcontextprotocol/inspector node dist/cli.js
```

## Planned quality and Phase 2 work

Phase 2 will review each tool's semantics, ordering, completeness, pagination, provider consistency, field availability, search translation, and thread behavior. The current request objects, page envelopes, capabilities, schemas, and provider mappers are intended to support those changes without another startup or architecture rewrite.

Optional live provider smoke tests, automated release publishing, and broader compatibility checks remain future work. Live tests must use repository secrets and must not run for untrusted pull requests.

## Troubleshooting

`RETTIWT_API_KEY is required in rettiwt mode`

Set the key in the MCP client configuration. A shell `.env` file is not automatically shared with a desktop MCP client unless that client starts the process in the same configured environment.

`Invalid authentication data` or `AUTH_FAILED`

Generate a new Rettiwt key and confirm that the underlying X session is still valid. Do not post the failing key in an issue.

`RATE_LIMITED`

Wait before retrying. Lower request frequency and inspect `retryAfterSeconds` when the provider supplies it.

Official API `401` or `403`

Confirm the credential set, app permissions, endpoint access, and current X API plan.

Node engine warning

Run Node.js 22.21.0 or a newer Node 22 release. Do not use Node 23 or later with the current Rettiwt dependency.

## License

[ISC](LICENSE)
