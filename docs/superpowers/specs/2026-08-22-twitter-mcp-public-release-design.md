# Twitter MCP public-release design

Date: 2026-08-22

## Purpose

Prepare this MCP server for public npm and MCP Registry distribution. Phase 1 improves architecture, protocol use, security, testing, packaging, and maintenance without intentionally changing the four existing Twitter tool contracts. Phase 2 reviews and improves tool behavior after the foundation is stable.

## Product constraints

- Rettiwt is the default provider and requires `RETTIWT_API_KEY`.
- Rettiwt guest mode is not supported.
- Username and password scraper mode is removed.
- The official X API remains an optional provider selected with `TWITTER_MODE=api`.
- Runtime transport is stdio only.
- Users install and launch the package with `npx`; cloning and building the repository is not required.
- Node.js `^22.21.0` is required because current Rettiwt releases declare that exact major-version range.
- Phase 1 preserves `get_tweet`, `get_tweet_replies`, `get_user_profile`, and `search_tweets`, including their existing input field names.
- Publishing to npm or the MCP Registry requires separate approval.

## Research findings

- The official X API charges for reads. It cannot satisfy the zero-cost provider requirement.
- X offers an unauthenticated oEmbed endpoint, but it does not provide the metrics, search, replies, and profile data required by this server.
- Rettiwt uses X internal endpoints. Its API key encodes session cookies and has the authority of the associated account. Documentation must describe the storage risk and users must provide their own key.
- X terms prohibit scraping without written permission. Public documentation must state that Rettiwt is unofficial and that users are responsible for compliance and account risk.
- MCP supports structured tool output, output schemas, tool titles, server instructions, and behavioral annotations.
- MCP TypeScript SDK v2 is the stable line for the 2026-07-28 protocol.
- The MCP Registry expects an npm package to declare a matching `mcpName` and `server.json` entry.

## Current-state problems

- `src/index.ts` combines environment loading, provider construction, schemas, tool registration, formatting, and process startup.
- Provider construction happens during module import, which makes tests and embedding difficult.
- An unknown `TWITTER_MODE` silently selects the official API provider.
- Rettiwt guest mode exposes tools that predictably fail without authentication.
- Scraper mode adds password handling, unstable login behavior, another large dependency, and more maintenance work.
- Provider methods use positional arguments and return bare arrays, leaving no clean path for pagination, warnings, or partial results.
- Errors are strings without stable codes or retry guidance.
- Upstream calls have no application deadline or consistent cancellation behavior.
- Tools return JSON text only and omit output schemas and annotations.
- There are no automated tests, linting, formatting, CI checks, or package-content checks.
- The current npm package dry run includes `.serena`, TypeScript sources, and stale compiled files.
- The repository lacks public-project metadata and policy files.

## Architecture

Use a modular monolith in one npm package:

```text
CLI and stdio transport
        |
validated configuration
        |
server factory and tool registration
        |
TwitterProvider contract
        |-- RettiwtProvider
        `-- OfficialApiProvider
```

The package is split by responsibility:

- `src/cli.ts` loads configuration, creates the provider and server, connects stdio, and handles fatal startup errors and shutdown.
- `src/config/` validates environment input once and returns a discriminated configuration type.
- `src/domain/` owns canonical schemas, inferred types, request objects, page envelopes, and provider capabilities.
- `src/errors/` owns stable application errors and safe upstream-error mapping.
- `src/providers/` owns the provider contract, factory, and provider adapters.
- `src/server/` owns the MCP server factory, tool declarations, handlers, and result formatting.
- `src/index.ts` exports supported programmatic entry points without starting a process during import.

Provider dependencies are loaded only when the selected provider is created. The design does not introduce a plugin framework or multiple npm packages.

## Configuration

`TWITTER_MODE` defaults to `rettiwt` and accepts only `rettiwt` or `api`.

Rettiwt configuration requires a non-empty `RETTIWT_API_KEY`.

Official API configuration accepts either:

- a non-empty `TWITTER_BEARER_TOKEN`; or
- the complete set of `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, and `TWITTER_ACCESS_SECRET`.

Partial OAuth credentials fail validation. Unknown modes and missing credentials fail before the MCP server connects. Logs and errors never include credential values.

## Domain and provider contracts

Provider methods accept request objects and request context:

```ts
interface TwitterProvider {
  readonly capabilities: ProviderCapabilities;
  getTweet(request: GetTweetRequest, context: RequestContext): Promise<Tweet>;
  getTweetReplies(request: GetRepliesRequest, context: RequestContext): Promise<TweetPage>;
  getUserProfile(request: GetProfileRequest, context: RequestContext): Promise<UserProfile>;
  searchTweets(request: SearchTweetsRequest, context: RequestContext): Promise<TweetPage>;
}
```

`RequestContext` carries an `AbortSignal` and deadline. Adapters propagate cancellation when their library supports it. Otherwise, the server still enforces the deadline and ignores late results.

`TweetPage` contains:

```ts
interface TweetPage {
  items: Tweet[];
  nextCursor?: string;
  partial?: boolean;
  warnings?: ProviderWarning[];
}
```

Phase 1 tool formatters preserve current JSON text shapes. Structured output uses object envelopes so later versions can add cursors and warnings without relying on a bare root array.

Provider capabilities declare supported operations, provider limits, authentication state, and pagination support. `get_server_info` derives its response from configuration and capabilities rather than a hard-coded tool list.

Canonical models contain no Rettiwt or `twitter-api-v2` types. Each adapter maps upstream data through focused mapper functions.

## MCP server behavior

`createServer` accepts validated configuration and a provider. It has no process-level side effects.

Every tool declaration includes:

- a stable programmatic name;
- a human-readable title and precise description;
- the existing Phase 1 input fields;
- an output schema;
- `readOnlyHint: true`;
- `destructiveHint: false`;
- `idempotentHint: true`;
- `openWorldHint: true`.

Successful calls return both `structuredContent` and serialized JSON text for older clients. Tool failures return `isError: true` and a safe structured error object plus readable text.

Server instructions explain that all tools read external X data, the active provider controls field availability, and `get_server_info` reports capabilities.

## Input compatibility

Phase 1 keeps the existing public fields:

- `get_tweet`: `tweet_id`
- `get_tweet_replies`: `tweet_id`, `max_results`
- `get_user_profile`: `username`
- `search_tweets`: `query`, `max_results`

Validation becomes stricter only where the current value cannot represent a valid request. Tweet inputs accept a numeric X ID or an `x.com` or `twitter.com` status URL. Username normalization accepts an optional leading `@` and emits the username without it. Empty queries are rejected.

Provider-specific limit differences are handled inside adapters. Phase 1 does not silently promise search operators that Rettiwt does not support.

## Errors, deadlines, and logging

Stable error codes are:

- `INVALID_INPUT`
- `AUTH_REQUIRED`
- `AUTH_FAILED`
- `NOT_FOUND`
- `RATE_LIMITED`
- `UPSTREAM_UNAVAILABLE`
- `TIMEOUT`
- `UNSUPPORTED_OPERATION`
- `INTERNAL_ERROR`

Each error includes a safe message, code, provider, retryable flag, and optional retry guidance. Authentication and validation errors are never retried. Transient retries, if enabled, use a small bounded attempt count and exponential backoff. Phase 1 will prefer explicit failure over a long hidden wait.

Stdio stdout is reserved for protocol messages. Operational logs use stderr. Raw upstream errors may be logged only after redaction. Credentials, cookies, authorization headers, and tokens must never appear in logs or tool results.

## Testing and quality controls

The planned quality stack is:

- Vitest for unit, provider contract, adapter, MCP integration, and CLI smoke tests.
- ESLint with type-aware TypeScript rules.
- Prettier for deterministic formatting.
- `tsc --noEmit` for type checking and a separate production build.
- GitHub Actions on the latest Node.js 22 release.
- Dependabot and production dependency audits.

Tests do not require real X credentials. Adapter tests mock third-party libraries. MCP integration tests use an in-memory client and validate tool discovery, annotations, structured results, compatibility text, and errors. A CLI test spawns the built executable over stdio. Package validation performs a clean build and checks the exact `npm pack --dry-run` file list.

Optional live tests use repository secrets and never run for untrusted fork pull requests.

`npm run check` runs formatting validation, linting, type checking, tests, production build, and package validation.

## Packaging and public repository files

The npm package exposes a stdio executable suitable for:

```json
{
  "mcpServers": {
    "twitter": {
      "command": "npx",
      "args": ["-y", "@granitebps/twitter-mcp"],
      "env": {
        "RETTIWT_API_KEY": "..."
      }
    }
  }
}
```

The final package includes compiled runtime files, README, license, and package metadata only. `prepack` performs a clean verified build. The package name is `@granitebps/twitter-mcp` and the MCP Registry name is `io.github.granitebps/twitter-mcp`, matching the existing GitHub repository owner. Package metadata includes the repository, homepage, issues, supported Node.js version, executable, `files`, keywords, and `mcpName`.

The repository adds `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `server.json`, and CI workflows. Publishing remains manual until the package name and process are proven. No implementation step publishes artifacts.

## Phase 2 readiness

Phase 2 reviews each tool's inputs, result fields, provider consistency, ordering, pagination, completeness, limits, search translation, thread semantics, unavailable content, partial results, and model-facing descriptions.

Phase 1 prepares for this work through request objects, page envelopes, capabilities, canonical models, adapter mappers, separate schemas, and isolated formatters. Phase 2 can add cursors, warnings, richer fields, or corrected semantics without changing process startup or provider construction again.

Breaking Phase 2 contracts require a major package version or a new tool name with migration notes.

## Phase 1 exclusions

- Streamable HTTP transport
- Remote hosting and OAuth for an HTTP server
- A provider plugin framework
- Multiple npm packages
- New Twitter tools
- Intentional redesign of existing tool functionality
- Automated npm or MCP Registry publishing
- Storage of user credentials

## Acceptance criteria

Phase 1 is complete when:

- users can launch the packed artifact through its executable over stdio;
- Rettiwt is the default and refuses startup without `RETTIWT_API_KEY`;
- official API mode validates its credentials and remains usable;
- scraper mode and its dependency are gone;
- existing tool names and input fields remain available;
- all tools publish output schemas and behavioral annotations;
- successful calls include valid structured content and compatibility text;
- stable safe errors cover expected provider failures;
- unit, contract, adapter, MCP integration, CLI, and package tests pass without live credentials;
- `npm run check` passes on the latest Node.js 22 release;
- `npm pack --dry-run` contains only approved files and no stale build output;
- public documentation explains setup, provider differences, credential handling, unofficial-provider risk, and troubleshooting;
- architecture provides the Phase 2 extension points described above.

## Release ownership check

The unscoped `twitter-mcp` name is already occupied on npm. The scoped name `@granitebps/twitter-mcp` was unregistered when this design was written. Before publishing, the owner must confirm control of the `granitebps` npm organization or user scope and GitHub repository. The project keeps its existing ISC license.
