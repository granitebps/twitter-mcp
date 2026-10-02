# Twitter/X MCP v1.0.2

Version 1.0.2 restores Rettiwt requests after a change to the X homepage broke
transaction ID generation. The server could connect to MCP clients, but X tools
returned `INTERNAL_ERROR`.

## Changes

- Updated `rettiwt-api` from 7.1.3 to 7.1.4 and
  `x-client-transaction-id` from 0.3.1 to 0.3.2.
- Verified post lookup, replies, profile lookup, and search through the live MCP
  server using existing credentials.

## Install

Run the exact version with Node.js 22.21.0 or a newer Node 22 release:

```bash
npx -y @granitebps/twitter-mcp@1.0.2
```

The default Rettiwt provider requires `RETTIWT_API_KEY`. Official API mode
requires `TWITTER_MODE=api` and either `TWITTER_BEARER_TOKEN` or a complete
OAuth credential set. See the
[client configuration guide](https://github.com/granitebps/twitter-mcp/blob/v1.0.2/README.md#client-configuration)
for setup examples. Restart the MCP client after updating.

## Compatibility

There are no changes to MCP tool names, inputs, outputs, or error codes. The
[v1 compatibility contract](https://github.com/granitebps/twitter-mcp/blob/v1.0.2/docs/v1-compatibility.md)
continues to apply. This patch does not update the unrelated dependencies in the
open Dependabot pull requests.

## Known limitations

- Rettiwt uses unofficial X endpoints and may break again when X changes them.
- Node.js 23 and later are outside the supported runtime range.
- Rettiwt keys contain authenticated X session cookies and must remain secret.
- The official API provider depends on the configured X API access level.
- Upstream rate limits and availability still apply. Credentialed live checks
  remain separate from deterministic CI and automated release checks.
