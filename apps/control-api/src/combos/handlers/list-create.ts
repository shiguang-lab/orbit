import {
  createCombo,
  getComboByName,
  getCombos,
  getCombosCount,
} from "@shiguang-gateway/core-domain/db/local-db";
import { isCloudEnabled } from "@shiguang-gateway/core-domain/control/settings";
import { syncToCloud } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { createComboSchema, paginationSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { normalizeComboModels } from "@shiguang-gateway/core-domain/shared/combo-steps";
import { validateComboDAG, clampComboDepth } from "@shiguang-gateway/open-sse/services/combo";
import {
  buildComboNameCollisionWarning,
  comboErrorResponse,
  ComboInvariantError,
  computeComboContextLength,
  validateCompositeTiersConfig,
} from "../combo-admin.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

export async function listCombos(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateBody(paginationSchema, {
      offset: searchParams.get("offset") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const range = validation.data;
    const total = getCombosCount();
    const rawCombos = await getCombos(range.limit, range.offset) as any[];
    const combos = rawCombos.map((combo: any) => ({
      ...combo,
      computed_context_length: computeComboContextLength(combo, rawCombos),
    }));
    return Response.json({ combos, total });
  } catch (error) {
    console.error("Error fetching combos:", error);
    return Response.json({ error: "Failed to fetch combos" }, { status: 500 });
  }
}

export async function createComboHandler(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const validation = validateBody(createComboSchema, await request.json());
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const allCombos = await getCombos();
    const comboInput: any = {
      ...(validation.data as any),
      models: normalizeComboModels(validation.data.models, { comboName: validation.data.name, allCombos: allCombos as never }),
    };
    const compositeValidation = validateCompositeTiersConfig(comboInput);
    if (!compositeValidation.success) {
      return comboErrorResponse("COMBO_003", 400, { reason: compositeValidation.error.message, details: compositeValidation.error.details }, request);
    }
    const existing = await getComboByName(comboInput.name) as any;
    if (existing) return Response.json({ error: "Combo name already exists" }, { status: 400 });
    try {
      validateComboDAG(
        comboInput.name,
        [...allCombos, comboInput],
        new Set(),
        0,
        clampComboDepth((comboInput.config as { maxComboDepth?: unknown } | undefined)?.maxComboDepth),
      );
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : "Invalid combo graph" }, { status: 400 });
    }
    const combo = await createCombo(comboInput as any) as any;
    await syncToCloudIfEnabled();
    const warning = buildComboNameCollisionWarning(comboInput.name);
    return Response.json(warning ? { ...combo, warning } : combo, { status: 201 });
  } catch (error) {
    if (error instanceof ComboInvariantError) return comboErrorResponse("COMBO_008", 400, { reason: error.message }, request);
    console.error("Error creating combo:", error);
    return Response.json({ error: "Failed to create combo" }, { status: 500 });
  }
}

async function syncToCloudIfEnabled(): Promise<void> {
  try {
    if (!(await isCloudEnabled())) return;
    await syncToCloud(await getConsistentMachineId());
  } catch (error) {
    console.warn("Error syncing combos to cloud:", error);
  }
}
