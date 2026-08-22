import { z } from "zod";

const TWEET_ID = /^\d{10,20}$/;
const USERNAME = /^[A-Za-z0-9_]{1,15}$/;
const STATUS_URL =
  /^https:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[^/]+\/status\/(\d{10,20})(?:[/?#].*)?$/i;

export function parseTweetReference(value: string): string {
  const candidate = value.trim();
  if (TWEET_ID.test(candidate)) return candidate;

  const match = STATUS_URL.exec(candidate);
  if (match?.[1]) return match[1];

  throw new Error("tweet_id must be a valid X post ID or URL");
}

export function normalizeUsername(value: string): string {
  const candidate = value.trim().replace(/^@/, "");
  if (USERNAME.test(candidate)) return candidate;
  throw new Error("username must be a valid X username");
}

export const getTweetInputSchema = z.object({
  tweet_id: z.string().transform(parseTweetReference),
});

export const getTweetRepliesInputSchema = z.object({
  tweet_id: z.string().transform(parseTweetReference),
  max_results: z.number().int().min(1).max(100).default(10),
});

export const getUserProfileInputSchema = z.object({
  username: z.string().transform(normalizeUsername),
});

export const searchTweetsInputSchema = z.object({
  query: z.string().trim().min(1).max(512),
  max_results: z.number().int().min(1).max(100).default(10),
});
