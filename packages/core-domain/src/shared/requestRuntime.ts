import { providerRuntimePorts } from "../runtime/providerRuntimePorts.js";

/** Shared, side-effectful hydration required by every HTTP request process. */
export async function hydrateRequestRuntime(): Promise<void> {
  const load = (specifier: string): Promise<any> => import(specifier as string);
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
    load("../lib/db/settings"),
    load("../lib/config/runtimeSettings"),
    load("../lib/config/hotReload"),
    load("../lib/memory/index"),
    load("../lib/compliance/index"),
    load("../lib/guardrails/registry"),
    load("../lib/skills/executor"),
    load("../lib/skills/builtins"),
  ]);

  const settings = await getSettings();
  await applyRuntimeSettings(settings, {
    source: "http-request-runtime:startup",
    skipBackgroundServices: true,
  });
  startRuntimeConfigHotReload({ skipBackgroundServices: true });

  providerRuntimePorts.hydrateRoutingSettings(settings);

  registerDefaultGuardrails();
  registerBuiltinSkills(skillExecutor);
  initAuditLog();
  await initMemoryBackends();
}
