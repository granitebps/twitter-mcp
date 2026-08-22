import { describe, expect, it, vi } from "vitest";

import { RettiwtProvider } from "../../../src/providers/rettiwt/provider.js";
import { providerContract, type ContractErrorCode } from "../contract.js";

const context = () => ({ signal: new AbortController().signal, deadline: Date.now() + 1_000 });

function tweet(id: string) {
  return {
    id,
    fullText: `tweet-${id}`,
    createdAt: "2026-08-22T00:00:00.000Z",
    tweetBy: {
      fullName: "Example",
      userName: "example",
      isVerified: false,
    },
  };
}

function client() {
  return {
    tweet: {
      details: vi.fn(),
      replies: vi.fn(),
      search: vi.fn(),
    },
    user: { details: vi.fn() },
  };
}

providerContract({
  name: "Rettiwt",
  providerName: "rettiwt",
  createProvider() {
    const fake = client();
    fake.tweet.details.mockResolvedValue(tweet("1"));
    fake.tweet.replies.mockResolvedValue({
      list: [tweet("1"), tweet("2"), tweet("3")],
      next: "next-replies",
    });
    fake.tweet.search.mockResolvedValue({
      list: [tweet("1"), tweet("2"), tweet("3")],
      next: "next-search",
    });
    fake.user.details.mockResolvedValue({
      id: "42",
      fullName: "Example",
      userName: "example",
      isVerified: false,
    });
    return new RettiwtProvider(fake);
  },
  createErrorProvider(code: ContractErrorCode) {
    const fake = client();
    if (code === "NOT_FOUND") fake.tweet.details.mockResolvedValue(undefined);
    else if (code === "AUTH_FAILED") fake.tweet.details.mockRejectedValue(new Error("401 auth"));
    else if (code === "RATE_LIMITED") {
      fake.tweet.details.mockRejectedValue(new Error("429 rate limit"));
    } else fake.tweet.details.mockRejectedValue(new Error("request timeout"));
    return new RettiwtProvider(fake);
  },
});

describe("RettiwtProvider", () => {
  it("returns NOT_FOUND when tweet details are absent", async () => {
    const fake = client();
    fake.tweet.details.mockResolvedValue(undefined);
    const provider = new RettiwtProvider(fake);

    await expect(provider.getTweet({ tweetId: "123" }, context())).rejects.toMatchObject({
      code: "NOT_FOUND",
      provider: "rettiwt",
      retryable: false,
    });
  });

  it("limits replies and preserves the next cursor", async () => {
    const fake = client();
    fake.tweet.replies.mockResolvedValue({
      list: [tweet("1"), tweet("2"), tweet("3")],
      next: "next-page",
    });
    const provider = new RettiwtProvider(fake);

    await expect(
      provider.getTweetReplies({ tweetId: "123", maxResults: 2 }, context()),
    ).resolves.toMatchObject({
      items: [{ id: "1" }, { id: "2" }],
      nextCursor: "next-page",
    });
  });

  it("translates supported search operators and warns about unsupported ones", async () => {
    const fake = client();
    fake.tweet.search.mockResolvedValue({ list: [], next: "" });
    const provider = new RettiwtProvider(fake);

    const result = await provider.searchTweets(
      { query: "hello from:TwitterDev lang:en since:2026-01-01 #mcp @openai", maxResults: 5 },
      context(),
    );

    expect(fake.tweet.search).toHaveBeenCalledWith(
      expect.objectContaining({
        includeWords: ["hello"],
        fromUsers: ["TwitterDev"],
        language: "en",
        hashtags: ["mcp"],
        mentions: ["openai"],
      }),
      5,
    );
    expect(result.warnings).toEqual([
      { code: "UNSUPPORTED_SEARCH_OPERATOR", message: "Ignored search operator: since:2026-01-01" },
    ]);
  });
});
