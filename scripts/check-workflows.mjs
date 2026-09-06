import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const checkout = "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6";
const setupNode = "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6";
/** @type {string[]} */
const errors = [];

/**
 * @param {string} name
 * @returns {string}
 */
function read(name) {
  const path = resolve(name);
  if (!existsSync(path)) {
    errors.push(`${name} is missing`);
    return "";
  }
  return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

/**
 * @param {string} text
 * @param {string} value
 * @param {string} label
 */
function requireText(text, value, label) {
  if (!text.includes(value)) errors.push(`${label} is missing ${JSON.stringify(value)}`);
}

/**
 * @param {string} text
 * @param {string[]} values
 * @param {string} label
 */
function requireOrder(text, values, label) {
  let cursor = -1;
  for (const value of values) {
    const index = text.indexOf(value, cursor + 1);
    if (index === -1) {
      errors.push(`${label} is missing ${JSON.stringify(value)}`);
      return;
    }
    if (index < cursor) {
      errors.push(`${label} has ${JSON.stringify(value)} out of order`);
      return;
    }
    cursor = index;
  }
}

/**
 * @param {string} text
 * @param {string} start
 * @param {string} end
 * @returns {string}
 */
function section(text, start, end) {
  const startIndex = text.indexOf(start);
  if (startIndex === -1) return "";
  const tail = text.slice(startIndex + start.length);
  if (!end) return tail;
  const endIndex = tail.indexOf(end);
  return endIndex === -1 ? tail : tail.slice(0, endIndex);
}

const ci = read(".github/workflows/ci.yml");
for (const [value, label] of [
  ["  workflow_call:\n", "CI reuse trigger"],
  ["permissions:\n  contents: read", "CI permissions"],
  ["  check:\n", "CI check job"],
  ["  package:\n", "CI package job"],
  ["  audit:\n", "CI audit job"],
  ["os: [macos-latest, windows-latest]", "CI package operating-system matrix"],
  ["node-version: 22.21.0", "CI Node version"],
  ["npm audit --omit=dev --audit-level=high", "CI production audit"],
  [checkout, "CI checkout pin"],
  [setupNode, "CI setup-node pin"],
]) {
  requireText(ci, value, label);
}

const release = read(".github/workflows/release.yml");
for (const [value, label] of [
  ['    tags: ["v*"]', "release tag trigger"],
  ["permissions:\n  contents: read", "release default permissions"],
  ["  ci:\n", "release CI job"],
  ["uses: ./.github/workflows/ci.yml", "release reusable CI"],
  ["  release-check:\n", "release preflight job"],
  ["  publish:\n", "release publishing job"],
  ["needs: [ci, release-check]", "release publishing dependencies"],
  ["contents: write", "release publishing contents permission"],
  ["id-token: write", "release publishing OIDC permission"],
  ["ref: ${{ github.sha }}", "release exact-commit checkout"],
  ["npm@11.19.1", "release npm CLI pin"],
  ["mcp-publisher_linux_amd64.tar.gz", "MCP Publisher archive pin"],
  [
    "a06c9096dcb9727c13555b6be26c7effa707b01f06a4c561ba7a3635443cf2cc",
    "MCP Publisher checksum pin",
  ],
  ["./mcp-publisher validate", "MCP Registry validation"],
  ["npm publish", "npm trusted publication"],
  ["./mcp-publisher login github-oidc", "MCP Registry OIDC login"],
  ['./mcp-publisher publish "$publication"', "MCP Registry publication document"],
  ["registry-server.json", "canonical MCP Registry publication document"],
  ["buildInfo.commit", "MCP Registry commit binding"],
  ["$value | @uri", "MCP Registry path encoding"],
  ["versions/$encoded_version", "MCP Registry exact-version endpoint"],
  ["node scripts/check-registry-entry.mjs", "complete MCP Registry metadata comparison"],
  ["docs/release-notes-${GITHUB_REF_NAME}.md", "version-specific release notes"],
  ["gh release create", "GitHub release publication"],
  [checkout, "release checkout pin"],
  [setupNode, "release setup-node pin"],
]) {
  requireText(release, value, label);
}

const publish = section(release, "\n  publish:\n", "");
requireText(
  publish,
  "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')",
  "tag-only publishing condition",
);
requireText(publish, "npm view", "npm rerun guard");
requireText(publish, "registry.modelcontextprotocol.io", "MCP Registry rerun guard");
if (publish.includes('--data-urlencode "search=')) {
  errors.push("MCP Registry rerun guard must not use substring search");
}
requireText(publish, "gh release view", "GitHub release rerun guard");
requireOrder(
  publish,
  ["npm publish", "./mcp-publisher publish", "gh release create"],
  "publication order",
);

for (const [name, workflow] of [
  ["CI", ci],
  ["release", release],
]) {
  if (/uses:\s+[^\n]+@v\d/.test(workflow)) {
    errors.push(`${name} workflow contains a mutable action version tag`);
  }
}

const preflight = section(release, "\n  release-check:\n", "\n  publish:\n");
if (/contents:\s+write|id-token:\s+write/.test(preflight)) {
  errors.push("release preflight must remain read-only");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`Workflow policy check failed: ${error}`);
  process.exitCode = 1;
} else {
  console.log("Workflow policy verified: CI, preflight, and tag-only publication");
}
