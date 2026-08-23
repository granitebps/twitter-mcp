export type TwitterErrorCode =
  | "INVALID_INPUT"
  | "AUTH_REQUIRED"
  | "AUTH_FAILED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "TIMEOUT"
  | "UNSUPPORTED_OPERATION"
  | "INTERNAL_ERROR";

export type ProviderName = "rettiwt" | "api";

export interface TwitterErrorOptions {
  code: TwitterErrorCode;
  safeMessage: string;
  provider: ProviderName;
  retryable: boolean;
  retryAfterSeconds?: number;
  cause?: unknown;
}

export class TwitterError extends Error {
  readonly code: TwitterErrorCode;
  readonly safeMessage: string;
  readonly provider: ProviderName;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(options: TwitterErrorOptions) {
    super(options.safeMessage, { cause: options.cause });
    this.name = "TwitterError";
    this.code = options.code;
    this.safeMessage = options.safeMessage;
    this.provider = options.provider;
    this.retryable = options.retryable;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bAuthorization:\s*(?:Bearer\s+)?[^\s,;]+/gi, "Authorization: [REDACTED]"],
  [/\b(auth_token|ct0|RETTIWT_API_KEY)=([^\s,;]+)/gi, "$1=[REDACTED]"],
];

export function redactSecrets(value: string): string {
  return SECRET_PATTERNS.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    value,
  );
}

export function toTwitterError(error: unknown, provider: ProviderName): TwitterError {
  if (error instanceof TwitterError) return error;

  return new TwitterError({
    code: "INTERNAL_ERROR",
    safeMessage: "The X provider returned an unexpected error",
    provider,
    retryable: false,
    cause: error,
  });
}
