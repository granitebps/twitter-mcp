import { z } from "zod";

export const TweetMetricsSchema = z.object({
  likes: z.number().int().nonnegative(),
  retweets: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  quotes: z.number().int().nonnegative(),
  bookmarks: z.number().int().nonnegative(),
  views: z.number().int().nonnegative().optional(),
});

export const TweetAuthorSchema = z.object({
  name: z.string(),
  username: z.string(),
  verified: z.boolean().optional(),
  blue_verified: z.boolean().optional(),
});

export const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string().optional(),
  author: TweetAuthorSchema.nullable().optional(),
  metrics: TweetMetricsSchema,
});

export const ProfileMetricsSchema = z.object({
  followers_count: z.number().int().nonnegative(),
  following_count: z.number().int().nonnegative(),
  tweet_count: z.number().int().nonnegative(),
  listed_count: z.number().int().nonnegative(),
  likes_count: z.number().int().nonnegative().optional(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  description: z.string().optional(),
  created_at: z.string().optional(),
  verified: z.boolean(),
  blue_verified: z.boolean().optional(),
  profile_image_url: z.string().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  metrics: ProfileMetricsSchema,
});

export const ProviderWarningSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const TweetPageSchema = z.object({
  items: z.array(TweetSchema),
  nextCursor: z.string().optional(),
  partial: z.boolean().optional(),
  warnings: z.array(ProviderWarningSchema).optional(),
});

export type Tweet = z.infer<typeof TweetSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProviderWarning = z.infer<typeof ProviderWarningSchema>;
export type TweetPage = z.infer<typeof TweetPageSchema>;
