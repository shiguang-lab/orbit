export interface ModelContextOverride {
  provider: string;
  modelId: string;
  realContext: number;
  source: "manual" | "auto:discovery";
  refreshedAt: string;
}
export function getModelContextOverrideRecord(
  provider: string | null | undefined,
  modelId: string | null | undefined,
): ModelContextOverride | null;
export function setModelContextOverride(
  provider: string,
  modelId: string,
  realContext: number,
  source?: "manual" | "auto:discovery",
): boolean;
export function removeModelContextOverride(provider: string, modelId: string): boolean;
