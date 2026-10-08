# Changelog

All notable changes will be documented in this file.

## 1.1.0 - 2026-10-08

- Added optional attached media to Rettiwt post details, replies, and search results, including photo, video, and GIF URLs and optional video thumbnails.
- Added media schema and type exports, plus mapper, provider, and MCP output test coverage.
- Verified two photo attachments through the live MCP server on a public X post.

## 1.0.3 - 2026-10-02

- Corrected the runtime documentation to distinguish verified Node 24 behavior from the published Node 22 engine requirement.
- Added a full Node 24 CI check and workflow policy validation, including release gating through reusable CI.
- Retained the declared Node 22 engine range and documented Node 24 installation warnings and failures under npm's `engine-strict` setting.

## 1.0.2 - 2026-10-02

- Updated Rettiwt to 7.1.4 and its transaction ID generator to 0.3.2 to restore public X requests after an upstream homepage change.
- Updated the transitive Axios dependency to 1.20.0 to resolve the high-severity production audit finding.
- Verified post lookup, replies, profile lookup, and search through the live MCP server.

## 1.0.1 - 2026-09-07

- Added guarded, tag-triggered publishing using OIDC for npm and the MCP Registry, followed by GitHub Releases.
- Added read-only release preflight, synchronized metadata checks, guarded npm and MCP Registry rerun verification, and tag-specific release notes.
- Expanded CI with macOS and Windows package installation checks plus production dependency auditing.
- Documented the stable v1 tool, input, output, and error contract.

## 1.0.0 - 2026-08-23

- Refactored the server around provider, domain, configuration, error, server, and CLI modules.
- Added authenticated Rettiwt as the default provider and retained the official X API as an optional mode.
- Added MCP v2 schemas, annotations, structured output, stable errors, deadlines, tests, packaging checks, and CI.
- Removed guest and username/password scraper modes.
