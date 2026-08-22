#!/usr/bin/env node

import { readFileSync } from "node:fs";

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { config as loadDotenv } from "dotenv";

import { loadConfig } from "./config/env.js";
import { redactSecrets } from "./errors/twitter-error.js";
import { createProvider } from "./providers/factory.js";
import { createTwitterServer } from "./server/create-server.js";

function packageVersion(): string {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { version?: unknown };
  if (typeof manifest.version !== "string") throw new Error("Package version is missing");
  return manifest.version;
}

function reportFatal(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`twitter-mcp: ${redactSecrets(message)}`);
}

async function main(): Promise<void> {
  loadDotenv({ quiet: true });
  const runtimeConfig = loadConfig(process.env);
  const provider = await createProvider(runtimeConfig);
  const version = packageVersion();
  const handle = serveStdio(
    () => createTwitterServer({ config: runtimeConfig, provider, version }),
    { onerror: reportFatal },
  );

  const close = (): void => {
    void handle.close().catch(reportFatal);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

void main().catch((error: unknown) => {
  reportFatal(error);
  process.exitCode = 1;
});
