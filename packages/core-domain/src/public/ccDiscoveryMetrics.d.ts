export interface CcDiscoveryMetrics {
  aliasRequests: number;
  discoveryHits: number;
  byModel: Record<string, number>;
}

export function getCcDiscoveryMetrics(): CcDiscoveryMetrics;
