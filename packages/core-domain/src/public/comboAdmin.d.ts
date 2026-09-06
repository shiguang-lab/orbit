export function validateCompositeTiersConfig(combo: { name?: unknown; models?: unknown; config?: unknown }):
  | { success: true }
  | { success: false; error: { message: string; details: unknown[] } };
export function computeComboContextLength(combo: { models?: unknown[]; context_length?: number; name?: string }, allCombos: Array<{ models?: unknown[]; name?: string }>): number | undefined;
export function buildComboNameCollisionWarning(name: string): { code: "COMBO_NAME_SHADOWS_MODEL"; modelId: string; providerId: string } | null;
export class ComboInvariantError extends Error {}
export type ComboErrorCode = "COMBO_001" | "COMBO_002" | "COMBO_003" | "COMBO_004" | "COMBO_005" | "COMBO_006" | "COMBO_007" | "COMBO_008" | "VALID_001" | "VALID_002" | "INTERNAL_001";
export function comboErrorResponse(code: ComboErrorCode, status?: number, details?: unknown, request?: Request): Response;
