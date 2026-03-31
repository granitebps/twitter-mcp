// Shared types and provider interface

export interface TweetData {
  id: string;
  text: string;
  created_at?: string;
  author?: {
    name: string;
    username: string;
    verified?: boolean;
    blue_verified?: boolean;
  } | null;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    quotes: number;
    bookmarks: number;
    views?: number;
  };
}

export interface ProfileData {
  id: string;
  name: string;
  username: string;
  description?: string;
  created_at?: string;
  verified: boolean;
  blue_verified?: boolean;
  profile_image_url?: string;
  location?: string;
  url?: string;
  metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
    likes_count?: number;
  };
}

export interface TwitterProvider {
  getTweet(tweetId: string): Promise<TweetData>;
  getTweetReplies(tweetId: string, maxResults: number): Promise<TweetData[]>;
  getUserProfile(username: string): Promise<ProfileData>;
  searchTweets(query: string, maxResults: number): Promise<TweetData[]>;
}
