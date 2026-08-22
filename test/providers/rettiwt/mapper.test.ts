import { describe, expect, it } from "vitest";

import { mapRettiwtTweet, mapRettiwtUser } from "../../../src/providers/rettiwt/mapper.js";

describe("Rettiwt mappers", () => {
  it("normalizes a tweet and defaults missing metrics", () => {
    const result = mapRettiwtTweet({
      id: "123",
      fullText: "hello",
      createdAt: "2026-08-22T00:00:00.000Z",
      tweetBy: undefined,
    });

    expect(result).toEqual({
      id: "123",
      text: "hello",
      created_at: "2026-08-22T00:00:00.000Z",
      author: null,
      metrics: {
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        bookmarks: 0,
        views: 0,
      },
    });
  });

  it("normalizes a user", () => {
    const result = mapRettiwtUser({
      id: "user-1",
      fullName: "Example",
      userName: "example",
      createdAt: "2020-01-01T00:00:00.000Z",
      isVerified: true,
      followersCount: 10,
      followingsCount: 5,
      statusesCount: 20,
      likeCount: 30,
      profileImage: "https://example.com/avatar.jpg",
    });

    expect(result).toMatchObject({
      id: "user-1",
      username: "example",
      verified: true,
      metrics: {
        followers_count: 10,
        following_count: 5,
        tweet_count: 20,
        listed_count: 0,
        likes_count: 30,
      },
    });
  });
});
