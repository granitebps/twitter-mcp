/**
 * Rettiwt-API provider — free, no Twitter developer account needed.
 *
 * Two sub-modes depending on whether RETTIWT_API_KEY is set:
 *  - Guest (no key): get_tweet and get_user_profile work without any credentials.
 *  - User (with key): all 4 tools work. The API key is base64-encoded Twitter
 *    session cookies — extract it once with the browser extension described in README.
 *
 * Get the key: https://rishikant181.github.io/Rettiwt-API/#authentication
 */

import { Rettiwt, TweetFilter } from "rettiwt-api";
import type { TwitterProvider, TweetData, ProfileData } from "./provider.js";

export class RettiwtProvider implements TwitterProvider {
  private client: Rettiwt;
  private hasApiKey: boolean;

  constructor() {
    const apiKey = process.env.RETTIWT_API_KEY;
    this.hasApiKey = Boolean(apiKey);
    this.client = apiKey ? new Rettiwt({ apiKey }) : new Rettiwt();
  }

  private requireAuth(toolName: string): void {
    if (!this.hasApiKey) {
      throw new Error(
        `${toolName} requires RETTIWT_API_KEY. Set it in .env — see README for how to generate it (free, uses your browser cookies).`
      );
    }
  }

  async getTweet(tweetId: string): Promise<TweetData> {
    const tweet = await this.client.tweet.details(tweetId);
    if (!tweet) throw new Error(`Tweet ${tweetId} not found`);

    return {
      id: tweet.id,
      text: tweet.fullText,
      created_at: tweet.createdAt,
      author: tweet.tweetBy
        ? {
            name: tweet.tweetBy.fullName,
            username: tweet.tweetBy.userName,
            verified: tweet.tweetBy.isVerified,
          }
        : null,
      metrics: {
        likes: tweet.likeCount ?? 0,
        retweets: tweet.retweetCount ?? 0,
        replies: tweet.replyCount ?? 0,
        quotes: tweet.quoteCount ?? 0,
        bookmarks: tweet.bookmarkCount ?? 0,
        views: tweet.viewCount ?? 0,
      },
    };
  }

  async getTweetReplies(tweetId: string, maxResults: number): Promise<TweetData[]> {
    this.requireAuth("get_tweet_replies");
    const result = await this.client.tweet.replies(tweetId);

    return (result.list ?? []).slice(0, maxResults).map((t) => ({
      id: t.id,
      text: t.fullText,
      created_at: t.createdAt,
      author: t.tweetBy
        ? { name: t.tweetBy.fullName, username: t.tweetBy.userName }
        : null,
      metrics: {
        likes: t.likeCount ?? 0,
        retweets: t.retweetCount ?? 0,
        replies: t.replyCount ?? 0,
        quotes: t.quoteCount ?? 0,
        bookmarks: t.bookmarkCount ?? 0,
        views: t.viewCount ?? 0,
      },
    }));
  }

  async getUserProfile(username: string): Promise<ProfileData> {
    const user = await this.client.user.details(username);
    if (!user) throw new Error(`User @${username} not found`);

    return {
      id: user.id,
      name: user.fullName,
      username: user.userName,
      description: user.description,
      created_at: user.createdAt,
      verified: user.isVerified,
      profile_image_url: user.profileImage,
      location: user.location,
      metrics: {
        followers_count: user.followersCount,
        following_count: user.followingsCount,
        tweet_count: user.statusesCount,
        listed_count: 0, // rettiwt-api does not expose listedCount on the User object
        likes_count: user.likeCount,
      },
    };
  }

  async searchTweets(query: string, maxResults: number): Promise<TweetData[]> {
    this.requireAuth("search_tweets");

    // Parse the query string into a TweetFilter:
    //   from:username  → fromUsers
    //   #hashtag       → hashtags
    //   @mention       → mentions
    //   remaining text → includeWords
    const fromUsers: string[] = [];
    const hashtags: string[] = [];
    const mentions: string[] = [];
    const words: string[] = [];

    for (const token of query.split(/\s+/).filter(Boolean)) {
      if (token.startsWith("from:")) fromUsers.push(token.slice(5));
      else if (token.startsWith("#")) hashtags.push(token.slice(1));
      else if (token.startsWith("@")) mentions.push(token.slice(1));
      else words.push(token);
    }

    const filter = new TweetFilter({
      ...(fromUsers.length && { fromUsers }),
      ...(hashtags.length && { hashtags }),
      ...(mentions.length && { mentions }),
      ...(words.length && { includeWords: words }),
    });

    const result = await this.client.tweet.search(filter, maxResults);

    return (result.list ?? []).map((t) => ({
      id: t.id,
      text: t.fullText,
      created_at: t.createdAt,
      author: t.tweetBy
        ? {
            name: t.tweetBy.fullName,
            username: t.tweetBy.userName,
            verified: t.tweetBy.isVerified,
          }
        : null,
      metrics: {
        likes: t.likeCount ?? 0,
        retweets: t.retweetCount ?? 0,
        replies: t.replyCount ?? 0,
        quotes: t.quoteCount ?? 0,
        bookmarks: t.bookmarkCount ?? 0,
        views: t.viewCount ?? 0,
      },
    }));
  }
}
