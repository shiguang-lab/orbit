import { getProviderModels } from "@orbit/providers/provider-models";
import { resolveProviderId } from "@orbit/providers/catalog";
import { getModelSpec } from "@orbit/contracts/model-specs";
import { getSyncedAvailableModelsByConnection } from "../models";

/** Resolve only declared Orbit aliases; an exact live upstream ID is never stripped. */
export async function resolveEffortTarget(modelId: string, explicitEffort?: string) {
  const noThinking = modelId.startsWith("no-think/");
  const clean = noThinking ? modelId.slice(9) : modelId;
  const slash = clean.indexOf("/");
  const prefix = slash < 0 ? "" : clean.slice(0, slash);
  const bare = slash < 0 ? clean : clean.slice(slash + 1);
  const provider = resolveProviderId(prefix) || prefix;
  const registry = getProviderModels(provider);
  const synced = prefix ? Object.values(await getSyncedAvailableModelsByConnection(provider)).flat() : [];
  const upstreamExact = synced.some((m) => m.id === bare);
  const declared = upstreamExact ? undefined : registry.find((m) => m.id === bare)?.effortVariant;
  const suffix = bare.match(/^(.*)-(none|minimal|low|medium|high|xhigh|max|ultra)$/);
  let base = declared?.baseModel || bare;
  let effort = explicitEffort || (noThinking ? "none" : declared?.effort);
  if (!upstreamExact && !declared && suffix) {
    const baseEntry = synced.find((m) => m.id === suffix[1]) || registry.find((m) => m.id === suffix[1]);
    const spec = getModelSpec(suffix[1]);
    if (baseEntry?.supportedThinkingEfforts?.includes(suffix[2]) ||
        (/claude/i.test(suffix[1]) && spec?.supportsThinking && ["low", "medium", "high", "xhigh"].includes(suffix[2]))) {
      base = suffix[1];
      effort ||= suffix[2];
    }
  }
  const qualify = (id: string) => prefix ? `${prefix}/${id}` : id;
  // A real upstream `model-high` is a separate model, not permission to call
  // `model` with high effort. Only synthetic selectors share that identity.
  const liveCollision = effort && synced.some((m) => m.id === `${base}-${effort}`);
  return { base: qualify(base), effort,
    target: effort && !liveCollision ? qualify(`${base}-${effort}`) : qualify(base) };
}
