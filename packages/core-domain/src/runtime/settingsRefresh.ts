import { getSettings } from "../lib/db/settings.js";
import { applyRuntimeSettings } from "../lib/config/runtimeSettings.js";
import { providerRuntimePorts } from "./providerRuntimePorts.js";

/** Re-read persisted request-runtime settings and apply them in this process. */
export async function refreshRequestRuntimeSettings(source: string): Promise<void> {
  const settings = await getSettings();
  await applyRuntimeSettings(settings, { force: true, source, skipBackgroundServices: true });
  providerRuntimePorts.hydrateRoutingSettings(settings);
  const [{ invalidateMemorySettingsCache }, { resetQuotaStoreSingleton }] = await Promise.all([
    import("../lib/memory/settings.js"),
    import("../lib/quota/storeFactory.js"),
  ]);
  invalidateMemorySettingsCache();
  resetQuotaStoreSingleton();
}
