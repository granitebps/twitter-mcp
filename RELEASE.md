# Release guide

This project uses a manual release process. Publishing an npm version or MCP Registry version cannot be undone by changing the repository, so confirm every version before running a publish command.

## Requirements

- Ownership of the `@granitebps` npm scope
- npm account with two-factor authentication enabled
- GitHub access to `granitebps/twitter-mcp`
- Node.js 22.21.0 or a newer Node 22 release
- A clean checkout of the `main` branch
- The [`mcp-publisher`](https://modelcontextprotocol.io/registry/quickstart) CLI for the MCP Registry step
- GitHub CLI for the commands below, or access to the GitHub release page

Do not put npm tokens, Rettiwt keys, X API credentials, or session cookies in the repository, command history, release notes, or logs.

## 1. Confirm the release

Check that `package.json`, `package-lock.json`, `server.json`, and the changelog use the intended version. The npm and MCP Registry versions must match.

```bash
git switch main
git pull --ff-only
git status --short
npm ci
npm run check
npm audit --omit=dev
npm pack --dry-run
```

`git status --short` must print nothing before publication. Review the packed file list and confirm that it contains `dist/cli.js`, `dist/index.js`, `README.md`, `LICENSE`, and `server.json`. It must not contain credentials, `.env` files, tests, source files, or maintainer documentation.

Confirm npm authentication and package ownership:

```bash
npm whoami
npm access list packages @granitebps
```

For the first release, this command should report that the package does not exist:

```bash
npm view @granitebps/twitter-mcp version
```

Stop if it returns an unexpected version or package owner.

## 2. Publish to npm

The package has `publishConfig.access` set to `public`, so the release command is:

```bash
npm publish
```

Complete npm's two-factor authentication prompt. Do not retry blindly after a timeout. Check npm first because the original request may have succeeded.

```bash
npm view @granitebps/twitter-mcp@1.0.0 name version dist-tags repository bin
```

The result must show version `1.0.0`, the `latest` tag, this GitHub repository, and the `twitter-mcp` executable.

## 3. Verify the public package

Use the package from npm rather than the local checkout:

Load `RETTIWT_API_KEY` into the shell from your password manager without putting its value in command history. Then run:

```bash
npx @modelcontextprotocol/inspector npx -y @granitebps/twitter-mcp@1.0.0
```

Remove the key from the shell when the check finishes:

```bash
unset RETTIWT_API_KEY
```

List the tools and call `get_server_info`. If you choose to test upstream behavior, use a disposable X account and call each Twitter tool with public data. Never paste the Rettiwt key into Inspector input or captured logs.

Also test one client configuration from the README with the exact version first:

```text
@granitebps/twitter-mcp@1.0.0
```

After the check passes, the unversioned README examples will resolve through npm's `latest` tag.

## 4. Publish to the MCP Registry

Do this only after npm serves `@granitebps/twitter-mcp@1.0.0`. The Registry entry points to that package and does not host it.

```bash
mcp-publisher login github
mcp-publisher publish
```

Confirm that the Registry lists `io.github.granitebps/twitter-mcp` at version `1.0.0` and that its npm package, transport, and `RETTIWT_API_KEY` metadata match `server.json`.

MCP Registry versions are immutable. If the metadata is wrong, fix it in a newer patch release rather than trying to reuse `1.0.0`.

## 5. Tag and create the GitHub release

Tag the exact commit used for npm publication:

```bash
git status --short
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --generate-notes --verify-tag
```

Confirm that the release page points to the same commit as the tag and links to the npm package.

## 6. Configure later releases

After the first npm release exists, configure an npm trusted publisher for this GitHub repository. Use a dedicated GitHub Actions release workflow with `id-token: write`, a GitHub-hosted runner, and a current npm CLI. Trusted publishing removes the long-lived npm token and adds provenance for supported public packages.

Follow npm's [trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/). Keep manual two-factor authentication available as the recovery path. Do not add an npm token to repository secrets once trusted publishing works.

## Failed release

Do not delete or overwrite a published version. If `1.0.0` has a serious problem, deprecate it with a specific message, fix the problem, and release `1.0.1`.

```bash
npm deprecate @granitebps/twitter-mcp@1.0.0 "Use 1.0.1 or newer: describe the release-blocking problem here"
```

Never use a vague deprecation message. Tell users which version to install and why.
