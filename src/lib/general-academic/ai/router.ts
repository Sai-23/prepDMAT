import "server-only";

import type { GeneralAcademicGenerationConfig } from "./generation-config";
import { getOmniRouteGamGenerationStatus, omniRouteGamGenerationProvider } from "./providers/omniroute";
import type { GamGenerationProvider } from "./types";

export function getGamGenerationProviderStatus() {
  return getOmniRouteGamGenerationStatus();
}

export async function generateGamPackWithProvider(
  config: GeneralAcademicGenerationConfig,
  provider: GamGenerationProvider = omniRouteGamGenerationProvider,
) {
  return provider.generate(config);
}
