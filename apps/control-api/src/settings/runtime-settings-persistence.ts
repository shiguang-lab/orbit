import {
  getSettingsRevision,
  updateSettings,
} from "@shiguang-gateway/core-domain/db/settings";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

export async function applyPersistedRuntimeSettings(): Promise<number> {
  const revision = await getSettingsRevision();
  await executeEdgeRuntimeCommand({
    command: "runtime-settings.apply",
    minimumRevision: revision,
  });
  return revision;
}

export async function updatePersistedRuntimeSettings(
  updates: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const settings = await updateSettings(updates, { applyRuntime: false });
  await applyPersistedRuntimeSettings();
  return settings;
}
