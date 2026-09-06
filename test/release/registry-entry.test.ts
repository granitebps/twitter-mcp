import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, expect, it } from "vitest";

const checker = resolve("scripts/check-registry-entry.mjs");
const temporaryRoots: string[] = [];

function server(commit = "abc123") {
  return {
    $schema: "https://example.com/server.schema.json",
    name: "io.github.example/server",
    title: "Example",
    description: "Example server",
    repository: { url: "https://github.com/example/server", source: "github" },
    version: "1.2.3",
    packages: [
      {
        registryType: "npm",
        identifier: "@example/server",
        version: "1.2.3",
        transport: { type: "stdio" },
        environmentVariables: [
          { name: "TOKEN", description: "Access token", isRequired: true, isSecret: true },
        ],
      },
    ],
    _meta: {
      "io.modelcontextprotocol.registry/publisher-provided": {
        buildInfo: { commit },
      },
    },
  };
}

function run(expected: unknown, actualServer: unknown, commit = "abc123") {
  const root = mkdtempSync(join(tmpdir(), "twitter-mcp-registry-entry-"));
  temporaryRoots.push(root);
  const expectedPath = join(root, "expected.json");
  const actualPath = join(root, "actual.json");
  writeFileSync(expectedPath, JSON.stringify(expected));
  writeFileSync(actualPath, JSON.stringify({ server: actualServer, _meta: { registry: true } }));
  return spawnSync(
    process.execPath,
    [checker, "--expected", expectedPath, "--actual", actualPath, "--commit", commit],
    { encoding: "utf8" },
  );
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

it("accepts the exact published server document and commit", () => {
  const expected = server();
  const result = run(expected, JSON.parse(JSON.stringify(expected)));

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Registry entry verified");
});

it.each([
  ["description", (value: ReturnType<typeof server>) => (value.description = "Different")],
  ["repository", (value: ReturnType<typeof server>) => (value.repository.url += "-fork")],
  [
    "environment variables",
    (value: ReturnType<typeof server>) =>
      (value.packages[0]!.environmentVariables[0]!.name = "OTHER"),
  ],
  [
    "commit",
    (value: ReturnType<typeof server>) =>
      (value._meta["io.modelcontextprotocol.registry/publisher-provided"].buildInfo.commit =
        "wrong"),
  ],
] satisfies Array<[string, (value: ReturnType<typeof server>) => void]>)(
  "rejects mismatched %s",
  (_label, mutate) => {
    const expected = server();
    const actual = server();
    mutate(actual);

    const result = run(expected, actual);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("does not match");
  },
);
