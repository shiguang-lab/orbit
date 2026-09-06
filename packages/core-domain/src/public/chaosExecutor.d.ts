export type ChaosMode = "parallel" | "collaborative";
export interface ChaosRunInput {
  task: string;
  providers?: string[];
  mode?: ChaosMode;
  systemPrompt?: string;
  timeoutMs?: number;
  maxTokens?: number;
  apiKey?: string | null;
}
export interface ModelResult {
  providerId: string;
  providerName: string;
  modelId: string;
  status: "success" | "error" | "skipped";
  content: string | null;
  error?: string;
  durationMs: number;
}
export interface ChaosRunResult {
  task: string;
  mode: ChaosMode;
  startedAt: string;
  totalProviders: number;
  totalResults: number;
  models: ModelResult[];
  summary?: string;
}
export declare function executeChaosRun(input: ChaosRunInput): Promise<ChaosRunResult>;
