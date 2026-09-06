import { Injectable, type OnModuleInit } from "@nestjs/common";
import {
  installResilienceRuntimeSettingsPort,
  installRuntimeSettingsPort,
} from "@shiguang-gateway/open-sse/services/runtime-settings-hooks";
import { hydrateRequestRuntime } from "@shiguang-gateway/core-domain/runtime/request";
import { ensureGamificationSchema } from "@shiguang-gateway/db-schema";
import { getDbInstance } from "@shiguang-gateway/core-domain/db/connection";
import { refreshResilienceRuntimeSettings } from "@shiguang-gateway/core-domain/resilience/settings-runtime";

const load = (specifier: string): Promise<any> => import(specifier as string);

async function registerQuotaFetchers(): Promise<void> {
  await load("@shiguang-gateway/open-sse/services/quotaTrackersBatch");
  const [
    { registerCodexQuotaFetcher },
    { registerBailianCodingPlanQuotaFetcher },
    { registerQwenTokenPlanQuotaFetcher },
    { registerCrofUsageFetcher },
    { registerDeepseekQuotaFetcher },
    { registerOpenrouterQuotaFetcher },
    { registerOpencodeQuotaFetcher },
    { registerGrokWebQuotaFetcher },
    { registerGenericQuotaFetchers },
  ] = await Promise.all([
    load("@shiguang-gateway/open-sse/services/codexQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/bailianQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/qwenTokenPlanQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/crofUsageFetcher"),
    load("@shiguang-gateway/open-sse/services/deepseekQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/openrouterQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/opencodeQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/grokQuotaFetcher"),
    load("@shiguang-gateway/open-sse/services/genericQuotaFetcher"),
  ]);
  registerCodexQuotaFetcher();
  registerBailianCodingPlanQuotaFetcher();
  registerQwenTokenPlanQuotaFetcher();
  registerCrofUsageFetcher();
  registerDeepseekQuotaFetcher();
  registerOpenrouterQuotaFetcher();
  registerOpencodeQuotaFetcher();
  registerGrokWebQuotaFetcher();
  registerGenericQuotaFetchers();
}

@Injectable()
export class EdgeRuntimeService implements OnModuleInit {
  private initialization: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  initialize(): Promise<void> {
    if (!this.initialization) {
      installRuntimeSettingsPort();
      installResilienceRuntimeSettingsPort();
      this.initialization = hydrateRequestRuntime()
        .then(() => refreshResilienceRuntimeSettings({ force: true, source: "edge-gateway:startup" }))
        .then(() => ensureGamificationSchema(getDbInstance()))
        .then(registerQuotaFetchers)
        .then(() => console.log("[edge-gateway] request services initialized"))
        .catch((error) => {
          this.initialization = null;
          throw error;
        });
    }
    return this.initialization;
  }
}
