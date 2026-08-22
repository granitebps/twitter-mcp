import { spawnSync } from "node:child_process";

const packed = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (packed.status !== 0) {
  process.stderr.write(packed.stderr);
  process.exit(packed.status ?? 1);
}

/**
 * @param {unknown} value
 * @returns {value is { path: string }}
 */
function isPackFile(value) {
  return (
    typeof value === "object" && value !== null && "path" in value && typeof value.path === "string"
  );
}

/**
 * @param {unknown} value
 * @returns {value is { files: Array<{ path: string }> }}
 */
function isPackEntry(value) {
  if (typeof value !== "object" || value === null || !("files" in value)) return false;
  if (!Array.isArray(value.files)) return false;
  const files = /** @type {unknown[]} */ (value.files);
  return files.every(isPackFile);
}

/**
 * @param {unknown} value
 * @returns {value is Array<{ files: Array<{ path: string }> }>}
 */
function isPackReport(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  const entries = /** @type {unknown[]} */ (value);
  return entries.every(isPackEntry);
}

/** @type {unknown} */
const report = JSON.parse(packed.stdout);
if (!isPackReport(report)) {
  console.error("npm pack returned an invalid report");
  process.exit(1);
}
const files = report[0].files.map((entry) => entry.path);
const required = [
  "dist/cli.js",
  "dist/index.js",
  "LICENSE",
  "package.json",
  "README.md",
  "server.json",
];
const approvedRootFiles = new Set(["LICENSE", "package.json", "README.md", "server.json"]);
const staleDistFiles = [
  "dist/api-provider.js",
  "dist/provider.js",
  "dist/rettiwt-provider.js",
  "dist/scraper-provider.js",
];

const missing = required.filter((path) => !files.includes(path));
const unexpected = files.filter(
  (path) => !path.startsWith("dist/") && !approvedRootFiles.has(path),
);
const stale = staleDistFiles.filter((path) => files.includes(path));

if (missing.length || unexpected.length || stale.length) {
  if (missing.length) console.error(`Missing package files: ${missing.join(", ")}`);
  if (unexpected.length) console.error(`Unexpected package files: ${unexpected.join(", ")}`);
  if (stale.length) console.error(`Stale package files: ${stale.join(", ")}`);
  process.exit(1);
}

console.log(`Package contents verified: ${files.length} files`);
