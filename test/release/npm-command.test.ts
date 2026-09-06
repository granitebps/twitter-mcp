import { expect, it } from "vitest";

import { npmCommand } from "../../scripts/npm-command.mjs";

it("runs npm through Node instead of a platform-specific shim", () => {
  const command = npmCommand(["pack", "--json"], {
    npm_execpath: "C:\\node\\npm-cli.js",
  });

  expect(command).toEqual({
    command: process.execPath,
    args: ["C:\\node\\npm-cli.js", "pack", "--json"],
  });
});

it("rejects npm execution outside an npm script", () => {
  expect(() => npmCommand(["ci"], {})).toThrow("npm_execpath is required");
});
