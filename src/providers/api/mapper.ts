import type { Tweet, UserProfile } from "../../domain/schemas.js";

export interface ApiPublicMetricsLike {
  like_count?: number;
  retweet_count?: number;
  reply_count?: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
}

export interface ApiUserLike {
  id: string;
  name: string;
  username: string;
  description?: string;
  created_at?: string;
  verified?: boolean;
  profile_image_url?: string;
  location?: string;
  url?: string;
  public_metrics?: ApiPublicMetricsLike;
}

export interface ApiTweetLike {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: ApiPublicMetricsLike;
}

export function mapApiTweet(
  tweet: ApiTweetLike,
  users: ReadonlyMap<string, ApiUserLike> = new Map(),
): Tweet {
  const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
  const metrics = tweet.public_metrics;

  return {
    id: tweet.id,
    text: tweet.text,
    ...(tweet.created_at ? { created_at: tweet.created_at } : {}),
    author: author
      ? {
          name: author.name,
          username: author.username,
          verified: author.verified ?? false,
        }
      : null,
    metrics: {
      likes: metrics?.like_count ?? 0,
      retweets: metrics?.retweet_count ?? 0,
      replies: metrics?.reply_count ?? 0,
      quotes: metrics?.quote_count ?? 0,
      bookmarks: metrics?.bookmark_count ?? 0,
      ...(metrics?.impression_count === undefined ? {} : { views: metrics.impression_count }),
    },
  };
}

export function mapApiUser(user: ApiUserLike): UserProfile {
  const metrics = user.public_metrics;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    ...(user.description ? { description: user.description } : {}),
    ...(user.created_at ? { created_at: user.created_at } : {}),
    verified: user.verified ?? false,
    ...(user.profile_image_url ? { profile_image_url: user.profile_image_url } : {}),
    ...(user.location ? { location: user.location } : {}),
    ...(user.url ? { url: user.url } : {}),
    metrics: {
      followers_count: metrics?.followers_count ?? 0,
      following_count: metrics?.following_count ?? 0,
      tweet_count: metrics?.tweet_count ?? 0,
      listed_count: metrics?.listed_count ?? 0,
    },
  };
}
