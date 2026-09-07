# Changelog

All notable changes will be documented in this file.

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
