import type { RegistryModel } from "./providers/shared.ts";

const EFFORT_SUFFIX = /^(.*?)-(none|extra-low|low|medium|high|xhigh|max|ultra)$/i;
const THINKING_SUFFIX = /^(.*?)-thinking(?:-(none|extra-low|low|medium|high|xhigh|max|ultra))?(?:-fast)?$/i;
const HIGH_THINKING_SUFFIX = /^(.*?)-(none|extra-low|low|medium|high|xhigh|max|ultra)-thinking(?:-fast)?$/i;
const TIERED_SUFFIX = /^(.*)-tiered$/i;

type Variant = { row: RegistryModel; base: string; effort?: string; kind: "effort" | "thinking" | "tiered" };

/**
 * Normalize static registry rows to the same public shape as discovered models:
 * one base row per model family, with effort/thinking/tiered ids retained only
 * as request-time metadata. This is intentionally conservative for ordinary
 * suffixes and only collapses a family when a base row or a second sibling exists.
 */
export function normalizeRegistryModelRows(rows: readonly RegistryModel[]): RegistryModel[] {
  const source = Array.from(rows || []);
  const byId = new Map(source.map((row) => [row.id, row]));
  const variantsByBase = new Map<string, Variant[]>();

  for (const row of source) {
    const explicit = row.effortVariant;
    if (explicit?.baseModel && explicit.effort) {
      const base = String(explicit.baseModel).trim();
      if (base) {
        const list = variantsByBase.get(base) || [];
        list.push({ row, base, effort: String(explicit.effort).toLowerCase(), kind: "effort" });
        variantsByBase.set(base, list);
        continue;
      }
    }

    const match = row.id.match(HIGH_THINKING_SUFFIX) || row.id.match(THINKING_SUFFIX);
    if (match) {
      const effort = (match[2] || "").toLowerCase();
      const base = match[1] || "";
      if (base) {
        const list = variantsByBase.get(base) || [];
        list.push({ row, base, effort: effort || undefined, kind: "thinking" });
        variantsByBase.set(base, list);
        continue;
      }
    }

    const effort = row.id.match(EFFORT_SUFFIX);
    if (effort) {
      const list = variantsByBase.get(effort[1]) || [];
      list.push({ row, base: effort[1], effort: effort[2].toLowerCase(), kind: "effort" });
      variantsByBase.set(effort[1], list);
      continue;
    }

    const tiered = row.id.match(TIERED_SUFFIX);
    if (tiered) {
      const list = variantsByBase.get(tiered[1]) || [];
      list.push({ row, base: tiered[1], kind: "tiered" });
      variantsByBase.set(tiered[1], list);
    }
  }

  const variantById = new Map<string, Variant>();
  for (const variants of variantsByBase.values()) {
    for (const variant of variants) variantById.set(variant.row.id, variant);
  }

  const output: RegistryModel[] = [];
  const emitted = new Set<string>();
  for (const row of source) {
    if (emitted.has(row.id)) continue;
    const ownVariant = variantById.get(row.id);
    const baseId = variantsByBase.has(row.id) ? row.id : ownVariant?.base;
    const variants = baseId ? variantsByBase.get(baseId) : undefined;
    if (!baseId || !variants || variants.length === 0) {
      output.push(row);
      emitted.add(row.id);
      continue;
    }

    if (emitted.has(baseId)) continue;
    const base = byId.get(baseId);
    const representative = base || variants[0].row;
    const efforts = new Set<string>(base?.supportedThinkingEfforts || []);
    const effortModelIds: Record<string, string> = {};
    for (const [effort, modelId] of Object.entries(base?.effortModelIds || {})) {
      if (typeof modelId === "string" && modelId.trim()) effortModelIds[effort] = modelId;
    }
    let thinkingModelId = base?.thinkingModelId;
    let tieredModelId = base?.tieredModelId;

    for (const variant of variants) {
      if (variant.effort) {
        efforts.add(variant.effort);
        effortModelIds[variant.effort] = variant.row.id;
      }
      if (variant.kind === "thinking" && !thinkingModelId) thinkingModelId = variant.row.id;
      if (variant.kind === "tiered" && !tieredModelId) tieredModelId = variant.row.id;
      emitted.add(variant.row.id);
    }

    const name = (base?.name || representative.name || row.id)
      .replace(/\s*\((?:none|extra-low|low|medium|high|xhigh|max|ultra)\)\s*$/i, "")
      .replace(/\s*(?:thinking|tiered)\s*$/i, "")
      .trim();
    output.push({
      ...representative,
      ...(base || {}),
      id: baseId,
      name: name || baseId,
      ...(efforts.size > 0 ? { supportsReasoning: true, supportsThinking: true, supportedThinkingEfforts: [...efforts] } : {}),
      ...(thinkingModelId ? { thinkingModelId, supportsReasoning: true, supportsThinking: true } : {}),
      ...(tieredModelId ? { tieredModelId } : {}),
      ...(Object.keys(effortModelIds).length > 0 ? { effortModelIds } : {}),
    });
    emitted.add(baseId);
  }

  return output;
}
