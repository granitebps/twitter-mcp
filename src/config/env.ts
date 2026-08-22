export interface RettiwtConfig {
  mode: "rettiwt";
  apiKey: string;
  requestTimeoutMs: number;
}

export type ApiCredentials =
  | { type: "bearer"; token: string }
  | {
      type: "oauth";
      appKey: string;
      appSecret: string;
      accessToken: string;
      accessSecret: string;
    };

export interface ApiConfig {
  mode: "api";
  credentials: ApiCredentials;
  requestTimeoutMs: number;
}

export type RuntimeConfig = RettiwtConfig | ApiConfig;

function readNonEmpty(env: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function readTimeout(env: NodeJS.ProcessEnv): number {
  const raw = readNonEmpty(env, "TWITTER_REQUEST_TIMEOUT_MS");
  if (!raw) return 30_000;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1_000 || value > 120_000) {
    throw new Error("TWITTER_REQUEST_TIMEOUT_MS must be an integer from 1000 to 120000");
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv): RuntimeConfig {
  const rawMode = readNonEmpty(env, "TWITTER_MODE")?.toLowerCase() ?? "rettiwt";
  if (rawMode !== "rettiwt" && rawMode !== "api") {
    throw new Error('TWITTER_MODE must be either "rettiwt" or "api"');
  }

  const requestTimeoutMs = readTimeout(env);
  if (rawMode === "rettiwt") {
    const apiKey = readNonEmpty(env, "RETTIWT_API_KEY");
    if (!apiKey) throw new Error("RETTIWT_API_KEY is required in rettiwt mode");
    return { mode: "rettiwt", apiKey, requestTimeoutMs };
  }

  const bearer = readNonEmpty(env, "TWITTER_BEARER_TOKEN");
  if (bearer) {
    return { mode: "api", credentials: { type: "bearer", token: bearer }, requestTimeoutMs };
  }

  const appKey = readNonEmpty(env, "TWITTER_API_KEY");
  const appSecret = readNonEmpty(env, "TWITTER_API_SECRET");
  const accessToken = readNonEmpty(env, "TWITTER_ACCESS_TOKEN");
  const accessSecret = readNonEmpty(env, "TWITTER_ACCESS_SECRET");
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error("API mode requires TWITTER_BEARER_TOKEN or a complete OAuth credential set");
  }

  return {
    mode: "api",
    credentials: { type: "oauth", appKey, appSecret, accessToken, accessSecret },
    requestTimeoutMs,
  };
}
