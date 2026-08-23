import { TwitterApi } from "twitter-api-v2";

import type { ApiConfig } from "../../config/env.js";
import type { Tweet, TweetPage, UserProfile } from "../../domain/schemas.js";
import type {
  GetProfileRequest,
  GetRepliesRequest,
  GetTweetRequest,
  ProviderCapabilities,
  RequestContext,
  SearchTweetsRequest,
} from "../../domain/requests.js";
import { TwitterError, toTwitterError } from "../../errors/twitter-error.js";
import { withDeadline } from "../deadline.js";
import type { TwitterProvider } from "../provider.js";
import { mapApiTweet, mapApiUser, type ApiTweetLike, type ApiUserLike } from "./mapper.js";

interface ApiTweetResponse {
  data: ApiTweetLike;
  includes?: { users?: ApiUserLike[] };
}

interface ApiSearchResponse {
  data: { data?: ApiTweetLike[]; meta?: { next_token?: string } };
  includes?: { users?: ApiUserLike[] };
}

interface ApiUserResponse {
  data?: ApiUserLike;
}

export interface OfficialApiClient {
  v2: {
    singleTweet(id: string, options: Record<string, unknown>): Promise<ApiTweetResponse>;
    search(query: string, options: Record<string, unknown>): Promise<ApiSearchResponse>;
    userByUsername(username: string, options: Record<string, unknown>): Promise<ApiUserResponse>;
  };
}

function timeoutError(): TwitterError {
  return new TwitterError({
    code: "TIMEOUT",
    safeMessage: "The official X API request timed out",
    provider: "api",
    retryable: true,
  });
}

function mapApiFailure(error: unknown): TwitterError {
  if (error instanceof TwitterError) return error;
  const status =
    typeof error === "object" && error !== null && "code" in error ? Number(error.code) : undefined;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (status === 401 || status === 403) {
    return new TwitterError({
      code: "AUTH_FAILED",
      safeMessage: "Official X API authentication failed",
      provider: "api",
      retryable: false,
      cause: error,
    });
  }
  if (status === 404) {
    return new TwitterError({
      code: "NOT_FOUND",
      safeMessage: "The requested X resource was not found",
      provider: "api",
      retryable: false,
      cause: error,
    });
  }
  if (status === 429) {
    return new TwitterError({
      code: "RATE_LIMITED",
      safeMessage: "Official X API rate limit reached",
      provider: "api",
      retryable: true,
      cause: error,
    });
  }
  if (message.includes("timeout") || message.includes("econnaborted")) return timeoutError();

  return toTwitterError(error, "api");
}

function userMap(users: ApiUserLike[] | undefined): Map<string, ApiUserLike> {
  return new Map((users ?? []).map((user) => [user.id, user]));
}

const TWEET_FIELDS = ["created_at", "public_metrics", "author_id", "conversation_id", "text"];
const USER_FIELDS = [
  "name",
  "username",
  "description",
  "created_at",
  "verified",
  "profile_image_url",
  "public_metrics",
  "location",
  "url",
];

export class OfficialApiProvider implements TwitterProvider {
  readonly capabilities: ProviderCapabilities = {
    provider: "api",
    authenticated: true,
    operations: {
      getTweet: true,
      getTweetReplies: true,
      getUserProfile: true,
      searchTweets: true,
    },
    pagination: { replies: true, search: true },
    limits: { replies: 100, search: 100 },
  };

  constructor(private readonly client: OfficialApiClient) {}

  static create(config: ApiConfig): OfficialApiProvider {
    const credentials = config.credentials;
    const client =
      credentials.type === "bearer"
        ? new TwitterApi(credentials.token)
        : new TwitterApi({
            appKey: credentials.appKey,
            appSecret: credentials.appSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessSecret,
          });
    return new OfficialApiProvider(client);
  }

  async getTweet(request: GetTweetRequest, context: RequestContext): Promise<Tweet> {
    try {
      const response = await withDeadline(
        this.client.v2.singleTweet(request.tweetId, {
          "tweet.fields": TWEET_FIELDS,
          expansions: ["author_id"],
          "user.fields": USER_FIELDS,
        }),
        context.signal,
        context.deadline,
        timeoutError,
      );
      return mapApiTweet(response.data, userMap(response.includes?.users));
    } catch (error) {
      throw mapApiFailure(error);
    }
  }

  getTweetReplies(request: GetRepliesRequest, context: RequestContext): Promise<TweetPage> {
    return this.search(`conversation_id:${request.tweetId} is:reply`, request.maxResults, context);
  }

  async getUserProfile(request: GetProfileRequest, context: RequestContext): Promise<UserProfile> {
    try {
      const response = await withDeadline(
        this.client.v2.userByUsername(request.username, { "user.fields": USER_FIELDS }),
        context.signal,
        context.deadline,
        timeoutError,
      );
      if (!response.data) {
        throw new TwitterError({
          code: "NOT_FOUND",
          safeMessage: `User @${request.username} was not found`,
          provider: "api",
          retryable: false,
        });
      }
      return mapApiUser(response.data);
    } catch (error) {
      throw mapApiFailure(error);
    }
  }

  searchTweets(request: SearchTweetsRequest, context: RequestContext): Promise<TweetPage> {
    return this.search(request.query, request.maxResults, context);
  }

  private async search(
    query: string,
    maxResults: number,
    context: RequestContext,
  ): Promise<TweetPage> {
    try {
      const response = await withDeadline(
        this.client.v2.search(query, {
          max_results: Math.max(10, Math.min(maxResults, 100)),
          "tweet.fields": TWEET_FIELDS,
          expansions: ["author_id"],
          "user.fields": USER_FIELDS,
        }),
        context.signal,
        context.deadline,
        timeoutError,
      );
      const users = userMap(response.includes?.users);
      return {
        items: (response.data.data ?? [])
          .slice(0, maxResults)
          .map((tweet) => mapApiTweet(tweet, users)),
        ...(response.data.meta?.next_token ? { nextCursor: response.data.meta.next_token } : {}),
      };
    } catch (error) {
      throw mapApiFailure(error);
    }
  }
}
