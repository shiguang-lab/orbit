export declare enum MemoryType {
  FACTUAL = "factual",
  EPISODIC = "episodic",
  PROCEDURAL = "procedural",
  SEMANTIC = "semantic",
}

export interface Memory {
  id: string;
  apiKeyId: string;
  sessionId: string;
  type: MemoryType;
  key: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  accessCount: number;
  lastAccessedAt: Date | null;
}

export interface MemoryManager {
  create(input: {
    apiKeyId: string;
    sessionId: string;
    type: MemoryType;
    key: string;
    content: string;
    metadata?: Record<string, unknown>;
    expiresAt?: Date | null;
  }): Promise<Memory>;
  get(id: string): Promise<Memory | null>;
  update(id: string, updates: Partial<Omit<Memory, "id" | "createdAt">>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
  list(filter: {
    apiKeyId?: string;
    type?: MemoryType;
    sessionId?: string;
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Memory[]; total: number; byType: Record<string, number> }>;
}

export declare const memoryManager: MemoryManager;
export declare const memoryCache: {
  stats(): { size: number; maxSize: number; hits: number; misses: number };
};
export declare function getMemoryTokensUsed(apiKeyId?: string): number;

export interface EmbeddingProviderListing {
  provider: string;
  hasKey: boolean;
  models: Array<{ id: string; name: string; dimensions: number | null }>;
}
export declare function listEmbeddingProviders(): Promise<EmbeddingProviderListing[]>;

export interface MemoryEngineStatus {
  keyword: { available: boolean; backend: "FTS5" | "none"; reason: string };
  embedding: {
    source: "remote" | "static" | "transformers" | null;
    model: string | null;
    dimensions: number | null;
    available: boolean;
    reason: string;
    cacheStats: { hits: number; misses: number; size: number };
  };
  vectorStore: {
    backend: "sqlite-vec" | "qdrant" | "none";
    available: boolean;
    rowCount: number;
    needsReindex: number;
    reason: string;
  };
  qdrant: {
    enabled: boolean;
    healthy: boolean | null;
    latencyMs: number | null;
    error: string | null;
  };
  rerank: {
    enabled: boolean;
    provider: string | null;
    model: string | null;
    available: boolean;
    reason: string;
  };
}
export declare function engineStatus(): Promise<MemoryEngineStatus>;

export interface RetrievePreviewBundle {
  items: Array<{
    memory: Memory;
    score: number;
    tokens: number;
    tier: "fts5" | "vector" | "hybrid-rrf" | "qdrant";
    vecScore: number | null;
    ftsScore: number | null;
  }>;
  resolution: {
    embeddingSource: "remote" | "static" | "transformers" | null;
    embeddingModel: string | null;
    vectorStore: "sqlite-vec" | "qdrant" | "none";
    strategyUsed: "exact" | "semantic" | "hybrid";
    rerankApplied: boolean;
    fallbackReason: string | null;
  };
  totalTokens: number;
  budgetMaxTokens: number;
}
export declare function retrievePreview(
  apiKeyId: string | null,
  query: string,
  options: { strategy: "exact" | "semantic" | "hybrid"; maxTokens: number; limit: number },
): Promise<RetrievePreviewBundle>;

export declare function verifyExtractionPipeline(
  apiKeyId: string,
): Promise<{ working: boolean; latencyMs: number; error?: string }>;
export declare function runReindexBatch(limit?: number): Promise<{ processed: number; errors: number }>;
export declare function getReindexPending(): number;
export declare function markAllMemoriesNeedReindex(): void;
export declare function summarizeMemoriesOlderThan(
  apiKeyId: string | undefined,
  days: number,
  dryRun: boolean,
): Promise<{
  candidates: Memory[];
  totalTokens: number;
  deletedCount: number;
  summaryId: string | null;
  dryRun: boolean;
}>;
