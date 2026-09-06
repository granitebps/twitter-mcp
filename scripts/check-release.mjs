import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * @param {string} name
 * @returns {string | undefined}
 */
function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

/**
 * @param {string} root
 * @param {string} name
 * @returns {unknown}
 */
function readJSON(root, name) {
  const path = resolve(root, name);
  try {
    return /** @type {unknown} */ (JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new Error(`cannot read ${name}`, { cause: error });
  }
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 */
function property(value, key) {
  return isRecord(value) ? value[key] : undefined;
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 * @param {string} label
 */
function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** @returns {string | undefined} */
function releaseTag() {
  const explicit = option("--tag");
  if (explicit) return explicit;
  if (process.env.GITHUB_REF_TYPE === "tag") return process.env.GITHUB_REF_NAME;
  const ref = process.env.GITHUB_REF;
  return ref?.startsWith("refs/tags/") ? ref.slice("refs/tags/".length) : undefined;
}

try {
  const root = resolve(option("--root") ?? process.cwd());
  const manifest = readJSON(root, "package.json");
  const lock = readJSON(root, "package-lock.json");
  const server = readJSON(root, "server.json");
  const version = property(manifest, "version");
  const packageName = property(manifest, "name");

  if (typeof packageName !== "string" || packageName.length === 0) {
    throw new Error("package.json name must be a non-empty string");
  }
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error("package.json version must be a semantic version");
  }

  const lockPackage = property(property(lock, "packages"), "");
  requireEqual(property(lock, "name"), packageName, "package-lock.json root name");
  requireEqual(property(lock, "version"), version, "package-lock.json root version");
  requireEqual(property(lockPackage, "name"), packageName, "package-lock.json package name");
  requireEqual(property(lockPackage, "version"), version, "package-lock.json package version");
  requireEqual(property(server, "name"), property(manifest, "mcpName"), "server.json name");
  requireEqual(property(server, "version"), version, "server.json version");

  const serverPackages = property(server, "packages");
  if (!Array.isArray(serverPackages)) throw new Error("server.json packages must be an array");
  const npmPackages = /** @type {unknown[]} */ (serverPackages).filter(
    (entry) => property(entry, "registryType") === "npm",
  );
  if (npmPackages.length !== 1) throw new Error("server.json must contain exactly one npm package");
  const npmPackage = npmPackages[0];
  requireEqual(property(npmPackage, "identifier"), packageName, "npm package identifier");
  requireEqual(property(npmPackage, "version"), version, "npm package version");
  requireEqual(
    property(property(npmPackage, "transport"), "type"),
    "stdio",
    "npm package transport",
  );

  const tag = releaseTag();
  if (tag) {
    const expectedTag = `v${version}`;
    if (tag !== expectedTag) {
      throw new Error(`tag ${tag} does not match package version ${version}`);
    }
    const notes = `docs/release-notes-${tag}.md`;
    if (!existsSync(resolve(root, notes))) throw new Error(`${notes} is required for ${tag}`);
  }

  console.log(`Release metadata verified: ${packageName}@${version}${tag ? ` (${tag})` : ""}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release metadata check failed: ${message}`);
  process.exitCode = 1;
}
