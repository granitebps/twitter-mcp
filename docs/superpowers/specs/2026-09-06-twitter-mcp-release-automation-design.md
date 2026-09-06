# Twitter MCP release automation design

Date: 2026-09-06

## Purpose

Replace the proven but manual Twitter MCP release procedure with a guarded,
tag-triggered workflow. Reuse the release policy established by threads-mcp
while keeping npm and MCP Registry packaging native to this project.

This design does not authorize a version bump, tag, publication, commit, push,
or repository-setting change.

## Constraints

- Preserve Node.js `^22.21.0`, stdio transport, the npm package name, and the
  existing MCP Registry name.
- Preserve the published v1 tool names, inputs, outputs, and error meanings.
- Keep deterministic CI free of X credentials and live network calls.
- Publish only from an approved `v*` tag whose version matches every release
  metadata file.
- Use npm trusted publishing with GitHub OIDC. Do not add an npm token.
- Publish the MCP Registry entry only after npm serves the matching package.
- Keep ordinary push and pull-request release checks read-only.
- Make partial-release reruns safe by accepting an existing npm or MCP Registry
  version only when it matches the triggering commit and local metadata.

## Release flow

Normal pushes and pull requests run CI plus a release preflight. The preflight
checks version consistency, builds and installs the packed npm artifact, and
validates `server.json` with a checksum-pinned MCP Publisher binary. It has only
read access to repository contents.

An approved tag push runs CI and the same preflight against `github.sha`. The
publishing job starts only when both succeed. It then:

1. Confirms that the tag is exactly `v` plus the package version.
2. Publishes the npm package through its configured trusted publisher, or
   verifies an already-published version has the same `gitHead`.
3. Verifies the public npm package before continuing.
4. Publishes `server.json` through MCP Registry GitHub OIDC, or verifies an
   existing immutable Registry entry matches the local file.
5. Creates the GitHub release from a version-specific release-notes file, or
   verifies the release already exists for the tag.

The order accepts that npm and MCP Registry versions are immutable. A failure
after npm publication is recovered by rerunning the exact tag workflow, not by
moving the tag or reusing the version for different code.

## CI and security

The main deterministic check remains on Ubuntu and retains formatting, lint,
type checking, coverage, package-content validation, and installed-package MCP
handshake checks. Focused package installation and stdio checks also run on
macOS and Windows. A separate audit job checks production dependencies.

GitHub Actions use verified full commit SHAs. Workflow permissions default to
`contents: read`. Only the publishing job receives `contents: write` and
`id-token: write`.

After the workflows land and pass on GitHub, repository settings can require
the successful jobs, strict up-to-date checks, linear history, conversation
resolution, and protection against force-pushes or branch deletion. Repository
settings are not changed by this implementation.

## Compatibility documentation

A durable v1 compatibility document records the contract already published in
version 1.0.0. It documents behavior rather than changing it. In particular,
collection text content remains the JSON item array while structured content
contains page metadata, and Twitter-specific authentication and provider error
codes remain distinct from threads-mcp.

## Live testing

Credentialed Rettiwt testing remains separate from pull-request CI and release
automation. Adding a scheduled or manual GitHub workflow requires a dedicated X
account, repository secrets, and a separate operational decision because the
Rettiwt key carries account authority.

## Acceptance criteria

- CI can be called by the release workflow and checks Ubuntu, macOS, and Windows
  at the agreed depth.
- Normal changes exercise the complete release toolchain without publishing.
- A tag cannot publish unless its version and release notes match the package.
- npm publication uses OIDC and produces provenance without a long-lived token.
- npm, MCP Registry, and GitHub release steps are ordered and safe to rerun for
  the same tag and commit.
- Workflow policy and version consistency have automated regression tests.
- The release guide describes preparation, approval, publication, recovery, and
  post-publication verification accurately.
