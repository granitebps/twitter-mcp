import { describe, expect, it } from "vitest";

import {
  getTweetRepliesInputSchema,
  normalizeUsername,
  parseTweetReference,
  searchTweetsInputSchema,
} from "../../src/server/input.js";

describe("parseTweetReference", () => {
  it.each([
    ["1234567890123456789", "1234567890123456789"],
    ["https://x.com/example/status/1234567890123456789", "1234567890123456789"],
    ["https://twitter.com/example/status/1234567890123456789?s=20", "1234567890123456789"],
  ])("parses %s", (input, expected) => {
    expect(parseTweetReference(input)).toBe(expected);
  });

  it.each(["", "abc1234567890123456789def", "https://example.com/status/1234567890123456789"])(
    "rejects %s",
    (input) => {
      expect(() => parseTweetReference(input)).toThrow("valid X post ID or URL");
    },
  );
});

describe("normalizeUsername", () => {
  it("removes one leading at sign", () => {
    expect(normalizeUsername("@TwitterDev")).toBe("TwitterDev");
  });

  it.each(["", "@", "two words", "name/with/slash", "a".repeat(16)])("rejects %s", (input) => {
    expect(() => normalizeUsername(input)).toThrow("valid X username");
  });
});

describe("collection inputs", () => {
  it("applies the existing max_results default", () => {
    expect(getTweetRepliesInputSchema.parse({ tweet_id: "1234567890" }).max_results).toBe(10);
  });

  it("requires an integer result count", () => {
    expect(() =>
      getTweetRepliesInputSchema.parse({ tweet_id: "1234567890", max_results: 1.5 }),
    ).toThrow();
  });

  it("rejects blank search queries", () => {
    expect(() => searchTweetsInputSchema.parse({ query: "   " })).toThrow();
  });
});
