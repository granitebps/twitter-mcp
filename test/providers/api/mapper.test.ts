import { describe, expect, it } from "vitest";

import { mapApiTweet, mapApiUser } from "../../../src/providers/api/mapper.js";

describe("official API mappers", () => {
  it("looks up the tweet author by author_id", () => {
    const users = new Map([
      ["other", { id: "other", name: "Other", username: "other" }],
      ["author-1", { id: "author-1", name: "Author", username: "author", verified: true }],
    ]);

    expect(
      mapApiTweet(
        {
          id: "tweet-1",
          text: "hello",
          author_id: "author-1",
          public_metrics: { like_count: 2 },
        },
        users,
      ),
    ).toMatchObject({
      author: { name: "Author", username: "author", verified: true },
      metrics: { likes: 2, retweets: 0, replies: 0, quotes: 0, bookmarks: 0 },
    });
  });

  it("normalizes an API user", () => {
    expect(
      mapApiUser({
        id: "user-1",
        name: "Example",
        username: "example",
        verified: false,
        public_metrics: { followers_count: 3, following_count: 4, tweet_count: 5 },
      }),
    ).toMatchObject({
      id: "user-1",
      username: "example",
      metrics: { followers_count: 3, following_count: 4, tweet_count: 5, listed_count: 0 },
    });
  });
});
