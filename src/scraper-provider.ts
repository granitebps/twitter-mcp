import { Scraper, SearchMode } from "@the-convocation/twitter-scraper";
import type { TwitterProvider, TweetData, ProfileData } from "./provider.js";

async function collectAsync<T>(gen: AsyncGenerator<T> | AsyncIterable<T>, max: number): Promise<T[]> {
  const results: T[] = [];
  for await (const item of gen) {
    results.push(item);
    if (results.length >= max) break;
  }
  return results;
}

export class ScraperProvider implements TwitterProvider {
  private scraper: Scraper;
  private loggedIn = false;

  constructor() {
    this.scraper = new Scraper();
  }

  private async ensureLoggedIn(): Promise<void> {
    if (this.loggedIn) return;

    const { TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL } = process.env;
    if (!TWITTER_USERNAME || !TWITTER_PASSWORD) {
      throw new Error(
        "Scraper mode requires TWITTER_USERNAME and TWITTER_PASSWORD in .env"
      );
    }

    try {
      await this.scraper.login(TWITTER_USERNAME, TWITTER_PASSWORD, TWITTER_EMAIL);
      this.loggedIn = true;
    } catch (err) {
      // Reset scraper instance so the next call gets a fresh attempt
      this.scraper = new Scraper();
      throw err;
    }
  }

  async getTweet(tweetId: string): Promise<TweetData> {
    await this.ensureLoggedIn();
    const tweet = await this.scraper.getTweet(tweetId);
    if (!tweet) throw new Error(`Tweet ${tweetId} not found`);

    return {
      id: tweet.id ?? tweetId,
      text: tweet.text ?? "",
      created_at: tweet.timeParsed?.toISOString(),
      author: tweet.username
        ? { name: tweet.name ?? tweet.username, username: tweet.username }
        : null,
      metrics: {
        likes: tweet.likes ?? 0,
        retweets: tweet.retweets ?? 0,
        replies: tweet.replies ?? 0,
        quotes: 0,
        bookmarks: tweet.bookmarkCount ?? 0,
        views: tweet.views,
      },
    };
  }

  async getTweetReplies(tweetId: string, maxResults: number): Promise<TweetData[]> {
    await this.ensureLoggedIn();

    // Search for replies using conversation_id filter
    const tweets = await collectAsync(
      this.scraper.searchTweets(`conversation_id:${tweetId}`, maxResults, SearchMode.Latest),
      maxResults
    );

    // Exclude the original tweet itself; conversation_id search already scopes to the thread
    return tweets
      .filter((t) => t.id !== tweetId)
      .map((t) => ({
        id: t.id ?? "",
        text: t.text ?? "",
        created_at: t.timeParsed?.toISOString(),
        author: t.username
          ? { name: t.name ?? t.username, username: t.username }
          : null,
        metrics: {
          likes: t.likes ?? 0,
          retweets: t.retweets ?? 0,
          replies: t.replies ?? 0,
          quotes: 0,
          bookmarks: 0,
        },
      }));
  }

  async getUserProfile(username: string): Promise<ProfileData> {
    await this.ensureLoggedIn();
    const p = await this.scraper.getProfile(username);

    return {
      id: p.userId ?? "",
      name: p.name ?? "",
      username: p.username ?? username,
      description: p.biography,
      created_at: p.joined?.toISOString(),
      verified: p.isVerified ?? false,
      blue_verified: p.isBlueVerified ?? false,
      profile_image_url: p.avatar,
      location: p.location,
      url: p.website,
      metrics: {
        followers_count: p.followersCount ?? 0,
        following_count: p.followingCount ?? 0,
        tweet_count: p.tweetsCount ?? 0,
        listed_count: p.listedCount ?? 0,
        likes_count: p.likesCount ?? 0,
      },
    };
  }

  async searchTweets(query: string, maxResults: number): Promise<TweetData[]> {
    await this.ensureLoggedIn();
    const tweets = await collectAsync(
      this.scraper.searchTweets(query, maxResults, SearchMode.Top),
      maxResults
    );

    return tweets.map((t) => ({
      id: t.id ?? "",
      text: t.text ?? "",
      created_at: t.timeParsed?.toISOString(),
      author: t.username
        ? { name: t.name ?? t.username, username: t.username }
        : null,
      metrics: {
        likes: t.likes ?? 0,
        retweets: t.retweets ?? 0,
        replies: t.replies ?? 0,
        quotes: 0,
        bookmarks: t.bookmarkCount ?? 0,
        views: t.views,
      },
    }));
  }
}
