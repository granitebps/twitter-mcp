import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const projectRoot = process.cwd();
const installRoot = mkdtempSync(join(tmpdir(), "twitter-mcp-install-"));

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string}
 */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      [`${command} ${args.join(" ")} failed`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return result.stdout;
}

/**
 * @param {unknown} value
 * @returns {value is Array<{ filename: string }>}
 */
function isPackReport(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const entries = /** @type {unknown[]} */ (value);
  return entries.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      "filename" in entry &&
      typeof entry.filename === "string",
  );
}

/**
 * @param {unknown} value
 * @returns {value is { name: string, version: string, bin: Record<string, string> }}
 */
function isInstalledManifest(value) {
  if (typeof value !== "object" || value === null) return false;
  if (!("name" in value) || typeof value.name !== "string") return false;
  if (!("version" in value) || typeof value.version !== "string") return false;
  if (!("bin" in value) || typeof value.bin !== "object" || value.bin === null) return false;
  return (
    "twitter-mcp" in value.bin &&
    typeof (/** @type {Record<string, unknown>} */ (value.bin)["twitter-mcp"]) === "string"
  );
}

/** @type {Client | undefined} */
let client;
/** @type {unknown} */
let failure;

try {
  /** @type {unknown} */
  const packed = JSON.parse(
    run("npm", ["pack", "--json", "--pack-destination", installRoot], projectRoot),
  );
  if (!isPackReport(packed)) throw new Error("npm pack returned an invalid report");
  const filename = packed[0]?.filename;
  if (!filename) throw new Error("npm pack did not return a tarball name");

  run("npm", ["init", "--yes"], installRoot);
  run(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(installRoot, filename)],
    installRoot,
  );

  const packageRoot = join(installRoot, "node_modules", "@granitebps", "twitter-mcp");
  /** @type {unknown} */
  const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  if (!isInstalledManifest(manifest)) throw new Error("Installed package manifest is invalid");
  const binPath = manifest.bin?.["twitter-mcp"];
  if (!binPath) throw new Error("Installed package does not define twitter-mcp");

  const cliPath = join(packageRoot, binPath);
  if (!existsSync(cliPath)) throw new Error(`Installed CLI is missing: ${cliPath}`);

  /** @type {Error[]} */
  const transportErrors = [];
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cliPath],
    cwd: installRoot,
    env: {
      ...getDefaultEnvironment(),
      TWITTER_MODE: "api",
      TWITTER_BEARER_TOKEN: "package-install-test-token",
    },
    stderr: "pipe",
  });
  transport.onerror = (error) => transportErrors.push(error);
  client = new Client({ name: "twitter-mcp-install-test", version: "1.0.0" });

  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name).sort();
  const expected = [
    "get_tweet",
    "get_tweet_replies",
    "get_user_profile",
    "search_tweets",
    "get_server_info",
  ].sort();

  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Installed CLI returned unexpected tools: ${names.join(", ")}`);
  }
  if (transportErrors[0]) throw transportErrors[0];

  console.log(`Installed package verified: ${manifest.name}@${manifest.version}`);
} catch (error) {
  failure = error;
} finally {
  try {
    if (client) await client.close();
  } catch (error) {
    failure ??= error;
  }

  try {
    rmSync(installRoot, { recursive: true, force: true });
  } catch (error) {
    failure ??= error;
  }
}

if (failure) {
  throw failure instanceof Error
    ? failure
    : new Error("Package install check failed", { cause: failure });
}
