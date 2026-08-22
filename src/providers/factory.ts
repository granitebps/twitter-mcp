import type { ApiConfig, RettiwtConfig, RuntimeConfig } from "../config/env.js";
import type { TwitterProvider } from "./provider.js";

export interface ProviderLoaders {
  rettiwt(config: RettiwtConfig): Promise<TwitterProvider>;
  api(config: ApiConfig): Promise<TwitterProvider>;
}

const defaultLoaders: ProviderLoaders = {
  async rettiwt(config) {
    const { RettiwtProvider } = await import("./rettiwt/provider.js");
    return RettiwtProvider.create(config);
  },
  async api(config) {
    const { OfficialApiProvider } = await import("./api/provider.js");
    return OfficialApiProvider.create(config);
  },
};

export async function createProvider(
  config: RuntimeConfig,
  loaders: ProviderLoaders = defaultLoaders,
): Promise<TwitterProvider> {
  if (config.mode === "rettiwt") {
    return loaders.rettiwt(config);
  }

  return loaders.api(config);
}
