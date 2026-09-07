import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import {
  installResilienceRuntimeSettingsPort,
  installRuntimeSettingsPort,
} from "@orbit/inference/services/runtime-settings-hooks";
import { hydrateRequestRuntime } from "@orbit/core/runtime/request";
import type { RequestRuntimeHandle } from "@orbit/core/runtime/request";
import { ensureGamificationSchema } from "@orbit/contracts/db-schema";
import { getDbInstance } from "@orbit/core/db/connection";
import { refreshResilienceRuntimeSettings } from "@orbit/core/resilience/settings-runtime";

const load = (specifier: string): Promise<any> => import(specifier as string);

async function registerQuotaFetchers(): Promise<void> {
  await load("@orbit/inference/services/quotaTrackersBatch");
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
    load("@orbit/inference/services/codexQuotaFetcher"),
    load("@orbit/inference/services/bailianQuotaFetcher"),
    load("@orbit/inference/services/qwenTokenPlanQuotaFetcher"),
    load("@orbit/inference/services/crofUsageFetcher"),
    load("@orbit/inference/services/deepseekQuotaFetcher"),
    load("@orbit/inference/services/openrouterQuotaFetcher"),
    load("@orbit/inference/services/opencodeQuotaFetcher"),
    load("@orbit/inference/services/grokQuotaFetcher"),
    load("@orbit/inference/services/genericQuotaFetcher"),
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
export class EdgeRuntimeService implements OnModuleInit, OnModuleDestroy {
  private initialization: Promise<void> | null = null;
  private requestRuntime: RequestRuntimeHandle | null = null;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.initialization) await this.initialization;
    this.requestRuntime?.close();
    this.requestRuntime = null;
    this.initialization = null;
  }

  initialize(): Promise<void> {
    if (!this.initialization) {
      installRuntimeSettingsPort();
      installResilienceRuntimeSettingsPort();
      this.initialization = this.initializeRuntime()
        .catch((error) => {
          this.initialization = null;
          throw error;
        });
    }
    return this.initialization;
  }

  private async initializeRuntime(): Promise<void> {
    const runtime = await hydrateRequestRuntime();
    this.requestRuntime = runtime;
    try {
      await refreshResilienceRuntimeSettings({ force: true, source: "gateway:startup" });
      ensureGamificationSchema(getDbInstance());
      await registerQuotaFetchers();
      console.log("[gateway] request services initialized");
    } catch (error) {
      runtime.close();
      this.requestRuntime = null;
      throw error;
    }
  }
}
