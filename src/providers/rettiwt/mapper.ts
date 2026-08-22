import type { Tweet, UserProfile } from "../../domain/schemas.js";

export interface RettiwtUserLike {
  id?: string;
  fullName: string;
  userName: string;
  createdAt?: string;
  description?: string;
  isVerified: boolean;
  followersCount?: number;
  followingsCount?: number;
  statusesCount?: number;
  likeCount?: number;
  profileImage?: string;
  location?: string;
}

export interface RettiwtTweetLike {
  id: string;
  fullText: string;
  createdAt?: string;
  tweetBy?: Pick<RettiwtUserLike, "fullName" | "userName" | "isVerified"> | undefined;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  quoteCount?: number;
  bookmarkCount?: number;
  viewCount?: number;
}

export function mapRettiwtTweet(tweet: RettiwtTweetLike): Tweet {
  return {
    id: tweet.id,
    text: tweet.fullText,
    ...(tweet.createdAt ? { created_at: tweet.createdAt } : {}),
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

export function mapRettiwtUser(user: RettiwtUserLike): UserProfile {
  return {
    id: user.id ?? "",
    name: user.fullName,
    username: user.userName,
    ...(user.description ? { description: user.description } : {}),
    ...(user.createdAt ? { created_at: user.createdAt } : {}),
    verified: user.isVerified,
    ...(user.profileImage ? { profile_image_url: user.profileImage } : {}),
    ...(user.location ? { location: user.location } : {}),
    metrics: {
      followers_count: user.followersCount ?? 0,
      following_count: user.followingsCount ?? 0,
      tweet_count: user.statusesCount ?? 0,
      listed_count: 0,
      likes_count: user.likeCount ?? 0,
    },
  };
}
