export interface GetTweetRequest {
  tweetId: string;
}

export interface GetRepliesRequest {
  tweetId: string;
  maxResults: number;
}

export interface GetProfileRequest {
  username: string;
}

export interface SearchTweetsRequest {
  query: string;
  maxResults: number;
}

export interface RequestContext {
  signal: AbortSignal;
  deadline: number;
}

export interface ProviderCapabilities {
  provider: "rettiwt" | "api";
  authenticated: boolean;
  operations: {
    getTweet: boolean;
    getTweetReplies: boolean;
    getUserProfile: boolean;
    searchTweets: boolean;
  };
  pagination: {
    replies: boolean;
    search: boolean;
  };
  limits: {
    replies: number;
    search: number;
  };
}
