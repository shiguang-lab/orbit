import { randomUUID } from "node:crypto";
import { PROVIDER_MODELS } from "@shiguang-gateway/core-domain/catalog/provider-models";
import { buildAliasMaps, getComboTargetModelId } from "@shiguang-gateway/core-domain/catalog/combo-targets";
import { getCanonicalModelMetadata } from "@shiguang-gateway/core-domain/catalog/model-metadata";
import { normalizeComboModels } from "@shiguang-gateway/core-domain/shared/combo-steps";
import { ComboInvariantError } from "@shiguang-gateway/core-domain/shared/combo-invariants";
import { getSourcedTokenLimit } from "@shiguang-gateway/open-sse/services/context-manager";
import { resolveNestedComboTargets } from "@shiguang-gateway/open-sse/services/combo";

type RecordLike = Record<string, unknown>;
type ComboErrorCode = "COMBO_001" | "COMBO_002" | "COMBO_003" | "COMBO_004" | "COMBO_005" | "COMBO_006" | "COMBO_007" | "COMBO_008" | "VALID_001" | "VALID_002" | "INTERNAL_001";

function isRecord(value: unknown): value is RecordLike {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Validate the control-plane composite-tier configuration before persistence. */
export function validateCompositeTiersConfig(combo: { name?: unknown; models?: unknown; config?: unknown }) {
  if (!isRecord(combo.config) || combo.config.compositeTiers == null) return { success: true as const };
  const composite = combo.config.compositeTiers;
  if (!isRecord(composite)) return failure([{ field: "config.compositeTiers", message: "compositeTiers must be an object" }]);
  const defaultTier = text(composite.defaultTier);
  const tiers = isRecord(composite.tiers) ? composite.tiers : null;
  const details: Array<{ field: string; message: string }> = [];
  if (!defaultTier) details.push({ field: "config.compositeTiers.defaultTier", message: "defaultTier is required" });
  if (!tiers || Object.keys(tiers).length === 0) {
    details.push({ field: "config.compositeTiers.tiers", message: "tiers must define at least one tier" });
    return failure(details);
  }
  const steps = normalizeComboModels(combo.models as unknown[] | undefined ?? [], { comboName: text(combo.name) });
  const stepIds = new Set(steps.map((step) => text((step as RecordLike).id)).filter((id): id is string => !!id));
  const entries = new Map<string, { stepId: string; fallbackTier: string | null }>();
  const owners = new Map<string, string>();
  for (const [rawName, rawValue] of Object.entries(tiers)) {
    const name = text(rawName);
    const base = `config.compositeTiers.tiers.${rawName}`;
    if (!name) { details.push({ field: base, message: "tier name must be a non-empty string" }); continue; }
    if (!isRecord(rawValue)) { details.push({ field: base, message: "tier config must be an object" }); continue; }
    const stepId = text(rawValue.stepId);
    const fallbackTier = text(rawValue.fallbackTier);
    if (!stepId) { details.push({ field: `${base}.stepId`, message: "stepId is required" }); continue; }
    if (!stepIds.has(stepId)) details.push({ field: `${base}.stepId`, message: `stepId "${stepId}" does not exist in combo.models` });
    const owner = owners.get(stepId);
    if (owner && owner !== name) details.push({ field: `${base}.stepId`, message: `stepId "${stepId}" is already assigned to tier "${owner}"` });
    else owners.set(stepId, name);
    if (fallbackTier === name) details.push({ field: `${base}.fallbackTier`, message: "fallbackTier cannot reference the same tier" });
    entries.set(name, { stepId, fallbackTier });
  }
  if (defaultTier && !entries.has(defaultTier)) details.push({ field: "config.compositeTiers.defaultTier", message: `defaultTier "${defaultTier}" does not exist in tiers` });
  for (const [name, entry] of entries) {
    if (entry.fallbackTier && !entries.has(entry.fallbackTier)) details.push({ field: `config.compositeTiers.tiers.${name}.fallbackTier`, message: `fallbackTier "${entry.fallbackTier}" does not exist in tiers` });
  }
  const state = new Map<string, "visiting" | "visited">();
  const visit = (name: string, path: string[]) => {
    if (state.get(name) === "visited") return;
    if (state.get(name) === "visiting") { details.push({ field: `config.compositeTiers.tiers.${name}.fallbackTier`, message: `fallbackTier cycle detected: ${[...path, name].join(" -> ")}` }); return; }
    state.set(name, "visiting");
    const next = entries.get(name)?.fallbackTier;
    if (next && entries.has(next)) visit(next, [...path, name]);
    state.set(name, "visited");
  };
  for (const name of entries.keys()) visit(name, []);
  return details.length ? failure(details) : { success: true as const };
}
function failure(details: Array<{ field: string; message: string }>) {
  return { success: false as const, error: { message: "Invalid composite tiers", details } };
}

/** Compute the minimum known context window for the combo's concrete targets. */
export function computeComboContextLength(combo: { models?: unknown[]; context_length?: number; name?: string }, allCombos: Array<{ models?: unknown[]; name?: string }>): number | undefined {
  if (typeof combo.context_length === "number" && Number.isFinite(combo.context_length) && combo.context_length > 0) return combo.context_length;
  const targets = resolveNestedComboTargets(combo, allCombos);
  if (!Array.isArray(targets) || targets.length === 0) return undefined;
  const aliases = buildAliasMaps();
  const values = targets.flatMap((target) => {
    const resolved = getComboTargetModelId(aliases, target);
    if (!resolved) return [];
    const metadata = getCanonicalModelMetadata({ provider: resolved.providerId, model: resolved.modelId });
    if (!metadata) return [];
    const source = metadata.metadata?.source;
    if (!source?.providerRegistry && !source?.staticSpec && !source?.syncedCapability) return [];
    const value = getSourcedTokenLimit(resolved.providerId, resolved.modelId, metadata.limits.contextWindow);
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? [value] : [];
  });
  return values.length ? Math.min(...values) : undefined;
}

let collisionIndex: Map<string, { providerId: string; modelId: string }> | undefined;
function getCollisionIndex() {
  if (collisionIndex) return collisionIndex;
  collisionIndex = new Map();
  for (const [providerId, models] of Object.entries(PROVIDER_MODELS)) for (const model of models) {
    if (typeof model.id === "string" && !collisionIndex.has(model.id)) collisionIndex.set(model.id, { providerId, modelId: model.id });
  }
  return collisionIndex;
}
export function buildComboNameCollisionWarning(name: string) {
  const collision = name ? getCollisionIndex().get(name) : undefined;
  return collision ? { code: "COMBO_NAME_SHADOWS_MODEL" as const, ...collision } : null;
}

const ERROR_MESSAGES: Record<ComboErrorCode, { message: string; category: string; status: number }> = {
  COMBO_001: { message: "Request body is not valid JSON", category: "COMBO", status: 400 },
  COMBO_002: { message: "One or more combo fields are invalid", category: "COMBO", status: 400 },
  COMBO_003: { message: "Composite tier configuration is invalid", category: "COMBO", status: 400 },
  COMBO_004: { message: "A combo with this name already exists", category: "COMBO", status: 400 },
  COMBO_005: { message: "Combo reference graph is invalid (cycle or excessive depth)", category: "COMBO", status: 400 },
  COMBO_006: { message: "This combo is managed by Quota Share and cannot be modified here", category: "COMBO", status: 409 },
  COMBO_007: { message: "Combo not found", category: "COMBO", status: 404 },
  COMBO_008: { message: "Combo target violates its provider or model family invariant", category: "COMBO", status: 400 },
  VALID_001: { message: "Invalid request body", category: "VALIDATION", status: 400 },
  VALID_002: { message: "Missing required field", category: "VALIDATION", status: 400 },
  INTERNAL_001: { message: "Internal server error", category: "INTERNAL", status: 500 },
};
export function comboErrorResponse(code: ComboErrorCode, status?: number, details?: unknown, request?: Request): Response {
  const definition = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_001;
  const requestId = request?.headers.get("x-request-id") ?? randomUUID();
  return Response.json({ error: { code, message: definition.message, category: definition.category, ...(details !== undefined ? { details } : {}), requestId } }, { status: status ?? definition.status, headers: { "x-request-id": requestId } });
}

export { ComboInvariantError };
