import {
  deleteCombo,
  getComboById,
  getComboByName,
  getCombos,
  updateCombo,
} from "@shiguang-gateway/core-domain/db/local-db";
import { isCloudEnabled } from "@shiguang-gateway/core-domain/control/settings";
import { syncToCloud } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { updateComboSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { normalizeComboModels } from "@shiguang-gateway/core-domain/shared/combo-steps";
import { validateComboDAG, clampComboDepth } from "@shiguang-gateway/open-sse/services/combo";
import {
  buildComboNameCollisionWarning,
  comboErrorResponse,
  ComboInvariantError,
  validateCompositeTiersConfig,
} from "../combo-admin.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

type ComboRow = {
  id?: string;
  name: string;
  config?: unknown;
  models?: unknown;
  strategy?: string;
};

const QUOTA_MODEL_PREFIX = "qtSd/";
const LEGACY_REMOVED_COMBO_CONFIG_KEYS = new Set([
  "queueDepth", "fallbackDelayMs", "handoffProviders", "maxComboDepth", "manifestRouting",
  "complexityAwareRouting", "pipeline_enabled", "pipelineConcurrency", "shadowRouting",
  "evalRouting", "resetAwareEnabled", "resetAwareWindow",
]);

function stripLegacyConfig(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const next: Record<string, unknown> = {};
  let changed = false;
  for (const [key, item] of Object.entries(value)) {
    if (LEGACY_REMOVED_COMBO_CONFIG_KEYS.has(key)) changed = true;
    else next[key] = item;
  }
  return changed ? next : value;
}

export async function getCombo(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const combo = await getComboById(id);
    return combo ? Response.json(combo) : comboErrorResponse("COMBO_007", 404, { id }, request);
  } catch (error) {
    console.error("Error fetching combo:", error);
    return comboErrorResponse("INTERNAL_001", 500, undefined, request);
  }
}

export async function updateComboHandler(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return comboErrorResponse("COMBO_001", 400, { field: "body", reason: "Invalid JSON body" }, request); }

  try {
    const validation = validateBody(updateComboSchema, rawBody);
    if (isValidationFailure(validation)) {
      const first = (validation.error as any).details?.[0] ?? null;
      return comboErrorResponse("COMBO_002", 400, {
        issues: validation.error,
        firstField: first?.field ?? null,
        firstMessage: first?.message ?? null,
      }, request);
    }
    const current = await getComboById(id) as ComboRow | null;
    if (!current) return comboErrorResponse("COMBO_007", 404, { id }, request);
    if (current.name.startsWith(QUOTA_MODEL_PREFIX)) {
      return comboErrorResponse("COMBO_006", 409, { name: current.name, source: "quota-share" }, request);
    }
    const allCombos = await getCombos() as any[];
    const data: Record<string, unknown> = { ...(validation.data as Record<string, unknown>) };
    const comboName = (data.name as string | undefined) || current.name;
    if (data.compressionOverride !== undefined) {
      const config = current.config && typeof current.config === "object" && !Array.isArray(current.config)
        ? { ...(current.config as Record<string, unknown>) } : {};
      if (data.compressionOverride) config.compressionMode = data.compressionOverride;
      else delete config.compressionMode;
      data.config = config;
      delete data.compressionOverride;
    }
    if (data.config && typeof data.config === "object") data.config = stripLegacyConfig(data.config);
    if (Array.isArray(data.models)) {
      data.models = normalizeComboModels(data.models, { comboName, allCombos });
    }
    const nextState = { ...current, ...data, name: comboName };
    if (requiresQuotaOnlyComboRef(nextState)) {
      return comboErrorResponse("COMBO_002", 400, { firstField: "config.nestedComboMode", firstMessage: "Quota-only combo references require nestedComboMode execute" }, request);
    }
    const compositeValidation = validateCompositeTiersConfig(nextState);
    if (!compositeValidation.success) return comboErrorResponse("COMBO_003", 400, { reason: compositeValidation.error.message, details: compositeValidation.error.details }, request);
    if (data.name) {
      const existing = await getComboByName(String(data.name));
      if (existing && (existing as { id?: string }).id !== id) return comboErrorResponse("COMBO_004", 400, { name: data.name, conflictingId: (existing as { id?: string }).id }, request);
    }
    if (data.models) {
      const updated = allCombos.map((combo) => (combo.id === id ? { ...combo, ...data } : combo));
      try {
        validateComboDAG(String(comboName), updated, new Set(), 0, clampComboDepth((nextState.config as { maxComboDepth?: unknown } | undefined)?.maxComboDepth));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const reason = /cycle/i.test(message) ? "cycle-detected" : /depth/i.test(message) ? "max-depth-exceeded" : "invalid-graph";
        return comboErrorResponse("COMBO_005", 400, { comboName, reason }, request);
      }
    }
    const combo = await updateCombo(id, data as any) as any;
    await syncToCloudIfEnabled();
    const warning = buildComboNameCollisionWarning(String(comboName));
    return Response.json(warning ? { ...combo, warning } : combo);
  } catch (error) {
    if (error instanceof ComboInvariantError) return comboErrorResponse("COMBO_008", 400, { reason: error.message }, request);
    console.error("Error updating combo:", error);
    return comboErrorResponse("INTERNAL_001", 500, undefined, request);
  }
}

export async function deleteComboHandler(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const existing = await getComboById(id) as ComboRow | null;
    if (!existing) return comboErrorResponse("COMBO_007", 404, { id }, request);
    if (existing.name.startsWith(QUOTA_MODEL_PREFIX)) return comboErrorResponse("COMBO_006", 409, { name: existing.name, source: "quota-share" }, request);
    if (!(await deleteCombo(id))) return comboErrorResponse("COMBO_007", 404, { id }, request);
    await syncToCloudIfEnabled();
    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting combo:", error);
    return comboErrorResponse("INTERNAL_001", 500, undefined, request);
  }
}

export const patchComboHandler = updateComboHandler;

function requiresQuotaOnlyComboRef(value: { models?: unknown; strategy?: unknown; config?: unknown }): boolean {
  const models = Array.isArray(value.models) ? value.models : [];
  const hasProtectedRef = models.some((step) => step && typeof step === "object" && (step as Record<string, unknown>).kind === "combo-ref" && (step as Record<string, unknown>).fallbackOnlyOnQuotaExhaustion === true);
  const config = value.config && typeof value.config === "object" && !Array.isArray(value.config) ? value.config as Record<string, unknown> : {};
  return (value.strategy === undefined || value.strategy === "priority") && hasProtectedRef && config.nestedComboMode !== "execute";
}

async function syncToCloudIfEnabled(): Promise<void> {
  try {
    if (!(await isCloudEnabled())) return;
    await syncToCloud(await getConsistentMachineId());
  } catch (error) { console.warn("Error syncing combos to cloud:", error); }
}
