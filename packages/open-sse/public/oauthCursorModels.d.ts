export interface CursorAgentModelEntry {
  id: string;
  name: string;
  owned_by: string;
}
export type FetchCursorAvailableModelsOptions = {
  accessToken: string;
  machineId?: string | null;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};
export function normalizeCursorAvailableModelsPayload(payload: unknown): CursorAgentModelEntry[];
export function ensureCursorAutoCatalogEntry(models: CursorAgentModelEntry[]): CursorAgentModelEntry[];
export const CURSOR_AUTO_ROUTER_VARIANT_IDS: readonly ["auto-cost", "auto-balance", "auto-intelligence"];
export function fetchCursorAvailableModels(
  options: FetchCursorAvailableModelsOptions
): Promise<CursorAgentModelEntry[]>;
