# Release guide

Releases are prepared in the repository and published by
`.github/workflows/release.yml` from an explicitly approved `v*` tag. The
workflow publishes in this order: npm, MCP Registry, then GitHub Releases.

Publishing npm and MCP Registry versions is irreversible. Preparing a release
does not authorize creating or pushing its tag.

## One-time repository setup

Before the first automated release:

1. In npm package settings for `@granitebps/twitter-mcp`, configure a trusted
   GitHub Actions publisher for repository `granitebps/twitter-mcp` and workflow
   filename `release.yml`. Under **Allowed actions**, explicitly select
   `npm publish`. Do not configure an npm token.
2. Keep GitHub Actions enabled with permission to create releases. The workflow
   grants `id-token: write` and `contents: write` only to its publishing job.
3. Protect `main` after the new CI jobs have passed on GitHub. Require the
   deterministic check, package checks, production audit, and release preflight;
   require current branches, resolved conversations, and linear history; block
   force-pushes and branch deletion.

These settings are remote administration tasks and are not changed by the
repository files.

## Prepare a candidate

Use Node.js 22.21.0 or a newer Node 22 release. Start from the exact `main`
commit intended for release with a clean worktree.

1. Choose the version according to semantic versioning and the
   [v1 compatibility contract](docs/v1-compatibility.md).
2. Update the version in `package.json`, `package-lock.json`, and `server.json`.
3. Add the matching entry to `CHANGELOG.md`.
4. Add `docs/release-notes-vX.Y.Z.md`. This file is the exact GitHub release
   body and must describe installation, notable changes, known limitations, and
   any compatibility impact.
5. Review the complete diff and confirm that it contains no credentials.

The release contract checker requires all package and Registry metadata to
match. On a tag, it also requires the tag to equal `v` plus the package version
and requires the corresponding release-notes file.

## Verify without publishing

Run the same deterministic checks used by CI:

```bash
npm ci
npm run check
npm audit --omit=dev --audit-level=high
mcp-publisher validate
git diff --check
```

Review the packed file list from `npm run check:package`. It must contain the
compiled CLI and library, README, license, and `server.json`; it must not contain
credentials, `.env` files, tests, sources, or maintainer documentation.

Open the pull request and wait for CI and the release preflight to pass. The
preflight checks the exact commit, installs and exercises the npm tarball, and
validates `server.json` with a checksum-pinned MCP Publisher. Pull requests and
ordinary branch pushes cannot enter the publishing job.

## Record approval and create the tag

Before tagging, record approval for all four of these values:

- version;
- exact commit SHA;
- tag name;
- authorization to publish npm, MCP Registry, and GitHub releases.

Then tag the approved commit without moving or recreating an existing release
tag:

```bash
git switch main
git pull --ff-only
git status --short
git rev-parse HEAD
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

The tag push runs reusable CI and the release preflight before the publishing
job. The workflow checks out `github.sha`, confirms that the tag points to that
commit, and checks version-specific metadata again.

## Publication and reruns

The publishing job uses npm trusted publishing with GitHub OIDC. It verifies the
public package and its `gitHead` before continuing. It then creates a Registry
publication document bound to the triggering commit, uses GitHub OIDC for the
MCP Registry, and finally creates the GitHub release from the tag-specific
notes.

If a run fails after publishing one destination, rerun the workflow for the
same immutable tag. Each step accepts an existing version only when its public
metadata matches the approved version, package, transport, and commit. Never
move the tag, reuse the version for different code, or retry with a different
commit.

If an existing npm version or Registry entry does not match, stop. Choose a new
patch version, fix the metadata, repeat review and approval, and create a new
tag. If a published npm version has a serious problem, deprecate it with a
specific message directing users to the fixed version; do not unpublish or
overwrite it.

## Verify the release

After the workflow succeeds:

1. Confirm npm serves `@granitebps/twitter-mcp@X.Y.Z`, its `gitHead` equals the
   approved commit, the `latest` tag is correct, and npm displays provenance.
2. From a temporary directory, run the exact published version and use MCP
   Inspector to list tools and call `get_server_info` with a fake API token:

   ```bash
   release_test_dir=$(mktemp -d)
   cd "$release_test_dir"
   npx -y @modelcontextprotocol/inspector@latest --web \
     -e TWITTER_MODE=api \
     -e TWITTER_BEARER_TOKEN=verification-only \
     npx -y @granitebps/twitter-mcp@X.Y.Z
   ```

3. Confirm the MCP Registry lists
   `io.github.granitebps/twitter-mcp@X.Y.Z` with the matching npm package and
   `stdio` transport.
4. Confirm the GitHub release and tag both point to the approved commit and the
   release body matches `docs/release-notes-vX.Y.Z.md`.

Credentialed Rettiwt smoke testing remains optional and separate from release
automation. Use a disposable X account and repository secrets; never expose
credentials to pull requests, Inspector input, release notes, or logs.
