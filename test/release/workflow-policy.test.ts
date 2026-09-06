import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { expect, it } from "vitest";

it("accepts workflows that enforce the release policy", () => {
  const result = spawnSync(process.execPath, [resolve("scripts/check-workflows.mjs")], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain("Workflow policy verified");
});
