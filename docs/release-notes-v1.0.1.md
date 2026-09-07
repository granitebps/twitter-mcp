# Twitter/X MCP v1.0.1

Version 1.0.1 adds a guarded release process and broader package checks. There
are no MCP tool, input, output, provider, or error-contract changes from 1.0.0.

## Changes

- Releases now start only from an approved version tag and publish through npm
  trusted publishing, MCP Registry GitHub OIDC, and GitHub Releases.
- Pushes to `main` and pull requests run a read-only release preflight. Version
  metadata, npm package installation, Registry metadata, and workflow policy
  are checked without publishing.
- Package installation now runs on macOS and Windows in addition to the full
  Ubuntu suite. CI also audits production dependencies.
- Partial release reruns verify the npm commit and the complete commit-bound MCP
  Registry document before accepting an existing immutable version.
- The v1 compatibility document records the stable tool, input, output, and
  structured error behavior for the 1.x line.

## Install

Run the exact version with Node.js 22.21.0 or a newer Node 22 release:

```bash
npx -y @granitebps/twitter-mcp@1.0.1
```

The default Rettiwt provider requires `RETTIWT_API_KEY`. Official API mode
requires `TWITTER_MODE=api` and either `TWITTER_BEARER_TOKEN` or a complete
OAuth credential set. See the
[client configuration guide](https://github.com/granitebps/twitter-mcp/blob/v1.0.1/README.md#client-configuration)
for Claude, Codex, OpenCode, and Cursor examples.

## Compatibility

The
[v1 compatibility contract](https://github.com/granitebps/twitter-mcp/blob/v1.0.1/docs/v1-compatibility.md)
covers the five tool names, accepted inputs, result envelopes, field types, and
structured error meanings throughout 1.x.

## Known limitations

- Node.js 23 and later are outside the current Rettiwt dependency's supported
  range.
- Rettiwt credentials contain an authenticated X browser session. Use a
  disposable account and store the key only in the MCP client's environment.
- The official X API provider depends on the endpoints and access level in the
  configured X developer plan.
- Both providers read public X data and may be affected by upstream rate limits,
  availability, or behavior changes.
- Credentialed live X requests remain separate from deterministic CI and the
  automated release workflow.

This project is unofficial and is not affiliated with X Corp. Report suspected
vulnerabilities through the
[private security route](https://github.com/granitebps/twitter-mcp/security/advisories/new),
not a public issue.
