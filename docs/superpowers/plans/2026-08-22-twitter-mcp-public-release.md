# Twitter MCP public-release implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Refactor the server into a tested, publishable stdio MCP package with authenticated Rettiwt as the free default and the official X API as an optional provider.

**Architecture:** Build one modular npm package with isolated configuration, domain, error, provider, server, and CLI modules. Preserve Phase 1 tool names and input fields while adding MCP v2 schemas, annotations, structured results, stable errors, and Phase 2 extension points.

**Tech stack:** Node.js `^22.21.0`, TypeScript 6, MCP TypeScript SDK v2, Zod 4, Rettiwt 7, `twitter-api-v2`, Vitest, ESLint, Prettier, npm, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-twitter-mcp-public-release-design.md`

## Global constraints

- Rettiwt is the default provider and requires `RETTIWT_API_KEY`.
- Rettiwt guest mode and scraper mode are not supported.
- Official API mode remains optional.
- Runtime transport is stdio only.
- Node.js `^22.21.0` is required.
- Preserve the four existing Twitter tool names and input field names.
- Keep JSON text results while adding structured output.
- Do not publish, commit, push, or create a pull request without separate approval.
- Never expose credentials in logs, errors, fixtures, snapshots, or package contents.

## File map

### Runtime source

- `src/index.ts`: side-effect-free public exports.
- `src/cli.ts`: executable stdio entrypoint and lifecycle.
- `src/config/env.ts`: environment schema and discriminated runtime configuration.
- `src/domain/schemas.ts`: canonical Zod schemas and inferred domain types.
- `src/domain/requests.ts`: provider request, context, page, warning, and capability types.
- `src/errors/twitter-error.ts`: stable error codes, error class, redaction, and unknown-error mapping.
- `src/providers/provider.ts`: `TwitterProvider` interface.
- `src/providers/factory.ts`: lazy provider selection.
- `src/providers/rettiwt/mapper.ts`: Rettiwt-to-domain mapping.
- `src/providers/rettiwt/provider.ts`: authenticated Rettiwt operations.
- `src/providers/api/mapper.ts`: official API-to-domain mapping.
- `src/providers/api/provider.ts`: official API operations.
- `src/server/input.ts`: compatible input schemas and normalization.
- `src/server/output.ts`: success and error result envelopes.
- `src/server/register-tools.ts`: tool declarations and handlers.
- `src/server/create-server.ts`: MCP server construction and instructions.

### Tests and tooling

- `test/config/env.test.ts`: configuration matrix.
- `test/domain/input.test.ts`: tweet reference, username, and query validation.
- `test/errors/twitter-error.test.ts`: error mapping and redaction.
- `test/providers/contract.ts`: reusable provider behavior checks.
- `test/providers/rettiwt/mapper.test.ts`: Rettiwt mapping.
- `test/providers/rettiwt/provider.test.ts`: mocked Rettiwt adapter.
- `test/providers/api/mapper.test.ts`: official API mapping.
- `test/providers/api/provider.test.ts`: mocked official API adapter.
- `test/server/server.test.ts`: in-memory MCP discovery and tool calls.
- `test/cli/stdio.test.ts`: built executable smoke test.
- `scripts/check-package.mjs`: clean package-content validation.
- `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `vitest.config.ts`: quality configuration.
- `tsconfig.json`, `tsconfig.build.json`: type-check and production-build boundaries.

### Distribution and project files

- `package.json`, `package-lock.json`: dependencies, scripts, executable, package allowlist, and metadata.
- `.github/workflows/ci.yml`, `.github/dependabot.yml`: CI and dependency updates.
- `server.json`: MCP Registry metadata for `io.github.granitebps/twitter-mcp`.
- `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`: public-project policy files.
- `.env.example`, `.gitignore`, `README.md`: current configuration and user documentation.

---

### Task 1: Establish the supported toolchain and package boundary

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `vitest.config.ts`

**Interfaces:**

- Produces scripts `clean`, `build`, `typecheck`, `test`, `test:coverage`, `lint`, `format`, `format:check`, `check:package`, and `check`.
- Produces the executable `twitter-mcp` at `dist/cli.js`.
- Adds `@modelcontextprotocol/server` for the new runtime and `@modelcontextprotocol/client` for tests.
- Keeps legacy runtime dependencies temporarily so the existing build remains green until replacement modules land. Task 9 removes them.

- [ ] **Step 1: Update the package manifest and dependency set**

Set the package identity to `@granitebps/twitter-mcp` and require Node.js `^22.21.0`. Add the quality scripts without changing the current executable or package allowlist yet; Task 8 switches the executable after `src/cli.ts` exists, and Task 9 locks the package contents after all required public files exist.

Add these dependencies alongside the current runtime dependencies:

```json
{
  "dependencies": {
    "@modelcontextprotocol/server": "^2.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@modelcontextprotocol/client": "^2.0.0",
    "@types/node": "^25.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "typescript": "^6.0.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies and regenerate the lockfile**

Run:

```bash
npm install
```

Expected: install succeeds. Existing runtime dependencies remain installed until their source replacements are complete.

- [ ] **Step 3: Add strict compiler, lint, format, and test configuration**

`tsconfig.json` type-checks both `src` and `test` with `noEmit`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`. `tsconfig.build.json` extends it, includes only `src`, emits declarations and source maps to `dist`, and excludes tests.

`vitest.config.ts` uses the Node environment, clears and restores mocks, and enforces coverage for `src/**/*.ts` except `src/cli.ts` through the dedicated CLI smoke test.

- [ ] **Step 4: Verify the toolchain starts from a clean dependency graph**

Run:

```bash
npm run typecheck
npm run lint
npm run format:check
```

Expected: all three commands pass against the existing source and new configuration. If stricter rules expose an existing issue, make the smallest formatting or type-only correction needed without changing runtime behavior.

---

### Task 2: Define domain models, request envelopes, and input normalization

**Files:**

- Create: `src/domain/schemas.ts`
- Create: `src/domain/requests.ts`
- Create: `src/server/input.ts`
- Create: `test/domain/input.test.ts`
- Remove after migration: `src/provider.ts`

**Interfaces:**

- Produces `TweetSchema`, `UserProfileSchema`, `TweetPageSchema`, and inferred `Tweet`, `UserProfile`, `TweetPage` types.
- Produces `GetTweetRequest`, `GetRepliesRequest`, `GetProfileRequest`, `SearchTweetsRequest`, `RequestContext`, and `ProviderCapabilities`.
- Produces `parseTweetReference(value: string): string` and `normalizeUsername(value: string): string`.

- [ ] **Step 1: Write failing input normalization tests**

```ts
import { describe, expect, it } from "vitest";
import { normalizeUsername, parseTweetReference } from "../../src/server/input.js";

describe("parseTweetReference", () => {
  it.each([
    ["1234567890123456789", "1234567890123456789"],
    ["https://x.com/example/status/1234567890123456789", "1234567890123456789"],
    ["https://twitter.com/example/status/1234567890123456789?s=20", "1234567890123456789"],
  ])("parses %s", (input, expected) => {
    expect(parseTweetReference(input)).toBe(expected);
  });

  it.each(["", "abc1234567890123456789def", "https://example.com/status/1234567890123456789"])(
    "rejects %s",
    (input) => expect(() => parseTweetReference(input)).toThrow(),
  );
});

describe("normalizeUsername", () => {
  it("removes one leading at sign", () =>
    expect(normalizeUsername("@TwitterDev")).toBe("TwitterDev"));
  it.each(["", "@", "two words", "name/with/slash"])("rejects %s", (input) => {
    expect(() => normalizeUsername(input)).toThrow();
  });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
npx vitest run test/domain/input.test.ts
```

Expected: fail because `src/server/input.ts` does not exist.

- [ ] **Step 3: Implement canonical schemas and request types**

Use Zod schemas as the source of runtime validation and TypeScript types. `TweetPageSchema` must use an object root:

```ts
export const TweetPageSchema = z.object({
  items: z.array(TweetSchema),
  nextCursor: z.string().optional(),
  partial: z.boolean().optional(),
  warnings: z.array(ProviderWarningSchema).optional(),
});

export type TweetPage = z.infer<typeof TweetPageSchema>;
```

Define `RequestContext` as:

```ts
export interface RequestContext {
  signal: AbortSignal;
  deadline: number;
}
```

- [ ] **Step 4: Implement strict compatible input schemas**

Keep `tweet_id`, `max_results`, `username`, and `query`. Apply defaults only through Zod schemas. Require integer `max_results` between 1 and 100 and reject empty trimmed queries.

- [ ] **Step 5: Run focused tests**

Run:

```bash
npx vitest run test/domain/input.test.ts
```

Expected: all input tests pass.

---

### Task 3: Add validated configuration and safe errors

**Files:**

- Create: `src/config/env.ts`
- Create: `src/errors/twitter-error.ts`
- Create: `test/config/env.test.ts`
- Create: `test/errors/twitter-error.test.ts`

**Interfaces:**

- Produces `loadConfig(env: NodeJS.ProcessEnv): RuntimeConfig`.
- Produces discriminated `RettiwtConfig` and `ApiConfig`.
- Produces `TwitterError`, `TwitterErrorCode`, `toTwitterError`, and `redactSecrets`.

- [ ] **Step 1: Write the failing configuration matrix**

```ts
it("defaults to authenticated Rettiwt", () => {
  expect(loadConfig({ RETTIWT_API_KEY: "cookie-key" })).toMatchObject({
    mode: "rettiwt",
    apiKey: "cookie-key",
  });
});

it.each([
  [{}, "RETTIWT_API_KEY"],
  [{ TWITTER_MODE: "unknown" }, "TWITTER_MODE"],
  [{ TWITTER_MODE: "api", TWITTER_API_KEY: "partial" }, "complete OAuth"],
])("rejects invalid configuration", (env, message) => {
  expect(() => loadConfig(env)).toThrow(message);
});
```

- [ ] **Step 2: Write failing redaction and stable-error tests**

Verify that strings containing bearer tokens, Rettiwt keys, `auth_token`, `ct0`, and `Authorization` values return `[REDACTED]`, and that unknown exceptions map to `INTERNAL_ERROR` without copying raw messages into tool-safe output.

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
npx vitest run test/config/env.test.ts test/errors/twitter-error.test.ts
```

Expected: fail because configuration and error modules do not exist.

- [ ] **Step 4: Implement the discriminated environment parser**

The public configuration type must narrow by mode:

```ts
export type RuntimeConfig =
  | { mode: "rettiwt"; apiKey: string; requestTimeoutMs: number }
  | { mode: "api"; credentials: ApiCredentials; requestTimeoutMs: number };
```

Default `TWITTER_REQUEST_TIMEOUT_MS` to 30,000 and constrain it to 1,000 through 120,000.

- [ ] **Step 5: Implement safe typed errors and rerun tests**

Run:

```bash
npx vitest run test/config/env.test.ts test/errors/twitter-error.test.ts
```

Expected: all tests pass and no snapshot contains a credential value.

---

### Task 4: Define the provider contract and migrate Rettiwt

**Files:**

- Create: `src/providers/provider.ts`
- Create: `src/providers/rettiwt/mapper.ts`
- Create: `src/providers/rettiwt/provider.ts`
- Create: `test/providers/contract.ts`
- Create: `test/providers/rettiwt/mapper.test.ts`
- Create: `test/providers/rettiwt/provider.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Remove: `src/rettiwt-provider.ts`

**Interfaces:**

- Produces `TwitterProvider` with request-object methods and `capabilities`.
- Produces `RettiwtProvider` that requires an injected client or API key.
- Produces pure mapping functions `mapRettiwtTweet` and `mapRettiwtUser`.

- [ ] **Step 1: Write failing mapper tests with minimal upstream fixtures**

```ts
it("normalizes missing Rettiwt metrics to zero", () => {
  const result = mapRettiwtTweet({
    id: "1",
    fullText: "hello",
    createdAt: "2026-08-22T00:00:00.000Z",
    tweetBy: undefined,
  });

  expect(result).toMatchObject({
    id: "1",
    text: "hello",
    author: null,
    metrics: { likes: 0, retweets: 0, replies: 0, quotes: 0, bookmarks: 0, views: 0 },
  });
});
```

- [ ] **Step 2: Write a reusable provider contract suite**

The suite accepts a factory that returns a provider backed by fakes. It verifies canonical output schemas, capability honesty, max-result enforcement, and propagation of `NOT_FOUND`, `AUTH_FAILED`, `RATE_LIMITED`, and `TIMEOUT` errors.

- [ ] **Step 3: Run Rettiwt tests and confirm failure**

Run:

```bash
npx vitest run test/providers/rettiwt
```

Expected: fail because the new adapter does not exist.

- [ ] **Step 4: Implement Rettiwt mapping and adapter operations**

Upgrade `rettiwt-api` to `^7.1.3`. Construct Rettiwt with `{ apiKey, timeout: requestTimeoutMs, logging: false }`. Implement all four operations. Return `TweetPage` for replies and search. Parse supported search tokens inside this adapter and return a warning for unsupported operators instead of treating them as ordinary words.

- [ ] **Step 5: Enforce deadlines and map upstream failures**

Wrap each upstream promise with the request deadline. Convert known authentication, not-found, rate-limit, and network failures to `TwitterError`. Do not retry inside the adapter during Phase 1.

- [ ] **Step 6: Run Rettiwt tests and provider contract**

Run:

```bash
npx vitest run test/providers/rettiwt test/providers/contract.ts
```

Expected: all tests pass without network access or real credentials.

---

### Task 5: Migrate the official API provider

**Files:**

- Create: `src/providers/api/mapper.ts`
- Create: `src/providers/api/provider.ts`
- Create: `test/providers/api/mapper.test.ts`
- Create: `test/providers/api/provider.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Remove: `src/api-provider.ts`

**Interfaces:**

- Produces `OfficialApiProvider` implementing the same `TwitterProvider` contract.
- Produces pure `mapApiTweet` and `mapApiUser` functions.

- [ ] **Step 1: Write failing API mapper and adapter tests**

Test bearer-token construction, full OAuth construction, author expansion lookup by ID rather than array position, missing metric defaults, not-found mapping, and search/reply `max_results` clamping to the official API range.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npx vitest run test/providers/api
```

Expected: fail because the new official adapter does not exist.

- [ ] **Step 3: Implement pure mappers and the official adapter**

Upgrade `twitter-api-v2` to `^1.29.1`. Use a user map keyed by user ID. Clamp official search page sizes to 10 through 100 while slicing returned items back to the caller's requested count when it is below 10.

- [ ] **Step 4: Apply the shared error and deadline behavior**

Map X API status and error codes to stable application errors. Never include request authorization details or raw response bodies in tool-safe errors.

- [ ] **Step 5: Run API tests and provider contract**

Run:

```bash
npx vitest run test/providers/api test/providers/contract.ts
```

Expected: all tests pass without X credentials.

---

### Task 6: Add lazy provider construction

**Files:**

- Create: `src/providers/factory.ts`
- Create: `test/providers/factory.test.ts`

**Interfaces:**

- Produces `createProvider(config: RuntimeConfig): Promise<TwitterProvider>`.
- Loads only the selected provider module with dynamic `import()`.

- [ ] **Step 1: Write failing provider-selection tests**

Mock dynamic provider constructors and verify that Rettiwt config imports only the Rettiwt adapter while API config imports only the official adapter.

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
npx vitest run test/providers/factory.test.ts
```

Expected: fail because the factory does not exist.

- [ ] **Step 3: Implement the lazy factory**

```ts
export async function createProvider(config: RuntimeConfig): Promise<TwitterProvider> {
  if (config.mode === "rettiwt") {
    const { RettiwtProvider } = await import("./rettiwt/provider.js");
    return RettiwtProvider.create(config);
  }

  const { OfficialApiProvider } = await import("./api/provider.js");
  return OfficialApiProvider.create(config);
}
```

- [ ] **Step 4: Run factory tests**

Run:

```bash
npx vitest run test/providers/factory.test.ts
```

Expected: all tests pass.

---

### Task 7: Build the MCP v2 server and compatible result layer

**Files:**

- Create: `src/server/output.ts`
- Create: `src/server/register-tools.ts`
- Create: `src/server/create-server.ts`
- Create: `test/server/server.test.ts`
- Replace: `src/index.ts`

**Interfaces:**

- Produces `createTwitterServer(options: CreateServerOptions): McpServer`.
- Produces result helpers that return both `content` and `structuredContent`.
- Exports programmatic server, configuration, domain, and provider types from `src/index.ts`.

- [ ] **Step 1: Write failing in-memory MCP integration tests**

Use `Client` and `InMemoryTransport.createLinkedPair()` from the same SDK package. Verify:

```ts
const listed = await client.listTools();
expect(listed.tools.map((tool) => tool.name)).toEqual([
  "get_tweet",
  "get_tweet_replies",
  "get_user_profile",
  "search_tweets",
  "get_server_info",
]);

expect(listed.tools.find((tool) => tool.name === "get_tweet")?.annotations).toMatchObject({
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
});
```

Call every tool against a fake provider. Validate its output schema, structured object, compatibility JSON text, request-object translation, error code, retryability, and provider name.

- [ ] **Step 2: Run server tests and confirm failure**

Run:

```bash
npx vitest run test/server/server.test.ts
```

Expected: fail because the server modules do not exist.

- [ ] **Step 3: Implement success and error result helpers**

Collection structured output uses `{ items, nextCursor?, partial?, warnings? }`. Compatibility text for replies and search serializes only `items` in Phase 1. Single-object tools serialize the canonical object.

Tool-safe errors use:

```ts
const structuredContent = {
  error: {
    code: error.code,
    message: error.safeMessage,
    provider: error.provider,
    retryable: error.retryable,
    retryAfterSeconds: error.retryAfterSeconds,
  },
};
```

- [ ] **Step 4: Register all tools with complete MCP metadata**

Use full Zod objects for `inputSchema` and `outputSchema`. Add titles, precise descriptions, and the approved read-only annotations. Build `get_server_info` from provider capabilities and package version.

- [ ] **Step 5: Implement request deadlines in handlers**

Create one `AbortController` per call, combine MCP cancellation with the configured timeout, pass the resulting `RequestContext` to the provider, and clear timers in `finally`.

- [ ] **Step 6: Make `src/index.ts` side-effect free**

Export `createTwitterServer`, `loadConfig`, domain types, error types, `TwitterProvider`, and `createProvider`. Do not call `dotenv.config()`, read `process.env`, construct a provider, or connect a transport during import.

- [ ] **Step 7: Run server tests**

Run:

```bash
npx vitest run test/server/server.test.ts
```

Expected: all MCP discovery and call tests pass.

---

### Task 8: Add the stdio CLI and process lifecycle

**Files:**

- Create: `src/cli.ts`
- Create: `test/cli/stdio.test.ts`
- Modify: `package.json`

**Interfaces:**

- Produces executable `dist/cli.js` with a Node shebang.
- Uses SDK v2 `serveStdio` so the server can negotiate supported protocol eras.

- [ ] **Step 1: Write a failing packaged CLI smoke test**

Spawn `node dist/cli.js` through `StdioClientTransport` with a fake-format Rettiwt key, connect a client, list tools, verify server identity, then close cleanly. The test must fail if stdout contains non-protocol text.

- [ ] **Step 2: Run the smoke test and confirm failure**

Run:

```bash
npm run build && npx vitest run test/cli/stdio.test.ts
```

Expected: fail because `dist/cli.js` does not exist or does not use the new lifecycle.

- [ ] **Step 3: Implement the CLI factory and fatal-error path**

Load `.env`, call `loadConfig(process.env)`, create the provider, then pass a server factory to `serveStdio`. Log startup and fatal errors only to stderr. Redact fatal errors before printing and set a nonzero exit code. Change `bin.twitter-mcp` and `main` to the new compiled entrypoints only after the build creates them.

- [ ] **Step 4: Run the CLI smoke test**

Run:

```bash
npm run build && npx vitest run test/cli/stdio.test.ts
```

Expected: the client connects, lists five tools, closes, and observes no stdout corruption.

---

### Task 9: Lock down package contents and public metadata

**Files:**

- Create: `scripts/check-package.mjs`
- Create: `server.json`
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `CHANGELOG.md`
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Remove generated stale files through clean build: `dist/tweetapi-provider.*`

**Interfaces:**

- Produces valid MCP Registry metadata named `io.github.granitebps/twitter-mcp`.
- Produces an npm tarball containing only approved public files.

- [ ] **Step 1: Write package-content validation before changing packaging**

`scripts/check-package.mjs` runs `npm pack --dry-run --json`, parses the file list, fails on `.serena`, `.env`, `src/`, `test/`, unknown root files, or stale `dist` modules, and requires `dist/cli.js`, `dist/index.js`, README, LICENSE, package manifest, and `server.json`.

- [ ] **Step 2: Run package validation and confirm failure**

Run:

```bash
npm run check:package
```

Expected: fail against the pre-refactor package contents.

- [ ] **Step 3: Add exact package and Registry metadata**

Remove `@modelcontextprotocol/sdk` and `@the-convocation/twitter-scraper`, update `dotenv` to `^17.4.2` and `zod` to `^4.4.3`, add `mcpName: "io.github.granitebps/twitter-mcp"`, add `prepack: "npm run clean && npm run build"`, and restrict `files` to `dist`, `README.md`, `LICENSE`, and `server.json`. Keep package validation inside `npm run check`; do not call `npm run check` from `prepack`, because `check:package` itself runs `npm pack`.

Use:

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.granitebps/twitter-mcp",
  "title": "Twitter/X MCP",
  "description": "Read public Twitter/X posts, replies, profiles, and search results through Rettiwt or the official X API.",
  "repository": {
    "url": "https://github.com/granitebps/twitter-mcp",
    "source": "github"
  },
  "version": "1.0.0",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@granitebps/twitter-mcp",
      "version": "1.0.0",
      "transport": { "type": "stdio" },
      "environmentVariables": [
        {
          "name": "RETTIWT_API_KEY",
          "description": "Rettiwt key containing an authenticated X browser session",
          "isRequired": true,
          "isSecret": true,
          "format": "string"
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Add public project policy files and update documentation**

Keep ISC licensing. Document `npx` configuration for Claude Desktop, VS Code, Cursor, and generic stdio clients. Explain Rettiwt key sensitivity, unofficial access, X terms and account risk, official API mode, error codes, timeouts, troubleshooting, supported Node versions, and the Phase 2 roadmap.

- [ ] **Step 5: Validate the clean tarball**

Run:

```bash
npm run clean
npm run build
npm run check:package
```

Expected: package validation passes and no `.serena`, `.env`, source, tests, or stale provider artifacts appear.

---

### Task 10: Add CI and complete the local quality gate

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces CI on the latest Node.js 22 release running `npm ci` followed by `npm run check`.
- Produces weekly npm dependency update proposals.

- [ ] **Step 1: Add CI workflow with least privilege**

Set workflow permissions to `contents: read`. Trigger on pushes to `main` and pull requests. Use an npm cache and no repository secrets.

- [ ] **Step 2: Add Dependabot configuration**

Configure weekly npm and GitHub Actions updates with a small open-pull-request limit. Do not add automatic merging.

- [ ] **Step 3: Run the complete local check**

Run:

```bash
npm run check
```

Expected: format check, lint, type check, tests, production build, and package validation all pass.

- [ ] **Step 4: Run production dependency audit**

Run:

```bash
npm audit --omit=dev
```

Expected: no known high or critical production vulnerabilities. If a transitive advisory remains with no safe upgrade, document the exact advisory, dependency path, exposure analysis, and update owner before release.

- [ ] **Step 5: Verify the supported Node matrix locally where available**

Run the full check on Node.js 22.21.0 or newer within major version 22. Record the exact version verified.

- [ ] **Step 6: Inspect final scope without committing**

Run:

```bash
git status --short
git diff --check
git diff --stat
```

Expected: only files named by this plan plus approved onboarding metadata and README edits are changed. No credentials or generated tarballs are present.

## Implementation completion report

Report:

- exact commands run and their exit status;
- test count and coverage summary;
- production audit result;
- packed file list summary;
- Node.js versions verified;
- remaining upstream or legal risks;
- any release actions still requiring explicit approval.
