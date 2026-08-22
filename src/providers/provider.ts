import type { Tweet, TweetPage, UserProfile } from "../domain/schemas.js";
import type {
  GetProfileRequest,
  GetRepliesRequest,
  GetTweetRequest,
  ProviderCapabilities,
  RequestContext,
  SearchTweetsRequest,
} from "../domain/requests.js";

export interface TwitterProvider {
  readonly capabilities: ProviderCapabilities;
  getTweet(request: GetTweetRequest, context: RequestContext): Promise<Tweet>;
  getTweetReplies(request: GetRepliesRequest, context: RequestContext): Promise<TweetPage>;
  getUserProfile(request: GetProfileRequest, context: RequestContext): Promise<UserProfile>;
  searchTweets(request: SearchTweetsRequest, context: RequestContext): Promise<TweetPage>;
}
