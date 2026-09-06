import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const checker = resolve("scripts/check-release.mjs");
const temporaryRoots: string[] = [];

interface FixtureOptions {
  packageVersion?: string;
  lockName?: string;
  lockVersion?: string;
  serverVersion?: string;
  mcpName?: string;
  serverName?: string;
  packageIdentifier?: string;
  transportType?: string;
}

function fixture(options: FixtureOptions = {}): string {
  const root = mkdtempSync(join(tmpdir(), "twitter-mcp-release-contract-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "docs"));

  const packageVersion = options.packageVersion ?? "1.2.3";
  const mcpName = options.mcpName ?? "io.github.granitebps/twitter-mcp";
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "@granitebps/twitter-mcp",
      version: packageVersion,
      mcpName,
      repository: { url: "git+https://github.com/granitebps/twitter-mcp.git" },
    }),
  );
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify({
      name: options.lockName ?? "@granitebps/twitter-mcp",
      version: options.lockVersion ?? packageVersion,
      packages: {
        "": {
          name: options.lockName ?? "@granitebps/twitter-mcp",
          version: options.lockVersion ?? packageVersion,
        },
      },
    }),
  );
  writeFileSync(
    join(root, "server.json"),
    JSON.stringify({
      name: options.serverName ?? mcpName,
      version: options.serverVersion ?? packageVersion,
      repository: {
        url: "https://github.com/granitebps/twitter-mcp",
        source: "github",
      },
      packages: [
        {
          registryType: "npm",
          identifier: options.packageIdentifier ?? "@granitebps/twitter-mcp",
          version: options.serverVersion ?? packageVersion,
          transport: { type: options.transportType ?? "stdio" },
        },
      ],
    }),
  );
  return root;
}

function run(root: string, tag?: string) {
  const args = [checker, "--root", root];
  if (tag) args.push("--tag", tag);
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("release metadata contract", () => {
  it("accepts synchronized package and Registry metadata", () => {
    const result = run(fixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("@granitebps/twitter-mcp@1.2.3");
  });

  it.each([
    [{ lockVersion: "1.2.2" }, "package-lock.json root version"],
    [{ lockName: "@example/wrong" }, "package-lock.json root name"],
    [{ serverVersion: "1.2.2" }, "server.json version"],
    [{ serverName: "io.github.example/wrong" }, "server.json name"],
    [{ packageIdentifier: "@example/wrong" }, "npm package identifier"],
    [{ transportType: "streamable-http" }, "npm package transport"],
  ] satisfies Array<[FixtureOptions, string]>)(
    "rejects inconsistent release metadata %#",
    (options, expectedError) => {
      const result = run(fixture(options));

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(expectedError);
    },
  );

  it("requires matching version-specific notes for a release tag", () => {
    const root = fixture();
    const missing = run(root, "v1.2.3");

    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("docs/release-notes-v1.2.3.md");

    writeFileSync(join(root, "docs", "release-notes-v1.2.3.md"), "# Twitter/X MCP v1.2.3\n");
    const valid = run(root, "v1.2.3");
    expect(valid.status).toBe(0);
  });

  it("rejects a tag that differs from the package version", () => {
    const root = fixture();
    writeFileSync(join(root, "docs", "release-notes-v1.2.4.md"), "# Twitter/X MCP v1.2.4\n");

    const result = run(root, "v1.2.4");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("tag v1.2.4 does not match package version 1.2.3");
  });
});
