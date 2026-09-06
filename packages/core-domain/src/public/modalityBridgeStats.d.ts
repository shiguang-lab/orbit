export interface BridgeModalityStats {
  attempts: number;
  averageLatencyMs: number;
  bridged: number;
  cacheHits: number;
  resultCacheBytes: number;
  resultCacheHits: number;
  resultCacheLatencyMs: number;
  resultSingleflightCoalesced: number;
  failures: number;
  fusionRuns: number;
  fusionPartials: number;
  lastUsedAt: string | null;
  latencySamples: number;
  successes: number;
  totalLatencyMs: number;
}

export type BridgeModality = "vision" | "audio" | "video";

export function getBridgeStats(): Record<BridgeModality, BridgeModalityStats>;
export function buildModalityBridgeHeader(
  results: Array<{
    guardrail: string;
    meta?: Record<string, unknown> | null;
  }>,
): string | null;
