import {
  normalizeEffort,
  type CanonicalEffort,
} from "@shiguang-gateway/contracts/reasoning-effort";

export interface MitmAliasEntry {
  model?: string;
  reasoningEffort?: CanonicalEffort;
}

export type MitmAliasMappings = Record<string, MitmAliasEntry>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Normalize a legacy string or structured alias entry. */
export function normalizeAliasEntry(value: unknown): MitmAliasEntry | null {
  if (typeof value === "string") {
    const model = value.trim();
    return model ? { model } : null;
  }
  if (!isPlainObject(value)) return null;

  const model = typeof value.model === "string" ? value.model.trim() : "";
  const reasoningEffort = normalizeEffort(value.reasoningEffort);
  if (!model && !reasoningEffort) return null;

  return {
    ...(model ? { model } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

/** Upgrade and filter a stored alias mapping without mutating the input. */
export function normalizeAliasMappings(mappings: unknown): MitmAliasMappings {
  if (!isPlainObject(mappings)) return {};
  const normalized: MitmAliasMappings = {};
  for (const [alias, value] of Object.entries(mappings)) {
    if (!alias) continue;
    const entry = normalizeAliasEntry(value);
    if (entry) normalized[alias] = entry;
  }
  return normalized;
}

/** Detect invalid structured reasoning-effort values before normalization. */
export function hasInvalidReasoningEffort(mappings: unknown): boolean {
  if (!isPlainObject(mappings)) return false;
  return Object.values(mappings).some((value) => {
    if (!isPlainObject(value)) return false;
    const raw = value.reasoningEffort;
    if (raw == null || raw === "") return false;
    return normalizeEffort(raw) === undefined;
  });
}
