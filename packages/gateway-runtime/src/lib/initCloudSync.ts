import initializeCloudSync from "../shared/services/initializeCloudSync.ts";
import { startModelSyncScheduler } from "../shared/services/modelSyncScheduler.ts";
import { isAutomatedTestProcess } from "../shared/utils/testProcess.ts";
import { getJobRegistry } from "./jobRegistry/index.ts";
import { registerBudgetResetJob } from "./jobs/budgetResetJob.ts";
import { registerTokenHealthCheck } from "./jobs/tokenHealthCheckJob.ts";
import { backfillVolcPlanAutoSync } from "./providers/volcPlanAutoSyncBackfill.ts";

// Initialize runtime background sync services once per server process.
let initialized = false;

export function shouldSkipCloudSyncInitialization(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv
): boolean {
  if (env.NEXT_PHASE === "phase-production-build") {
    return true;
  }

  const raw = env.SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES;
  if (raw && new Set(["1", "true", "yes", "on"]).has(raw.trim().toLowerCase())) {
    return true;
  }

  return isAutomatedTestProcess(argv, env) && env.SHIGUANG_GATEWAY_ENABLE_RUNTIME_BACKGROUND_TASKS !== "1";
}

export async function ensureCloudSyncInitialized() {
  if (shouldSkipCloudSyncInitialization()) {
    return false;
  }
  if (!initialized) {
    try {
      await initializeCloudSync();
      await backfillVolcPlanAutoSync();
      startModelSyncScheduler();

      // startAll() runs each interval job's first tick synchronously, so it has to
      // come after initializeCloudSync(). The old wiring got that ordering two
      // different ways: the budget reset was started right here, and the health
      // check's first sweep sat behind a 10s timer. Awaiting the init is a firmer
      // guarantee than the timer was.
      const registry = getJobRegistry();
      registerBudgetResetJob(registry);
      registerTokenHealthCheck(registry);
      await registry.startAll();

      initialized = true;
    } catch (error) {
      console.error("[ServerInit] Error initializing background sync services:", error);
    }
  }
  return initialized;
}

export default ensureCloudSyncInitialized;
