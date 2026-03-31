#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import dotenv from "dotenv";
import { createRequire } from "module";

import type { TwitterProvider } from "./provider.js";
import { ApiProvider } from "./api-provider.js";
import { ScraperProvider } from "./scraper-provider.js";
import { RettiwtProvider } from "./rettiwt-provider.js";

dotenv.config();

// Read version dynamically from package.json so it always stays in sync
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const MODE = (process.env.TWITTER_MODE ?? "scraper").toLowerCase();

function createProvider(): TwitterProvider {
  if (MODE === "scraper") {
    console.error("[twitter-mcp] Using scraper mode (free, requires Twitter login credentials)");
    return new ScraperProvider();
  }
  if (MODE === "rettiwt") {
    const hasKey = Boolean(process.env.RETTIWT_API_KEY);
    console.error(`[twitter-mcp] Using rettiwt mode (free${hasKey ? ", user auth" : ", guest — limited to get_tweet & get_user_profile"})`);
    return new RettiwtProvider();
  }
  console.error("[twitter-mcp] Using API mode (official Twitter API v2)");
  return new ApiProvider();
}

const provider = createProvider();

const server = new McpServer({
  name: "twitter-mcp",
  version: pkg.version,
  description:
    "MCP server for fetching Twitter/X data. Supports official API, free scraper, and rettiwt modes.",
});

// Helper to wrap tool handlers with error handling
function wrapHandler<T>(fn: (args: T) => Promise<unknown>) {
  return async (args: T) => {
    try {
      const result = await fn(args);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (error: unknown) {
      const raw = error instanceof Error ? error.message : String(error);
      // Strip noisy library prefixes (e.g. rettiwt: "Failed to initialize ClientTransaction: Error: ...")
      const message = raw.replace(/^Failed to \w+ \w+:\s*/i, "").replace(/^Error:\s*/, "");
      return {
        content: [{ type: "text" as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  };
}

// --- Tool schemas ---
// tweet_id accepts either a bare numeric ID or a full tweet URL
function extractTweetId(value: string): string {
  return value.match(/(\d{10,20})/)?.[1] ?? value;
}

const getTweetSchema = z.object({
  tweet_id: z.string().describe("Tweet ID or full tweet URL (e.g. https://x.com/user/status/123)"),
});

const getTweetRepliesSchema = z.object({
  tweet_id: z.string().describe("Tweet ID or full tweet URL"),
  max_results: z.number().min(1).max(100).default(10).describe("Number of replies to return"),
});

const getUserProfileSchema = z.object({
  username: z.string().describe("Twitter username (without @)"),
});

const searchTweetsSchema = z.object({
  query: z.string().describe("Search query — supports Twitter operators like #hashtag, @user, from:user, lang:en"),
  max_results: z.number().min(1).max(100).default(10).describe("Number of tweets to return"),
});

// --- Register tools ---
server.registerTool(
  "get_tweet",
  {
    description: "Get a single tweet by ID with full metrics (likes, retweets, replies, quotes, bookmarks, views)",
    inputSchema: getTweetSchema.shape,
  },
  wrapHandler((args: z.infer<typeof getTweetSchema>) =>
    provider.getTweet(extractTweetId(args.tweet_id))
  )
);

server.registerTool(
  "get_tweet_replies",
  {
    description: "Get replies to a specific tweet",
    inputSchema: getTweetRepliesSchema.shape,
  },
  wrapHandler((args: z.infer<typeof getTweetRepliesSchema>) =>
    provider.getTweetReplies(extractTweetId(args.tweet_id), args.max_results)
  )
);

server.registerTool(
  "get_user_profile",
  {
    description: "Get a user's full profile including created date, verified/blue tick status, follower/following counts",
    inputSchema: getUserProfileSchema.shape,
  },
  wrapHandler((args: z.infer<typeof getUserProfileSchema>) =>
    provider.getUserProfile(args.username)
  )
);

server.registerTool(
  "search_tweets",
  {
    description: "Search recent tweets by keyword, hashtag, or advanced query (e.g. '#ai lang:en', 'from:elonmusk')",
    inputSchema: searchTweetsSchema.shape,
  },
  wrapHandler((args: z.infer<typeof searchTweetsSchema>) =>
    provider.searchTweets(args.query, args.max_results)
  )
);

server.registerTool(
  "get_server_info",
  {
    description: "Get the active mode, version, and authentication status of this Twitter MCP server",
    inputSchema: {},
  },
  async () => ({
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        name: "twitter-mcp",
        version: pkg.version,
        mode: MODE,
        authenticated: MODE === "rettiwt"
          ? Boolean(process.env.RETTIWT_API_KEY)
          : MODE === "scraper"
          ? Boolean(process.env.TWITTER_USERNAME)
          : Boolean(process.env.TWITTER_BEARER_TOKEN ?? process.env.TWITTER_API_KEY),
        tools: ["get_tweet", "get_tweet_replies", "get_user_profile", "search_tweets"],
      }, null, 2),
    }],
  })
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[twitter-mcp] Twitter MCP server running on stdio");
}

main().catch((error) => {
  console.error("[twitter-mcp] Fatal error:", error);
  process.exit(1);
});

