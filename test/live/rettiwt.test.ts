import { Client } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { TweetPageSchema, TweetSchema, UserProfileSchema } from "../../src/domain/schemas.js";

const apiKey = process.env.RETTIWT_API_KEY;
const tweetId = process.env.TWITTER_LIVE_TWEET_ID;

if (!apiKey || !tweetId) {
  throw new Error("test:live requires RETTIWT_API_KEY and TWITTER_LIVE_TWEET_ID");
}

const TweetResultSchema = z.object({ tweet: TweetSchema });
const ProfileResultSchema = z.object({ profile: UserProfileSchema });

describe("live Rettiwt smoke test", () => {
  const transportErrors: Error[] = [];
  let client: Client;

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["dist/cli.js"],
      cwd: process.cwd(),
      env: {
        ...getDefaultEnvironment(),
        RETTIWT_API_KEY: apiKey,
        TWITTER_MODE: "rettiwt",
        TWITTER_REQUEST_TIMEOUT_MS: "60000",
      },
      stderr: "pipe",
    });
    transport.onerror = (error) => transportErrors.push(error);
    client = new Client({ name: "twitter-mcp-live-test", version: "1.0.0" });
    await client.connect(transport);
  });

  afterAll(async () => {
    await client?.close();
  });

  it("calls every Twitter tool through the compiled stdio server", async () => {
    const tweetCall = await client.callTool({
      name: "get_tweet",
      arguments: { tweet_id: tweetId },
    });
    expect(tweetCall.isError).not.toBe(true);
    const tweet = TweetResultSchema.parse(tweetCall.structuredContent).tweet;
    expect(tweet.id).toBe(tweetId);

    const username = tweet.author?.username;
    expect(username).toBeTruthy();
    if (!username) throw new Error("The live test tweet has no author username");

    const repliesCall = await client.callTool({
      name: "get_tweet_replies",
      arguments: { tweet_id: tweet.id, max_results: 1 },
    });
    expect(repliesCall.isError).not.toBe(true);
    TweetPageSchema.parse(repliesCall.structuredContent);

    const profileCall = await client.callTool({
      name: "get_user_profile",
      arguments: { username },
    });
    expect(profileCall.isError).not.toBe(true);
    const profile = ProfileResultSchema.parse(profileCall.structuredContent).profile;
    expect(profile.username.toLowerCase()).toBe(username.toLowerCase());

    const searchCall = await client.callTool({
      name: "search_tweets",
      arguments: { query: `from:${username}`, max_results: 1 },
    });
    expect(searchCall.isError).not.toBe(true);
    TweetPageSchema.parse(searchCall.structuredContent);
    expect(transportErrors).toEqual([]);
  });
});
