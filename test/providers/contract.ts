import { describe, expect, it } from "vitest";

import { TweetPageSchema, TweetSchema, UserProfileSchema } from "../../src/domain/schemas.js";
import type { TwitterProvider } from "../../src/providers/provider.js";

export interface ProviderContractOptions {
  name: string;
  providerName: "rettiwt" | "api";
  createProvider(): TwitterProvider;
  createErrorProvider(code: ContractErrorCode): TwitterProvider;
}

export type ContractErrorCode = "NOT_FOUND" | "AUTH_FAILED" | "RATE_LIMITED" | "TIMEOUT";

const context = () => ({ signal: new AbortController().signal, deadline: Date.now() + 1_000 });

export function providerContract(options: ProviderContractOptions): void {
  const { name, providerName } = options;
  describe(`${name} provider contract`, () => {
    it("reports the operations and limits it implements", () => {
      const capabilities = options.createProvider().capabilities;

      expect(capabilities).toEqual({
        provider: providerName,
        authenticated: true,
        operations: {
          getTweet: true,
          getTweetReplies: true,
          getUserProfile: true,
          searchTweets: true,
        },
        pagination: { replies: true, search: true },
        limits: { replies: 100, search: 100 },
      });
    });

    it("returns canonical values from every operation", async () => {
      const provider = options.createProvider();
      const [tweet, replies, profile, search] = await Promise.all([
        provider.getTweet({ tweetId: "1" }, context()),
        provider.getTweetReplies({ tweetId: "1", maxResults: 2 }, context()),
        provider.getUserProfile({ username: "example" }, context()),
        provider.searchTweets({ query: "mcp", maxResults: 2 }, context()),
      ]);

      expect(TweetSchema.safeParse(tweet).success).toBe(true);
      expect(TweetPageSchema.safeParse(replies).success).toBe(true);
      expect(UserProfileSchema.safeParse(profile).success).toBe(true);
      expect(TweetPageSchema.safeParse(search).success).toBe(true);
      expect(replies.items).toHaveLength(2);
      expect(search.items).toHaveLength(2);
    });

    it.each<ContractErrorCode>(["NOT_FOUND", "AUTH_FAILED", "RATE_LIMITED", "TIMEOUT"])(
      "propagates %s with stable provider metadata",
      async (code) => {
        await expect(
          options.createErrorProvider(code).getTweet({ tweetId: "1" }, context()),
        ).rejects.toMatchObject({ code, provider: providerName });
      },
    );
  });
}
