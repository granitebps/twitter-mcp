import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";

import type { RuntimeConfig } from "../../src/config/env.js";
import type { Tweet, TweetPage, UserProfile } from "../../src/domain/schemas.js";
import type {
  GetProfileRequest,
  GetRepliesRequest,
  GetTweetRequest,
  RequestContext,
  SearchTweetsRequest,
} from "../../src/domain/requests.js";
import { TwitterError } from "../../src/errors/twitter-error.js";
import type { TwitterProvider } from "../../src/providers/provider.js";
import { createTwitterServer } from "../../src/server/create-server.js";

const tweet: Tweet = {
  id: "1234567890123456789",
  text: "hello",
  author: { name: "Example", username: "example", verified: false },
  metrics: { likes: 1, retweets: 2, replies: 3, quotes: 4, bookmarks: 5, views: 6 },
};

const page: TweetPage = { items: [tweet], nextCursor: "next" };

const profile: UserProfile = {
  id: "42",
  name: "Example",
  username: "example",
  verified: false,
  metrics: {
    followers_count: 10,
    following_count: 20,
    tweet_count: 30,
    listed_count: 40,
  },
};

const config: RuntimeConfig = {
  mode: "rettiwt",
  apiKey: "test-key",
  requestTimeoutMs: 1_000,
};

interface Calls {
  tweet?: { request: GetTweetRequest; context: RequestContext };
  replies?: { request: GetRepliesRequest; context: RequestContext };
  profile?: { request: GetProfileRequest; context: RequestContext };
  search?: { request: SearchTweetsRequest; context: RequestContext };
}

function fakeProvider(calls: Calls, tweetError?: TwitterError): TwitterProvider {
  return {
    capabilities: {
      provider: "rettiwt",
      authenticated: true,
      operations: {
        getTweet: true,
        getTweetReplies: true,
        getUserProfile: true,
        searchTweets: true,
      },
      pagination: { replies: true, search: true },
      limits: { replies: 100, search: 100 },
    },
    async getTweet(request, context) {
      calls.tweet = { request, context };
      if (tweetError) throw tweetError;
      return tweet;
    },
    async getTweetReplies(request, context) {
      calls.replies = { request, context };
      return page;
    },
    async getUserProfile(request, context) {
      calls.profile = { request, context };
      return profile;
    },
    async searchTweets(request, context) {
      calls.search = { request, context };
      return page;
    },
  };
}

const openClients: Client[] = [];

async function connect(provider: TwitterProvider): Promise<Client> {
  const server = createTwitterServer({ config, provider, version: "1.2.3" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "twitter-mcp-test", version: "1.0.0" });
  openClients.push(client);

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

afterEach(async () => {
  await Promise.all(openClients.splice(0).map((client) => client.close()));
});

describe("Twitter MCP server", () => {
  it("lists the compatible tools with schemas and read-only annotations", async () => {
    const client = await connect(fakeProvider({}));
    const listed = await client.listTools();

    expect(listed.tools.map((tool) => tool.name)).toEqual([
      "get_tweet",
      "get_tweet_replies",
      "get_user_profile",
      "search_tweets",
      "get_server_info",
    ]);
    for (const tool of listed.tools) {
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.outputSchema?.type).toBe("object");
      expect(tool.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      });
    }
  });

  it("returns structured and JSON text output for a tweet", async () => {
    const calls: Calls = {};
    const client = await connect(fakeProvider(calls));
    const before = Date.now();

    const result = await client.callTool({
      name: "get_tweet",
      arguments: { tweet_id: "https://x.com/example/status/1234567890123456789" },
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ tweet });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(tweet, null, 2) }]);
    expect(calls.tweet?.request).toEqual({ tweetId: tweet.id });
    expect(calls.tweet?.context.signal.aborted).toBe(false);
    expect(calls.tweet?.context.deadline).toBeGreaterThanOrEqual(before + 900);
  });

  it("preserves collection text while exposing page metadata structurally", async () => {
    const calls: Calls = {};
    const client = await connect(fakeProvider(calls));

    const replies = await client.callTool({
      name: "get_tweet_replies",
      arguments: { tweet_id: tweet.id, max_results: 7 },
    });
    const search = await client.callTool({
      name: "search_tweets",
      arguments: { query: "from:example MCP", max_results: 8 },
    });

    expect(replies.structuredContent).toEqual(page);
    expect(replies.content).toEqual([{ type: "text", text: JSON.stringify(page.items, null, 2) }]);
    expect(calls.replies?.request).toEqual({ tweetId: tweet.id, maxResults: 7 });
    expect(search.structuredContent).toEqual(page);
    expect(search.content).toEqual([{ type: "text", text: JSON.stringify(page.items, null, 2) }]);
    expect(calls.search?.request).toEqual({ query: "from:example MCP", maxResults: 8 });
  });

  it("normalizes usernames and returns profile output", async () => {
    const calls: Calls = {};
    const client = await connect(fakeProvider(calls));

    const result = await client.callTool({
      name: "get_user_profile",
      arguments: { username: "@example" },
    });

    expect(result.structuredContent).toEqual({ profile });
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(profile, null, 2) }]);
    expect(calls.profile?.request).toEqual({ username: "example" });
  });

  it("returns provider capabilities and the package version", async () => {
    const client = await connect(fakeProvider({}));

    const result = await client.callTool({ name: "get_server_info", arguments: {} });

    expect(result.structuredContent).toMatchObject({
      name: "twitter-mcp",
      version: "1.2.3",
      mode: "rettiwt",
      authenticated: true,
      provider: "rettiwt",
      tools: ["get_tweet", "get_tweet_replies", "get_user_profile", "search_tweets"],
    });
    expect(JSON.parse(result.content[0]?.type === "text" ? result.content[0].text : "")).toEqual(
      result.structuredContent,
    );
  });

  it("returns stable safe tool errors", async () => {
    const client = await connect(
      fakeProvider(
        {},
        new TwitterError({
          code: "RATE_LIMITED",
          safeMessage: "X request rate limit reached",
          provider: "rettiwt",
          retryable: true,
          retryAfterSeconds: 30,
        }),
      ),
    );

    const result = await client.callTool({ name: "get_tweet", arguments: { tweet_id: tweet.id } });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "X request rate limit reached",
        provider: "rettiwt",
        retryable: true,
        retryAfterSeconds: 30,
      },
    });
    expect(result.content).toEqual([
      { type: "text", text: "RATE_LIMITED: X request rate limit reached" },
    ]);
  });
});
