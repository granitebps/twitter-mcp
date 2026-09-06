# Contributing

## Development setup

Use Node.js 22.21.0 or a newer Node 22 release. Rettiwt does not support Node 23 or later.

```bash
npm ci
npm run check
```

Tests must not call X or require live credentials. Use provider fakes or mocked upstream clients. Keep provider-specific types inside their adapter and preserve the [v1 compatibility contract](docs/v1-compatibility.md) unless a change is explicitly planned as breaking.

## Pull requests

Keep changes focused, add tests for behavior changes, and update the README or changelog when user-facing behavior changes. Run `npm run check` before opening a pull request.

Release preparation follows [RELEASE.md](RELEASE.md). A release pull request may
prepare version metadata and notes, but it must not create or push the release
tag. Tagging and publication require separate approval for the exact version and
commit.

Report security problems through the process in `SECURITY.md`, not a public issue.
