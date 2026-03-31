import { TwitterApi } from "twitter-api-v2";
import type { TwitterProvider, TweetData, ProfileData } from "./provider.js";

export class ApiProvider implements TwitterProvider {
  private readClient: TwitterApi;

  constructor() {
    const {
      TWITTER_API_KEY,
      TWITTER_API_SECRET,
      TWITTER_ACCESS_TOKEN,
      TWITTER_ACCESS_SECRET,
      TWITTER_BEARER_TOKEN,
    } = process.env;

    if (TWITTER_BEARER_TOKEN) {
      this.readClient = new TwitterApi(TWITTER_BEARER_TOKEN);
    } else if (
      TWITTER_API_KEY && TWITTER_API_SECRET &&
      TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET
    ) {
      this.readClient = new TwitterApi({
        appKey: TWITTER_API_KEY,
        appSecret: TWITTER_API_SECRET,
        accessToken: TWITTER_ACCESS_TOKEN,
        accessSecret: TWITTER_ACCESS_SECRET,
      });
    } else {
      throw new Error(
        "API mode requires TWITTER_BEARER_TOKEN or full OAuth credentials (TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)"
      );
    }
  }

  async getTweet(tweetId: string): Promise<TweetData> {
    const tweet = await this.readClient.v2.singleTweet(tweetId, {
      "tweet.fields": ["created_at", "public_metrics", "author_id", "conversation_id", "text"],
      expansions: ["author_id"],
      "user.fields": ["name", "username", "verified"],
    });

    const author = tweet.includes?.users?.[0];
    const m = tweet.data.public_metrics;

    return {
      id: tweet.data.id,
      text: tweet.data.text,
      created_at: tweet.data.created_at,
      author: author
        ? { name: author.name, username: author.username, verified: author.verified }
        : null,
      metrics: {
        likes: m?.like_count ?? 0,
        retweets: m?.retweet_count ?? 0,
        replies: m?.reply_count ?? 0,
        quotes: m?.quote_count ?? 0,
        bookmarks: m?.bookmark_count ?? 0,
      },
    };
  }

  async getTweetReplies(tweetId: string, maxResults: number): Promise<TweetData[]> {
    // Twitter v2 API requires max_results to be between 10 and 100
    const clampedMax = Math.max(10, Math.min(maxResults, 100));
    const replies = await this.readClient.v2.search(
      `conversation_id:${tweetId} is:reply`,
      {
        max_results: clampedMax,
        "tweet.fields": ["created_at", "public_metrics", "author_id"],
        expansions: ["author_id"],
        "user.fields": ["name", "username"],
      }
    );

    const usersMap = new Map(replies.includes?.users?.map((u) => [u.id, u]) ?? []);

    return (replies.data.data ?? []).map((t) => {
      const author = usersMap.get(t.author_id ?? "");
      return {
        id: t.id,
        text: t.text,
        created_at: t.created_at,
        author: author ? { name: author.name, username: author.username } : null,
        metrics: {
          likes: t.public_metrics?.like_count ?? 0,
          retweets: t.public_metrics?.retweet_count ?? 0,
          replies: t.public_metrics?.reply_count ?? 0,
          quotes: 0,
          bookmarks: 0,
        },
      };
    });
  }

  async getUserProfile(username: string): Promise<ProfileData> {
    const user = await this.readClient.v2.userByUsername(username, {
      "user.fields": [
        "name", "username", "description", "created_at", "verified",
        "profile_image_url", "public_metrics", "location", "url",
      ],
    });

    if (!user.data) throw new Error(`User @${username} not found`);
    const u = user.data;

    return {
      id: u.id,
      name: u.name,
      username: u.username,
      description: u.description,
      created_at: u.created_at,
      verified: u.verified ?? false,
      profile_image_url: u.profile_image_url,
      location: u.location,
      url: u.url,
      metrics: {
        followers_count: u.public_metrics?.followers_count ?? 0,
        following_count: u.public_metrics?.following_count ?? 0,
        tweet_count: u.public_metrics?.tweet_count ?? 0,
        listed_count: u.public_metrics?.listed_count ?? 0,
      },
    };
  }

  async searchTweets(query: string, maxResults: number): Promise<TweetData[]> {
    const result = await this.readClient.v2.search(query, {
      max_results: maxResults,
      "tweet.fields": ["created_at", "public_metrics", "author_id"],
      expansions: ["author_id"],
      "user.fields": ["name", "username", "verified"],
    });

    const usersMap = new Map(result.includes?.users?.map((u) => [u.id, u]) ?? []);

    return (result.data.data ?? []).map((t) => {
      const author = usersMap.get(t.author_id ?? "");
      return {
        id: t.id,
        text: t.text,
        created_at: t.created_at,
        author: author
          ? { name: author.name, username: author.username, verified: author.verified ?? false }
          : null,
        metrics: {
          likes: t.public_metrics?.like_count ?? 0,
          retweets: t.public_metrics?.retweet_count ?? 0,
          replies: t.public_metrics?.reply_count ?? 0,
          quotes: t.public_metrics?.quote_count ?? 0,
          bookmarks: t.public_metrics?.bookmark_count ?? 0,
        },
      };
    });
  }
}
