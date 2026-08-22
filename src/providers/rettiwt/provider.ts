import { Rettiwt } from "rettiwt-api";

import type { RettiwtConfig } from "../../config/env.js";
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
import {
  mapRettiwtTweet,
  mapRettiwtUser,
  type RettiwtTweetLike,
  type RettiwtUserLike,
} from "./mapper.js";

interface CursoredTweets {
  list: RettiwtTweetLike[];
  next: string;
}

export interface RettiwtClient {
  tweet: {
    details(id: string): Promise<RettiwtTweetLike | undefined>;
    replies(id: string): Promise<CursoredTweets>;
    search(filter: Record<string, unknown>, count?: number): Promise<CursoredTweets>;
  };
  user: {
    details(id: string): Promise<RettiwtUserLike | undefined>;
  };
}

function timeoutError(): TwitterError {
  return new TwitterError({
    code: "TIMEOUT",
    safeMessage: "The X provider request timed out",
    provider: "rettiwt",
    retryable: true,
  });
}

function mapRettiwtFailure(error: unknown): TwitterError {
  if (error instanceof TwitterError) return error;
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes("401") || message.includes("auth")) {
    return new TwitterError({
      code: "AUTH_FAILED",
      safeMessage: "Rettiwt authentication failed; generate a new RETTIWT_API_KEY",
      provider: "rettiwt",
      retryable: false,
      cause: error,
    });
  }
  if (message.includes("429") || message.includes("rate limit")) {
    return new TwitterError({
      code: "RATE_LIMITED",
      safeMessage: "X rate limit reached",
      provider: "rettiwt",
      retryable: true,
      cause: error,
    });
  }
  if (message.includes("timeout") || message.includes("econnaborted")) return timeoutError();

  return toTwitterError(error, "rettiwt");
}

function parseSearch(query: string): {
  filter: Record<string, unknown>;
  warnings: Array<{ code: string; message: string }>;
} {
  const fromUsers: string[] = [];
  const hashtags: string[] = [];
  const mentions: string[] = [];
  const includeWords: string[] = [];
  const warnings: Array<{ code: string; message: string }> = [];
  let language: string | undefined;

  for (const token of query.split(/\s+/).filter(Boolean)) {
    if (token.startsWith("from:") && token.length > 5) fromUsers.push(token.slice(5));
    else if (token.startsWith("lang:") && token.length > 5) language = token.slice(5);
    else if (token.startsWith("#") && token.length > 1) hashtags.push(token.slice(1));
    else if (token.startsWith("@") && token.length > 1) mentions.push(token.slice(1));
    else if (token.includes(":")) {
      warnings.push({
        code: "UNSUPPORTED_SEARCH_OPERATOR",
        message: `Ignored search operator: ${token}`,
      });
    } else includeWords.push(token);
  }

  return {
    filter: {
      ...(includeWords.length ? { includeWords } : {}),
      ...(fromUsers.length ? { fromUsers } : {}),
      ...(hashtags.length ? { hashtags } : {}),
      ...(mentions.length ? { mentions } : {}),
      ...(language ? { language } : {}),
    },
    warnings,
  };
}

export class RettiwtProvider implements TwitterProvider {
  readonly capabilities: ProviderCapabilities = {
    provider: "rettiwt",
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

  constructor(private readonly client: RettiwtClient) {}

  static create(config: RettiwtConfig): RettiwtProvider {
    return new RettiwtProvider(
      new Rettiwt({
        apiKey: config.apiKey,
        timeout: config.requestTimeoutMs,
        logging: false,
        maxRetries: 0,
      }),
    );
  }

  async getTweet(request: GetTweetRequest, context: RequestContext): Promise<Tweet> {
    try {
      const tweet = await withDeadline(
        this.client.tweet.details(request.tweetId),
        context.signal,
        context.deadline,
        timeoutError,
      );
      if (!tweet) {
        throw new TwitterError({
          code: "NOT_FOUND",
          safeMessage: `Post ${request.tweetId} was not found`,
          provider: "rettiwt",
          retryable: false,
        });
      }
      return mapRettiwtTweet(tweet);
    } catch (error) {
      throw mapRettiwtFailure(error);
    }
  }

  async getTweetReplies(request: GetRepliesRequest, context: RequestContext): Promise<TweetPage> {
    try {
      const result = await withDeadline(
        this.client.tweet.replies(request.tweetId),
        context.signal,
        context.deadline,
        timeoutError,
      );
      return {
        items: result.list.slice(0, request.maxResults).map(mapRettiwtTweet),
        ...(result.next ? { nextCursor: result.next } : {}),
      };
    } catch (error) {
      throw mapRettiwtFailure(error);
    }
  }

  async getUserProfile(request: GetProfileRequest, context: RequestContext): Promise<UserProfile> {
    try {
      const user = await withDeadline(
        this.client.user.details(request.username),
        context.signal,
        context.deadline,
        timeoutError,
      );
      if (!user) {
        throw new TwitterError({
          code: "NOT_FOUND",
          safeMessage: `User @${request.username} was not found`,
          provider: "rettiwt",
          retryable: false,
        });
      }
      return mapRettiwtUser(user);
    } catch (error) {
      throw mapRettiwtFailure(error);
    }
  }

  async searchTweets(request: SearchTweetsRequest, context: RequestContext): Promise<TweetPage> {
    try {
      const { filter, warnings } = parseSearch(request.query);
      const result = await withDeadline(
        this.client.tweet.search(filter, request.maxResults),
        context.signal,
        context.deadline,
        timeoutError,
      );
      return {
        items: result.list.slice(0, request.maxResults).map(mapRettiwtTweet),
        ...(result.next ? { nextCursor: result.next } : {}),
        ...(warnings.length ? { warnings } : {}),
      };
    } catch (error) {
      throw mapRettiwtFailure(error);
    }
  }
}
