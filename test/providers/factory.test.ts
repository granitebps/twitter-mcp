import { describe, expect, it } from "vitest";

import type { TwitterProvider } from "../../src/providers/provider.js";
import { createProvider } from "../../src/providers/factory.js";

function providerNamed(provider: "rettiwt" | "api"): TwitterProvider {
  return {
    capabilities: {
      provider,
      authenticated: true,
      pagination: { replies: false, search: false },
      limits: { replies: 100, search: 100 },
      operations: {
        getTweet: true,
        getTweetReplies: true,
        getUserProfile: true,
        searchTweets: true,
      },
    },
    getTweet: async () => {
      throw new Error("unused");
    },
    getTweetReplies: async () => {
      throw new Error("unused");
    },
    getUserProfile: async () => {
      throw new Error("unused");
    },
    searchTweets: async () => {
      throw new Error("unused");
    },
  };
}

describe("createProvider", () => {
  it("loads only the configured Rettiwt provider", async () => {
    const expected = providerNamed("rettiwt");
    const provider = await createProvider(
      {
        mode: "rettiwt",
        apiKey: "key",
        requestTimeoutMs: 1_000,
      },
      {
        rettiwt: async () => expected,
        api: async () => {
          throw new Error("official API loader must not run");
        },
      },
    );

    expect(provider).toBe(expected);
  });

  it("loads only the configured official API provider", async () => {
    const expected = providerNamed("api");
    const provider = await createProvider(
      {
        mode: "api",
        credentials: { type: "bearer", token: "token" },
        requestTimeoutMs: 1_000,
      },
      {
        rettiwt: async () => {
          throw new Error("Rettiwt loader must not run");
        },
        api: async () => expected,
      },
    );

    expect(provider).toBe(expected);
  });
});
