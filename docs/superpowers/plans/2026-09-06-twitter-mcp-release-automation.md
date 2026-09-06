# Twitter MCP release automation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested, tag-triggered npm, MCP Registry, and GitHub release path without publishing a release.

**Architecture:** Keep the current npm package and runtime unchanged. Add a small release-contract checker, static workflow regression tests, reusable multi-platform CI, and a read-only preflight that gates an OIDC publishing job.

**Tech Stack:** Node.js `^22.21.0`, npm 11.19.1, Vitest, GitHub Actions, npm trusted publishing, MCP Publisher v1.8.1, GitHub CLI.

**Spec:** `docs/superpowers/specs/2026-09-06-twitter-mcp-release-automation-design.md`

## Global Constraints

- Do not change the MCP runtime contract or provider behavior.
- Do not add an npm token or expose X credentials to pull requests.
- Do not commit, push, tag, publish, or alter remote repository settings.
- Use full commit SHA pins for external GitHub Actions.
- Keep Node.js `^22.21.0` and npm package version `1.0.0` in this preparation change.
- Keep normal release preflight jobs read-only.
- Require explicit approval for a future version, exact commit, tag, and publishing action.

---

### Task 1: Release contract checker

**Files:**

- Create: `scripts/check-release.mjs`
- Create: `test/release/release-contract.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes `package.json`, `package-lock.json`, `server.json`, and optional tag input.
- Produces command `npm run check:release` and a nonzero exit for inconsistent metadata.

- [x] Write a process-level test that passes against copied consistent metadata.
- [x] Add cases for package-lock, server, Registry name, npm identifier, tag, and release-note mismatches.
- [x] Run the focused test and confirm failure because the checker is absent.
- [x] Implement the checker with Node standard-library APIs only.
- [x] Run the focused test and confirm all cases pass.

### Task 2: Workflow policy tests and CI

**Files:**

- Create: `test/release/workflow-policy.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/dependabot.yml`

**Interfaces:**

- Produces reusable CI jobs named `check`, `package`, and `audit`.
- Pins `actions/checkout` and `actions/setup-node` to verified v6 commit SHAs.

- [x] Write tests for reusable CI, exact action pins, read-only permissions, three operating systems, and production audit coverage.
- [x] Run the focused test and confirm the current workflow fails those policies.
- [x] Implement the smallest CI changes that satisfy the policy.
- [x] Run the focused workflow test and formatting checks.

### Task 3: Read-only release preflight and tag publishing workflow

**Files:**

- Create: `.github/workflows/release.yml`
- Extend: `test/release/workflow-policy.test.ts`

**Interfaces:**

- Produces jobs `ci`, `release-check`, and `publish`.
- Uses MCP Publisher v1.8.1 Linux amd64 archive with SHA-256
  `a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc`.
- Publishes only for `refs/tags/v*` after both required jobs succeed.

- [x] Add failing policy tests for trigger restrictions, same-commit checkouts, preflight validation, minimal permissions, OIDC publication, step ordering, version-specific notes, and rerun guards.
- [x] Run the focused test and confirm failure because the workflow is absent.
- [x] Implement the read-only preflight and guarded publishing workflow.
- [x] Run the workflow policy test and inspect the workflow syntax.

### Task 4: Stable compatibility and release documentation

**Files:**

- Create: `docs/v1-compatibility.md`
- Rewrite: `RELEASE.md`
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**

- Documents the already-published v1 contract and automated release process.
- Keeps credentialed live testing outside deterministic CI.

- [x] Derive the compatibility document from current schemas, server tests, and README behavior.
- [x] Replace the manual release guide with the exact candidate, tag, recovery, and verification procedure.
- [x] Link the compatibility and release documents from user and contributor documentation.
- [x] Run Markdown formatting and local-link checks.

### Task 5: Full verification and handoff

**Files:**

- Inspect all changed files and generated package contents.

**Interfaces:**

- Produces local evidence only. Publication and remote settings remain pending.

- [x] Run `npm run check` on the available Node.js 22 runtime and record any engine limitation.
- [x] Run `npm audit --omit=dev --audit-level=high`.
- [x] Run `mcp-publisher validate` against the unchanged published metadata.
- [x] Run workflow syntax or structural validation available on the machine.
- [x] Run `git diff --check`, inspect the final diff, and confirm no generated package or credential entered the worktree.
- [x] Report the exact verification results and the remote steps that remain.
