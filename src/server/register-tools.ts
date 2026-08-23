import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { z } from "zod";

import type { RuntimeConfig } from "../config/env.js";
import { TweetPageSchema, TweetSchema, UserProfileSchema } from "../domain/schemas.js";
import type { RequestContext } from "../domain/requests.js";
import type { TwitterProvider } from "../providers/provider.js";
import {
  getTweetInputSchema,
  getTweetRepliesInputSchema,
  getUserProfileInputSchema,
  searchTweetsInputSchema,
} from "./input.js";
import { errorResult, objectResult, pageResult, profileResult, tweetResult } from "./output.js";

const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const tweetOutputSchema = z.object({ tweet: TweetSchema });
const profileOutputSchema = z.object({ profile: UserProfileSchema });
const pageOutputSchema = TweetPageSchema;
const providerCapabilitiesSchema = z.object({
  provider: z.enum(["rettiwt", "api"]),
  authenticated: z.boolean(),
  operations: z.object({
    getTweet: z.boolean(),
    getTweetReplies: z.boolean(),
    getUserProfile: z.boolean(),
    searchTweets: z.boolean(),
  }),
  pagination: z.object({ replies: z.boolean(), search: z.boolean() }),
  limits: z.object({ replies: z.number().int(), search: z.number().int() }),
});
const serverInfoOutputSchema = z.object({
  name: z.string(),
  version: z.string(),
  mode: z.enum(["rettiwt", "api"]),
  provider: z.enum(["rettiwt", "api"]),
  authenticated: z.boolean(),
  tools: z.array(z.string()),
  capabilities: providerCapabilitiesSchema,
});

const publicTools = [
  "get_tweet",
  "get_tweet_replies",
  "get_user_profile",
  "search_tweets",
] as const;

async function execute<T>(
  context: ServerContext,
  provider: TwitterProvider,
  timeoutMs: number,
  operation: (requestContext: RequestContext) => Promise<T>,
  format: (value: T) => CallToolResult,
): Promise<CallToolResult> {
  const controller = new AbortController();
  const deadline = Date.now() + timeoutMs;
  const cancel = () => controller.abort(context.mcpReq.signal.reason);
  const timeout = setTimeout(
    () => controller.abort(new Error("Request deadline exceeded")),
    timeoutMs,
  );

  if (context.mcpReq.signal.aborted) cancel();
  else context.mcpReq.signal.addEventListener("abort", cancel, { once: true });

  try {
    return format(await operation({ signal: controller.signal, deadline }));
  } catch (error) {
    return errorResult(error, provider.capabilities.provider);
  } finally {
    clearTimeout(timeout);
    context.mcpReq.signal.removeEventListener("abort", cancel);
  }
}

export interface RegisterToolsOptions {
  config: RuntimeConfig;
  provider: TwitterProvider;
  version: string;
}

export function registerTwitterTools(
  server: McpServer,
  { config, provider, version }: RegisterToolsOptions,
): void {
  server.registerTool(
    "get_tweet",
    {
      title: "Get tweet",
      description: "Fetch a public X post from its numeric ID or status URL.",
      inputSchema: getTweetInputSchema,
      outputSchema: tweetOutputSchema,
      annotations,
    },
    (input, context) =>
      execute(
        context,
        provider,
        config.requestTimeoutMs,
        (requestContext) => provider.getTweet({ tweetId: input.tweet_id }, requestContext),
        tweetResult,
      ),
  );

  server.registerTool(
    "get_tweet_replies",
    {
      title: "Get tweet replies",
      description: "Fetch replies to a public X post.",
      inputSchema: getTweetRepliesInputSchema,
      outputSchema: pageOutputSchema,
      annotations,
    },
    (input, context) =>
      execute(
        context,
        provider,
        config.requestTimeoutMs,
        (requestContext) =>
          provider.getTweetReplies(
            { tweetId: input.tweet_id, maxResults: input.max_results },
            requestContext,
          ),
        pageResult,
      ),
  );

  server.registerTool(
    "get_user_profile",
    {
      title: "Get user profile",
      description: "Fetch a public X profile by username.",
      inputSchema: getUserProfileInputSchema,
      outputSchema: profileOutputSchema,
      annotations,
    },
    (input, context) =>
      execute(
        context,
        provider,
        config.requestTimeoutMs,
        (requestContext) => provider.getUserProfile({ username: input.username }, requestContext),
        profileResult,
      ),
  );

  server.registerTool(
    "search_tweets",
    {
      title: "Search tweets",
      description: "Search public X posts. The selected provider determines which operators work.",
      inputSchema: searchTweetsInputSchema,
      outputSchema: pageOutputSchema,
      annotations,
    },
    (input, context) =>
      execute(
        context,
        provider,
        config.requestTimeoutMs,
        (requestContext) =>
          provider.searchTweets(
            { query: input.query, maxResults: input.max_results },
            requestContext,
          ),
        pageResult,
      ),
  );

  server.registerTool(
    "get_server_info",
    {
      title: "Get server info",
      description: "Show the server version, selected provider, limits, and supported operations.",
      inputSchema: z.object({}),
      outputSchema: serverInfoOutputSchema,
      annotations,
    },
    () =>
      objectResult({
        name: "twitter-mcp",
        version,
        mode: config.mode,
        provider: provider.capabilities.provider,
        authenticated: provider.capabilities.authenticated,
        tools: [...publicTools],
        capabilities: provider.capabilities,
      }),
  );
}
