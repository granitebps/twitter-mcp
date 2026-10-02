# Twitter/X MCP v1.0.3

Version 1.0.3 corrects the Node 24 compatibility documentation and adds Node 24
CI coverage. The package's declared supported runtime remains Node.js 22.21.0
or a newer Node 22 release.

## Changes

- Replaced the claim that Node 24 cannot run the server with the verified
  result: the full project check and all five live MCP tool calls passed on
  Node 24.19.0.
- Added a separate Node 24 CI job that runs the full project check, including
  package installation verification. The release workflow reuses this CI,
  so Node 24 checks also gate publication.
- Documented the difference between tested runtime behavior and the published
  engine declarations in the README, contributor guide, and compatibility
  contract.

## Install

Run the exact version with Node.js 22.21.0 or a newer Node 22 release:

```bash
npx -y @granitebps/twitter-mcp@1.0.3
```

The default Rettiwt provider requires `RETTIWT_API_KEY`. Official API mode
requires `TWITTER_MODE=api` and either `TWITTER_BEARER_TOKEN` or a complete
OAuth credential set. See the
[client configuration guide](https://github.com/granitebps/twitter-mcp/blob/v1.0.3/README.md#client-configuration)
for setup examples. Restart the MCP client after updating.

## Compatibility

There are no changes to MCP tool names, inputs, outputs, or error codes.
Dependencies and the package's `engines.node` range are unchanged. The
[v1 compatibility contract](https://github.com/granitebps/twitter-mcp/blob/v1.0.3/docs/v1-compatibility.md)
continues to apply.

## Known limitations

- This package and Rettiwt 7.1.4 still declare `engines.node: "^22.21.0"`.
  Node 24 installations can produce `EBADENGINE` warnings and fail when npm's
  `engine-strict` setting is enabled. Official Node 24 support remains pending
  updated engine declarations in both packages.
- Rettiwt uses unofficial X endpoints and may break when X changes them.
- Rettiwt keys contain authenticated X session cookies and must remain secret.
- The official API provider depends on the configured X API access level.
- Upstream rate limits and availability still apply. Credentialed live checks
  remain separate from deterministic CI and automated release checks.
