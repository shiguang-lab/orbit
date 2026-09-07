export interface MemorySettings {
  enabled: boolean;
  maxTokens: number;
  retentionDays: number;
  strategy: "recent" | "semantic" | "hybrid";
  skillsEnabled: boolean;
  embeddingSource: "remote" | "static" | "transformers" | "auto";
  embeddingProviderModel: string | null;
  customBaseUrl: string | null;
  customModelId: string | null;
  transformersEnabled: boolean;
  staticEnabled: boolean;
  rerankEnabled: boolean;
  rerankProviderModel: string | null;
  vectorStore: "sqlite-vec" | "qdrant" | "auto";
  primaryBackend: string;
  fallbackBackends: string[];
  backendConfigs: Record<string, Record<string, unknown>>;
}

export function normalizeMemorySettings(rawSettings?: Record<string, unknown>): MemorySettings;
export function getMemorySettings(): Promise<MemorySettings>;
export function toMemorySettingsUpdates(settings: Partial<MemorySettings>): Record<string, unknown>;
export function invalidateMemorySettingsCache(): void;
