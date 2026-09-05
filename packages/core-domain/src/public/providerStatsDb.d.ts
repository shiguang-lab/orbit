export interface ProviderCallStat {
  provider: string;
  nodeName: string | null;
  totalRequests: number;
  successfulRequests: number;
  avgLatencyMs: number | null;
  totalTokensIn: number | null;
  totalTokensOut: number | null;
}
export interface ModelCallStat {
  provider: string;
  nodeName: string | null;
  model: string;
  requests: number;
  avgLatencyMs: number | null;
  successfulRequests: number;
}
export function getProviderCallStats(): ProviderCallStat[];
export function getModelCallStats(): ModelCallStat[];
