export interface CatalogModel {
  id?: string;
  type?: string;
  output_modalities?: unknown;
  context_length?: unknown;
  max_context_window_tokens?: unknown;
  max_input_tokens?: unknown;
  max_output_tokens?: unknown;
  output_token_limit?: unknown;
}

export type ModelCatalogEntry = string | CatalogModel;

export interface ModelProfile {
  name: string;
  ctx: number;
  compact: number;
  toolLimit: number;
  effort?: string;
  summary?: boolean;
  re?: RegExp;
}

export function categoriseModel(modelId: string): ModelProfile | null;
export function profileNameFromModelId(modelId: string): string;
export function isCodexCompatibleTextModel(model: ModelCatalogEntry): boolean;
export function fallbackCodexProfile(modelId: string, model: ModelCatalogEntry): ModelProfile | null;
