import type { z } from "zod";

export type ChaosMode = "parallel" | "collaborative";
export interface ChaosConfig {
  enabled: boolean;
  defaultMode: ChaosMode;
  providerOverrides: Array<{ providerId: string; modelId?: string; enabled: boolean }>;
  systemPrompt?: string;
  timeoutMs: number;
  maxTokens: number;
}
export declare const chaosConfigSchema: z.ZodType<ChaosConfig>;
export declare const DEFAULT_CHAOS_CONFIG: ChaosConfig;
export declare function getChaosConfig(): Promise<ChaosConfig>;
export declare function setChaosConfig(config: ChaosConfig): Promise<ChaosConfig>;
export declare function resetChaosConfig(): Promise<ChaosConfig>;
