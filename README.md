# Twitter/X MCP

[![CI](https://github.com/granitebps/twitter-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/granitebps/twitter-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40granitebps%2Ftwitter-mcp.svg)](https://www.npmjs.com/package/@granitebps/twitter-mcp)
[![npm downloads](https://img.shields.io/npm/dm/%40granitebps%2Ftwitter-mcp.svg)](https://www.npmjs.com/package/@granitebps/twitter-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-5A67D8.svg)](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.granitebps%2Ftwitter-mcp)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)

Twitter/X MCP lets an MCP client read public X posts, replies, and profiles, or search X. It uses Rettiwt by default, so you do not need an X developer plan. You can switch to the official X API if you have access.

## Requirements

- Node.js 22.21.0 or newer within the Node 22 release line. The current Rettiwt release does not support Node 23 or later.
- A `RETTIWT_API_KEY`. Official X API credentials work when you select API mode.

## Quick start

Once the package is published, your MCP client can run it without a clone:

```bash
npx -y @granitebps/twitter-mcp
```

The server selects Rettiwt when you omit `TWITTER_MODE`. Pass `RETTIWT_API_KEY` in the client configuration.

The server uses stdio. Keep stdout reserved for MCP traffic.

## Run from a cloned repository

To develop the server or use a clone directly:

```bash
git clone https://github.com/granitebps/twitter-mcp.git
cd twitter-mcp
npm ci
npm run build
```

Point your MCP client at the compiled entry point:

```text
node /absolute/path/to/twitter-mcp/dist/cli.js
```

Run `npm run build` after each source change. Do not use `src` or `npm run dev` as the client's stdio command. Build logs on stdout can corrupt MCP messages.

## Client configuration

Each example starts with the npm package, followed by the local equivalent. Replace `/absolute/path/to/twitter-mcp` with your clone's path and `your_key_here` with your Rettiwt key. Do not commit a configuration file that contains the key.

### Claude

Add the npm package to Claude Code:

```bash
claude mcp add twitter --env RETTIWT_API_KEY=your_key_here -- npx -y @granitebps/twitter-mcp
```

For a local build:

```bash
claude mcp add twitter --env RETTIWT_API_KEY=your_key_here -- node /absolute/path/to/twitter-mcp/dist/cli.js
```

Claude Code uses local scope by default. Add `--scope user` before `twitter` to make the server available across projects.

Claude Desktop reads the same server from `claude_desktop_config.json`. Restart the app after editing the file.

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

For a local build, replace `command` and `args` with:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

### Codex

Add the npm package to `~/.codex/config.toml`, or to `.codex/config.toml` in a trusted project:

```toml
[mcp_servers.twitter]
command = "npx"
args = ["-y", "@granitebps/twitter-mcp"]

[mcp_servers.twitter.env]
RETTIWT_API_KEY = "your_key_here"
```

For a local build:

```toml
[mcp_servers.twitter]
command = "node"
args = ["/absolute/path/to/twitter-mcp/dist/cli.js"]

[mcp_servers.twitter.env]
RETTIWT_API_KEY = "your_key_here"
```

Restart Codex after editing the file. The CLI, IDE extension, and desktop app share this configuration on the same computer.

### OpenCode

Add the npm package to `opencode.json` or `opencode.jsonc`:

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

For a local build, replace the `command` array with:

```json
{
  "command": ["node", "/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

### Cursor

Add the npm package to `.cursor/mcp.json` in a project, or to `~/.cursor/mcp.json` for global use:

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

For a local build, replace `command` and `args` with:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/twitter-mcp/dist/cli.js"]
}
```

## Providers

| Mode         | Selection                          | Credentials                                | Notes                                                                                               |
| ------------ | ---------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Rettiwt      | Default, or `TWITTER_MODE=rettiwt` | `RETTIWT_API_KEY`                          | Free of X API charges. Uses unofficial internal endpoints and may break or put the account at risk. |
| Official API | `TWITTER_MODE=api`                 | Bearer token or complete OAuth credentials | Uses the supported X API. X controls access tiers and pricing.                                      |

### Rettiwt setup

Rettiwt requires authenticated user mode in this server. Guest mode is not supported.

1. Generate an API key using the [Rettiwt authentication instructions](https://github.com/Rishikant181/Rettiwt-API#authentication).
2. Store it as `RETTIWT_API_KEY` in the MCP client's environment.
3. Start the server without `TWITTER_MODE`, or set `TWITTER_MODE=rettiwt` explicitly.

A Rettiwt key contains X session cookies and has the same access as the account. Treat it like a password. Do not commit it, paste it into an issue, log it, or pass it as a command-line argument. Use a key only for an account you own or have permission to access.

Rettiwt is unofficial. X's [automation rules](https://help.x.com/en/rules-and-policies/x-automation) prohibit non-API website automation and warn that violations may lead to account suspension. Read the [X Rules](https://help.x.com/en/rules-and-policies/x-rules) before using this mode. You accept the compliance and account risk.

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

Create credentials in the [X Developer Portal](https://developer.x.com/en/portal/dashboard). X controls API access and pricing, so check the current terms before choosing this mode.

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

The server rejects an incomplete OAuth configuration at startup. It reads credentials from the process environment and never returns them through `get_server_info`.

## Tools

| Tool                | Input                              | Result                                                                               |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| `get_tweet`         | `tweet_id`                         | One post. Accepts a numeric ID or an `x.com` or `twitter.com` status URL.            |
| `get_tweet_replies` | `tweet_id`, optional `max_results` | Replies and available page metadata.                                                 |
| `get_user_profile`  | `username`                         | One public profile. A leading `@` is accepted.                                       |
| `search_tweets`     | `query`, optional `max_results`    | Matching posts and available page metadata. Search operators depend on the provider. |
| `get_server_info`   | None                               | Version, active provider, tools, limits, and capabilities.                           |

`max_results` defaults to 10 and accepts 1 through 100. Successful calls return structured MCP content plus JSON text for older clients. Collection tools return the items as JSON text and put cursors and warnings in structured content.

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

Errors name the provider and tell the client whether a retry may work. They do not include credentials or raw upstream response bodies.

## Architecture

```text
stdio CLI
  -> validated environment configuration
  -> MCP server and tool handlers
  -> TwitterProvider contract
       -> Rettiwt adapter
       -> official X API adapter
```

The domain schemas do not depend on either provider. Each provider adapter maps upstream data, enforces limits and deadlines, and translates errors. Importing `src/index.ts` does not start the server.

## Development

```bash
npm ci
npm run check
```

`npm run check` checks formatting, lint, types, coverage, the production build, npm package contents, and a clean tarball installation. The default test suite uses fakes and does not need X credentials.

Useful focused commands:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run check:package
npm run check:install
npx @modelcontextprotocol/inspector node dist/cli.js
```

### Live Rettiwt smoke test

The live smoke test starts the compiled stdio server and calls `get_tweet`, `get_tweet_replies`, `get_user_profile`, and `search_tweets`. It derives the username and search query from the selected post.

```bash
RETTIWT_API_KEY=your_key_here \
TWITTER_LIVE_TWEET_ID=1234567890123456789 \
npm run test:live
```

Choose a public post whose author profile is still available. If either variable is missing, the command stops before starting the live server or making a network request. It does not run as part of `npm run check` or normal CI.

## Release verification

The automated suite covers configuration, provider adapters, MCP calls, the compiled stdio entry point, and installation from an npm tarball. The live Rettiwt smoke test is optional and does not run in normal CI. Version 1.0.0 was prepared without live upstream verification.

Maintainers can follow the [release guide](https://github.com/granitebps/twitter-mcp/blob/main/RELEASE.md) for the manual npm, MCP Registry, and GitHub release process. Live tests must read credentials from repository secrets and must not run for untrusted pull requests.

## Troubleshooting

### Missing Rettiwt key

If startup reports `RETTIWT_API_KEY is required in rettiwt mode`, set the key in the MCP client configuration. Desktop clients do not automatically inherit a shell's `.env` file.

### Invalid Rettiwt authentication

If you see `Invalid authentication data` or `AUTH_FAILED`, generate a new Rettiwt key and check that the X session still works. Never post the failing key in an issue.

### Rate limit

For `RATE_LIMITED`, wait before retrying and reduce the request rate. Check `retryAfterSeconds` when the provider supplies it.

### Official API 401 or 403

Confirm the credential set, app permissions, endpoint access, and current X API plan.

### Node engine warning

Run Node.js 22.21.0 or a newer Node 22 release. Do not use Node 23 or later with the current Rettiwt dependency.

## License

[ISC](LICENSE)
