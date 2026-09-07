export function migrateCodexFeatureFlags<T extends Record<string, any>>(parsed: T): T {
  const features = parsed?._sections?.features as Record<string, unknown> | undefined;
  if (!features || typeof features !== "object") return parsed;
  if (!Object.prototype.hasOwnProperty.call(features, "codex_hooks")) return parsed;
  if (!Object.prototype.hasOwnProperty.call(features, "hooks")) {
    features.hooks = features.codex_hooks;
  }
  delete features.codex_hooks;
  return parsed;
}
