import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";

describe("loadConfig", () => {
  it("defaults to authenticated Rettiwt", () => {
    expect(loadConfig({ RETTIWT_API_KEY: "cookie-key" })).toEqual({
      mode: "rettiwt",
      apiKey: "cookie-key",
      requestTimeoutMs: 30_000,
    });
  });

  it("accepts API bearer authentication", () => {
    expect(loadConfig({ TWITTER_MODE: "api", TWITTER_BEARER_TOKEN: "bearer" })).toEqual({
      mode: "api",
      credentials: { type: "bearer", token: "bearer" },
      requestTimeoutMs: 30_000,
    });
  });

  it("accepts a complete API OAuth credential set", () => {
    expect(
      loadConfig({
        TWITTER_MODE: "api",
        TWITTER_API_KEY: "key",
        TWITTER_API_SECRET: "secret",
        TWITTER_ACCESS_TOKEN: "token",
        TWITTER_ACCESS_SECRET: "access-secret",
      }),
    ).toMatchObject({
      mode: "api",
      credentials: { type: "oauth", appKey: "key", accessSecret: "access-secret" },
    });
  });

  it.each([
    [{}, "RETTIWT_API_KEY"],
    [{ TWITTER_MODE: "unknown" }, "TWITTER_MODE"],
    [{ TWITTER_MODE: "api", TWITTER_API_KEY: "partial" }, "complete OAuth"],
    [{ RETTIWT_API_KEY: "key", TWITTER_REQUEST_TIMEOUT_MS: "999" }, "TWITTER_REQUEST_TIMEOUT_MS"],
  ])("rejects invalid configuration", (env, message) => {
    expect(() => loadConfig(env)).toThrow(message);
  });
});
