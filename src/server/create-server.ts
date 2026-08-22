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
        "These tools read external X data. Field availability depends on the active provider. Call get_server_info to inspect provider capabilities.",
    },
  );
  registerTwitterTools(server, options);
  return server;
}
