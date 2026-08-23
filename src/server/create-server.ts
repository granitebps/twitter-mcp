import { McpServer } from "@modelcontextprotocol/server";

import type { RuntimeConfig } from "../config/env.js";
import type { TwitterProvider } from "../providers/provider.js";
import { registerTwitterTools } from "./register-tools.js";

export interface CreateServerOptions {
  config: RuntimeConfig;
  provider: TwitterProvider;
  version: string;
}

export function createTwitterServer(options: CreateServerOptions): McpServer {
  const server = new McpServer(
    { name: "twitter-mcp", version: options.version },
    {
      instructions:
        "Use these tools to read public X data. Results can omit fields that the selected provider does not return. Call get_server_info to check the provider, limits, and pagination support.",
    },
  );
  registerTwitterTools(server, options);
  return server;
}
