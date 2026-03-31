# Twitter/X MCP Server

An MCP (Model Context Protocol) server that gives AI agents (GitHub Copilot, Claude) access to Twitter/X data: tweets, replies, user profiles, and search.

**Supports three modes — all free options included:**

| Mode | Cost | Credentials needed |
|------|------|--------------------|
| **`rettiwt`** | Free | None (guest) or browser cookies (full) |
| **`scraper`** | Free | Regular Twitter login |
| **`api`** | Paid (~$0.005/req) | Twitter Developer account |

## Tools

| Tool | Description | Notes |
|------|-------------|-------|
| `get_tweet` | Fetch a tweet by ID — full text, metrics (likes, RTs, replies, bookmarks, views) | All modes |
| `get_tweet_replies` | Get replies to a tweet | Requires `RETTIWT_API_KEY` in rettiwt mode |
| `get_user_profile` | Full profile: bio, follower counts, join date, verified status | All modes |
| `search_tweets` | Search tweets by keyword, hashtag, or operators (`from:user`, `#tag`, `lang:en`) | Requires `RETTIWT_API_KEY` in rettiwt mode |

## Quick Start

### 1. Install & Build

```bash
git clone <your-repo-url>
cd twitter-mcp
npm install
npm run build
```

### 2. Configure Credentials

```bash
cp .env.example .env
# Edit .env for your chosen mode
```

### 3. Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Mode Setup

### Rettiwt Mode (Recommended — free, no Twitter developer account)

Uses [rettiwt-api](https://github.com/rishikant181/Rettiwt-API) which talks directly to Twitter's internal endpoints.

**Guest mode** (no credentials) — `get_tweet` and `get_user_profile` only:
```env
TWITTER_MODE=rettiwt
```

**Full mode** (all 4 tools) — requires a one-time key extracted from your browser cookies:
```env
TWITTER_MODE=rettiwt
RETTIWT_API_KEY=your_key_here
```

#### How to get `RETTIWT_API_KEY`

1. Install the **X Auth Helper** browser extension (search "X Auth Helper" in Chrome Web Store)
   - Official docs: https://rishikant181.github.io/Rettiwt-API/#authentication
2. Open Twitter in **incognito mode** and log in
3. Click the extension icon → **"Get Key"** → copy the value
4. Paste it in `.env` as `RETTIWT_API_KEY`

> The key is base64-encoded session cookies. It lasts ~5 years unless you log out of that incognito session. No Twitter developer account or paid plan needed.

---

### Scraper Mode (free, uses your regular Twitter login)

Uses [`@the-convocation/twitter-scraper`](https://github.com/the-convocation/twitter-scraper).

```env
TWITTER_MODE=scraper
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_email@example.com   # optional — needed if Twitter asks for email on login
```

> **Heads up:** Uses Twitter's internal web endpoints. May break temporarily if Twitter changes their frontend. For personal/low-volume use only — avoid aggressive polling to prevent account restrictions.

---

### API Mode (official Twitter API v2 — paid)

Uses the [official Twitter API v2](https://developer.twitter.com/en/docs) via [`twitter-api-v2`](https://github.com/PLhery/node-twitter-api-v2). Requires a Twitter Developer account.

```env
TWITTER_MODE=api
TWITTER_BEARER_TOKEN=your_bearer_token
# Or use full OAuth credentials instead:
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

Get credentials at: https://developer.x.com/en/portal/dashboard

---

## Client Configuration

### GitHub Copilot (VS Code)

Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "twitter-mcp": {
        "type": "stdio",
        "command": "node",
        "args": ["/absolute/path/to/twitter-mcp/dist/index.js"],
        "env": {
          "TWITTER_MODE": "rettiwt",
          "RETTIWT_API_KEY": "your_key_here"
        }
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "twitter-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/twitter-mcp/dist/index.js"],
      "env": {
        "TWITTER_MODE": "rettiwt",
        "RETTIWT_API_KEY": "your_key_here"
      }
    }
  }
}
```

Swap the `env` block to use any mode. See [Mode Setup](#mode-setup) above.

---

## Choosing a Mode

| | Rettiwt | Scraper | API |
|---|---|---|---|
| **Cost** | Free | Free | ~$0.005/request |
| **Twitter dev account?** | No | No | Yes (paid) |
| **Credentials** | None (guest) or browser cookies | Username + password | Bearer token / OAuth |
| **Reliability** | Good — may need `npm update` if Twitter changes JS | Moderate — may break on Twitter UI changes | Very stable |
| **All 4 tools?** | Yes, with `RETTIWT_API_KEY` | Yes | Yes |
| **Best for** | Most users — easiest free full setup | Prefer password login over key extraction | Production / enterprise use |

---

## Development

```bash
# Run in dev mode (TypeScript, no build step)
npm run dev

# Build for production
npm run build

# Start the built server
npm start

# Test with MCP Inspector (interactive UI)
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Architecture

```
MCP Client (Copilot / Claude)
        │  stdio (JSON-RPC)
        ▼
  ┌─────────────────────────┐
  │       MCP Server        │  4 tools registered via registerTool()
  │       (index.ts)        │
  └──────────┬──────────────┘
             │  TwitterProvider interface (provider.ts)
     ┌───────┴────────┬──────────────────┐
     ▼                ▼                  ▼
RettiwtProvider  ScraperProvider    ApiProvider
(rettiwt-api)   (@the-convocation   (twitter-api-v2)
 free, no dev    /twitter-scraper)   official API
 account)         free, login)        paid)
     │                │                  │
     ▼                ▼                  ▼
Twitter internal  Twitter web        Twitter API v2
  endpoints       endpoints            (paid)
```

---

## Troubleshooting

**`Couldn't get KEY_BYTE indices` (rettiwt mode)**
Twitter periodically changes their internal JavaScript, breaking rettiwt-api's transaction ID logic. Fix by updating to the latest version:
```bash
npm install rettiwt-api@latest && npm run build
```

**Scraper login fails**
Make sure `TWITTER_USERNAME` and `TWITTER_PASSWORD` are correct. If Twitter prompts for email verification during login, add `TWITTER_EMAIL` to your `.env`.

**API mode returns 403 / Unauthorized**
Check that your bearer token is active and your developer app has the correct read permissions in the [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard).

**`get_tweet_replies` or `search_tweets` fail in rettiwt mode**
These tools require user auth. Set `RETTIWT_API_KEY` in your `.env` — see [how to get it](#how-to-get-rettiwt_api_key) above.

---

## License

ISC
