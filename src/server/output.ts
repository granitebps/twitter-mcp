import type { CallToolResult } from "@modelcontextprotocol/server";

import type { Tweet, TweetPage, UserProfile } from "../domain/schemas.js";
import { toTwitterError, type ProviderName } from "../errors/twitter-error.js";

function text(value: unknown): CallToolResult["content"] {
  return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}

export function tweetResult(tweet: Tweet): CallToolResult {
  return { content: text(tweet), structuredContent: { tweet } };
}

export function profileResult(profile: UserProfile): CallToolResult {
  return { content: text(profile), structuredContent: { profile } };
}

export function pageResult(page: TweetPage): CallToolResult {
  return { content: text(page.items), structuredContent: page };
}

export function objectResult(value: Record<string, unknown>): CallToolResult {
  return { content: text(value), structuredContent: value };
}

export function errorResult(error: unknown, provider: ProviderName): CallToolResult {
  const mapped = toTwitterError(error, provider);
  const details = {
    code: mapped.code,
    message: mapped.safeMessage,
    provider: mapped.provider,
    retryable: mapped.retryable,
    ...(mapped.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: mapped.retryAfterSeconds }),
  };

  return {
    isError: true,
    content: [{ type: "text", text: `${mapped.code}: ${mapped.safeMessage}` }],
    structuredContent: { error: details },
  };
}
