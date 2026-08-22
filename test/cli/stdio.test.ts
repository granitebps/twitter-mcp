import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { describe, expect, it } from "vitest";

describe("stdio CLI", () => {
  it("starts the built executable and serves MCP without corrupting stdout", async () => {
    const transportErrors: Error[] = [];
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["dist/cli.js"],
      cwd: process.cwd(),
      env: {
        ...getDefaultEnvironment(),
        TWITTER_MODE: "api",
        TWITTER_BEARER_TOKEN: "test-bearer-token",
      },
      stderr: "pipe",
    });
    transport.onerror = (error) => transportErrors.push(error);
    const client = new Client({ name: "twitter-mcp-cli-test", version: "1.0.0" });

    try {
      await client.connect(transport);
      const listed = await client.listTools();

      expect(client.getServerVersion()).toMatchObject({ name: "twitter-mcp", version: "1.0.0" });
      expect(listed.tools).toHaveLength(5);
      expect(transportErrors).toEqual([]);
    } finally {
      await client.close();
    }
  });
});
