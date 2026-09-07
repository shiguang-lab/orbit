export type NumericModelCapabilityOverrideKey =
  | "max_input_tokens"
  | "max_output_tokens"
  | "max_token";
export type ModelCapabilityOverrideKey = NumericModelCapabilityOverrideKey | "reasoning_efforts";
export interface ModelCapabilityOverrideBase {
  provider: string;
  modelId: string;
  target: string;
  refreshedAt: string;
}
export type ModelCapabilityOverride =
  | (ModelCapabilityOverrideBase & { key: NumericModelCapabilityOverrideKey; value: number })
  | (ModelCapabilityOverrideBase & { key: "reasoning_efforts"; value: readonly string[] });
export type NestedMaxTokenOverrideMap = ReadonlyMap<string, ReadonlyMap<string, number>>;
export function parseModelOverrideTarget(target: unknown): { provider: string; modelId: string } | null;
export function getModelCapabilityOverride(provider: string | null | undefined, modelId: string | null | undefined, key: NumericModelCapabilityOverrideKey, bulkMaxTokenOverrides?: NestedMaxTokenOverrideMap | null): number | null;
export function getReasoningEffortsOverride(provider: string | null | undefined, modelId: string | null | undefined, bulk?: ReadonlyMap<string, ReadonlyMap<string, readonly string[]>> | null): readonly string[] | null;
export function setModelCapabilityOverride(target: string, key: ModelCapabilityOverrideKey, value: number | string | readonly string[]): boolean;
export function removeModelCapabilityOverride(target: string, key: ModelCapabilityOverrideKey): boolean;
export function listModelCapabilityOverrides(): ModelCapabilityOverride[];
