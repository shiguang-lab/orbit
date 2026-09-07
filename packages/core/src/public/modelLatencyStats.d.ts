export interface ModelLatencyStatsEntry {
  provider: string;
  model: string;
  key: string;
  totalRequests: number;
  successfulRequests: number;
  successRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  latencyStdDev: number;
  windowHours: number;
  avgTtftMs: number;
  avgE2ELatencyMs: number;
  avgTokensPerSecond: number;
}

export interface ModelLatencyStatsOptions {
  windowHours?: number;
  minSamples?: number;
  maxRows?: number;
  provider?: string;
  model?: string;
}

export function getModelLatencyStats(
  options?: ModelLatencyStatsOptions,
): Promise<Record<string, ModelLatencyStatsEntry>>;
