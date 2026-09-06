import { deepStrictEqual } from "node:assert";
import { readFileSync } from "node:fs";

/**
 * @param {string} name
 * @returns {string}
 */
function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

/**
 * @param {string} path
 * @returns {unknown}
 */
function readJSON(path) {
  return /** @type {unknown} */ (JSON.parse(readFileSync(path, "utf8")));
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

try {
  const expected = readJSON(option("--expected"));
  const response = readJSON(option("--actual"));
  const commit = option("--commit");
  const actual = property(response, "server");
  const publisherMetadata = property(
    property(expected, "_meta"),
    "io.modelcontextprotocol.registry/publisher-provided",
  );
  const expectedCommit = property(property(publisherMetadata, "buildInfo"), "commit");

  if (expectedCommit !== commit) {
    throw new Error("Registry publication document does not contain the triggering commit");
  }

  try {
    deepStrictEqual(actual, expected);
  } catch (error) {
    throw new Error("Registry entry does not match the approved publication document", {
      cause: error,
    });
  }

  console.log(`Registry entry verified for commit ${commit}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Registry entry check failed: ${message}`);
  process.exitCode = 1;
}
