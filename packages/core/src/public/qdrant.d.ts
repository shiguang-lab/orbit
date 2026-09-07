export type QdrantQuantization = "none" | "int8" | "binary";
export interface QdrantConfig {
  enabled: boolean;
  host: string;
  port: number;
  apiKey: string | null;
  collection: string;
  embeddingModel: string;
  quantization: QdrantQuantization;
  vectorSize: number;
  hnswEfConstruct: number;
}
export type QdrantCollectionMetadata =
  | { exists: false }
  | { exists: true; vectorSize: number; vectorName: string | null };
export function normalizeQdrantConfig(settings: Record<string, unknown>): QdrantConfig;
export function getQdrantConfig(): Promise<QdrantConfig>;
export function getQdrantCollectionMetadata(): Promise<QdrantCollectionMetadata | null>;
export function checkQdrantHealth(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
  collection?: QdrantCollectionMetadata;
}>;
export function searchSemanticMemory(
  query: string,
  topK?: number,
  scope?: { apiKeyId?: string; sessionId?: string | null },
): Promise<{
  ok: boolean;
  latencyMs: number;
  results?: Array<{ id: string; score: number; payload?: Record<string, unknown> }>;
  error?: string;
}>;
export function cleanupSemanticMemoryPoints(input: {
  retentionDays: number;
}): Promise<{ ok: boolean; deletedCount: number; latencyMs: number; error?: string }>;
export function upsertSemanticMemoryPoint(input: {
  id: string;
  apiKeyId: string;
  sessionId: string;
  key: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  expiresAt: string | null;
}): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
export function deleteSemanticMemoryPoint(id: string): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}>;
