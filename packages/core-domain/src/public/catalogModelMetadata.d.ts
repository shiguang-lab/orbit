export interface CanonicalModelMetadata {
  provider: string | null;
  model: string;
  limits: { contextWindow: number | null };
  metadata: { source: { providerRegistry: boolean; staticSpec: boolean; syncedCapability: boolean } };
}
export function getCanonicalModelMetadata(input: {
  provider: string;
  model: string;
}): CanonicalModelMetadata | null;
