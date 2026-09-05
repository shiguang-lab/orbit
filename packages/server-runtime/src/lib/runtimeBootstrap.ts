/**
 * Initialize process-local runtime state required by request handlers.
 *
 * Shiguang Gateway originally ran HTTP routes and background jobs in one Next.js process.
 * ShiguangGateway splits those responsibilities across edge/control/worker processes,
 * so registries and settings stored only in memory must be hydrated in every
 * HTTP process. Network schedulers remain owned by apps/worker.
 */

type RequestSurface = "all" | "edge-gateway" | "control-api";

const bootstraps = new Map<RequestSurface, Promise<void>>();
const load = (specifier: string): Promise<any> => import(specifier as string);

async function registerQuotaFetchers(): Promise<void> {
  await load("@shiguang-gateway/open-sse/services/quotaTrackersBatch.ts");
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

async function bootstrap(surface: RequestSurface): Promise<void> {
  const [
    { getSettings },
    { applyRuntimeSettings },
    { startRuntimeConfigHotReload },
    { initMemoryBackends },
    { initAuditLog },
    { registerDefaultGuardrails },
    { skillExecutor },
    { registerBuiltinSkills },
  ] = await Promise.all([
    load("@/lib/db/settings"),
    load("@/lib/config/runtimeSettings"),
    load("@/lib/config/hotReload"),
    load("@/lib/memory/index"),
    load("@/lib/compliance/index"),
    load("@/lib/guardrails/registry"),
    load("@/lib/skills/executor"),
    load("@/lib/skills/builtins"),
  ]);

  const settings = await getSettings();
  await applyRuntimeSettings(settings, {
    source: `${surface}:startup`,
    skipBackgroundServices: true,
  });
  startRuntimeConfigHotReload({ skipBackgroundServices: true });

  const [{ setSystemPromptConfig }, { hydrateThinkingBudgetConfig }, { hydrateTaskRoutingConfig }] =
    await Promise.all([
      load("@shiguang-gateway/open-sse/services/systemPrompt.ts"),
      load("@shiguang-gateway/open-sse/services/thinkingBudget.ts"),
      load("@shiguang-gateway/open-sse/services/taskAwareRouter.ts"),
    ]);
  if (settings.systemPrompt) setSystemPromptConfig(settings.systemPrompt);
  hydrateThinkingBudgetConfig(settings);
  hydrateTaskRoutingConfig(settings);

  registerDefaultGuardrails();
  registerBuiltinSkills(skillExecutor);
  initAuditLog();
  await initMemoryBackends();

  if (surface === "all" || surface === "edge-gateway") {
    await registerQuotaFetchers();
  }

  if (surface === "all" || surface === "control-api") {
    const { ensurePersistentManagementPasswordHash } =
      await load("@/lib/auth/managementPassword");
    await ensurePersistentManagementPasswordHash({
      logger: console,
      settings,
      source: `${surface}:startup`,
    });
  }
  console.log(`[runtime-bootstrap] ${surface} request runtime initialized`);
}

export function initializeRequestRuntime(surface: RequestSurface): Promise<void> {
  const existing = bootstraps.get(surface);
  if (existing) return existing;
  const pending = bootstrap(surface).catch((error) => {
    bootstraps.delete(surface);
    throw error;
  });
  bootstraps.set(surface, pending);
  return pending;
}
