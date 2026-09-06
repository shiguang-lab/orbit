export type CostCalculationOptions = {
  provider?: string | null;
  model?: string | null;
  serviceTier?: string | null;
  flatRateAsZero?: boolean;
};

export type Modality = "image" | "audio" | "rerank" | "video";

export type ModalUsage = {
  n?: number;
  seconds?: number;
  characters?: number;
  searchUnits?: number;
};

export function normalizeModelName(model: string): string;
export function computeCostFromPricing(
  pricing: Record<string, unknown> | null | undefined,
  tokens: Record<string, number | undefined> | null | undefined,
  options?: CostCalculationOptions,
): number;
export function calculateCost(
  provider: string,
  model: string,
  tokens: Record<string, number | undefined> | null | undefined,
  options?: CostCalculationOptions,
): Promise<number>;
export function calculateModalCost(
  modality: Modality,
  provider: string,
  model: string,
  usage: ModalUsage,
): Promise<number>;
