export interface FileRecord {
  id: string;
  bytes: number;
  createdAt: number;
  filename: string;
  purpose: string;
  content?: Buffer | null;
  mimeType?: string | null;
  apiKeyId?: string | null;
  expiresAt?: number | null;
  deletedAt?: number | null;
}

export function createFile(file: Omit<FileRecord, "id" | "createdAt">): FileRecord;
export function getFile(id: string): FileRecord | null;
export function getFileContent(id: string): Buffer | null;
export function listFiles(options?: {
  apiKeyId?: string;
  purpose?: string;
  limit?: number;
  after?: string;
  order?: "asc" | "desc";
}): FileRecord[];
export function countFiles(options?: { apiKeyId?: string; purpose?: string }): number;
export function formatFileResponse(file: FileRecord): {
  id: string;
  bytes: number;
  created_at: number;
  filename: string;
  object: "file";
  purpose: string;
  expires_at: number | null;
};
export function deleteFile(id: string): boolean;

export interface BatchRecord {
  id: string;
  endpoint: string;
  completionWindow: string;
  status: string;
  inputFileId: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  createdAt: number;
  [key: string]: any;
}
export function createBatch(input: any): BatchRecord;
export function getBatch(id: string): BatchRecord | null;
export function updateBatch(id: string, updates: Partial<BatchRecord>): boolean;
export function listBatches(apiKeyId?: string, limit?: number, after?: string): BatchRecord[];
export function countBatches(apiKeyId?: string): number;
export function deleteBatch(id: string): boolean;
export function deleteCompletedBatches(): { deletedBatches: number; deletedFiles: number };

export type WebhookKind = "slack" | "telegram" | "discord" | "custom";
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  enabled: boolean;
  description: string;
  created_at: string;
  last_triggered_at: string | null;
  last_status: number | null;
  failure_count: number;
  kind: WebhookKind;
  metadata_encrypted: string | null;
}
export function getWebhooks(options?: { limit?: number; offset?: number }): { webhooks: Webhook[]; total: number };
export function getWebhook(id: string): Webhook | null;
export function createWebhook(data: { url: string; events?: string[]; secret?: string; description?: string; kind?: WebhookKind; metadataEncrypted?: string | null }): Webhook;
export function updateWebhookRecord(id: string, data: Partial<{ url: string; events: string[]; secret: string; enabled: boolean; description: string; kind: WebhookKind; metadataEncrypted: string | null }>): Webhook | null;
export function deleteWebhook(id: string): boolean;
export function recordWebhookDelivery(id: string, status: number, success: boolean): void;
export function getDeliveries(webhookId: string, limit: number): Array<Record<string, unknown>>;

export type BatchItemCheckpointStatus = "pending" | "processing" | "completed" | "errored";
export interface BatchItemCheckpoint {
  batchId: string;
  lineNumber: number;
  customId: string | null;
  status: BatchItemCheckpointStatus;
  result: any | null;
  error: any | null;
  createdAt: number;
  updatedAt: number;
}
export function getPendingBatches(): BatchRecord[];
export function getTerminalBatches(): BatchRecord[];
export function ensureBatchItemCheckpoints(
  batchId: string,
  items: Array<{ lineNumber: number; customId: string | null }>,
): void;
export function countBatchItemCheckpoints(batchId: string): number;
export function listBatchItemCheckpoints(batchId: string): BatchItemCheckpoint[];
export function markBatchItemProcessing(
  batchId: string,
  item: { lineNumber: number; customId: string | null },
): void;
export function markBatchItemResult(
  batchId: string,
  item: { lineNumber: number; customId: string | null },
  result: unknown,
): void;
export function markBatchItemError(
  batchId: string,
  item: { lineNumber: number; customId: string | null },
  error: unknown,
): void;
export function getApiKeyById(id: string): Promise<{ key?: string | null } | null>;
export function getProxyForLevel(level: string, provider?: string): Promise<unknown | null>;
export function resolveProxyForProvider(provider: string): Promise<unknown | null>;

export function getComboByName(name: string): Promise<unknown>;
export function getComboById(id: string): Promise<unknown>;
export function getCombos(limit?: number, offset?: number): Promise<unknown[]>;
export function getCombosCount(): number;
export function createCombo(data: Record<string, unknown>): Promise<unknown>;
export function updateCombo(id: string, data: Record<string, unknown>): Promise<unknown>;
export function reorderCombos(comboIds: string[]): Promise<unknown[]>;
export function deleteCombo(id: string): Promise<boolean>;
export function pickApiKeyForInternalUse(reason?: string): Promise<string | null>;

export interface ModelComboMapping {
  id: string;
  pattern: string;
  comboId: string;
  comboName?: string;
  priority: number;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}
export interface ModelComboMappingPage {
  items: ModelComboMapping[];
  total: number;
}
export function getModelComboMappings(options?: {
  limit?: number;
  offset?: number;
}): Promise<ModelComboMappingPage>;
export function getModelComboMappingById(id: string): Promise<ModelComboMapping | null>;
export function createModelComboMapping(data: {
  pattern: string;
  comboId: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
}): Promise<ModelComboMapping>;
export function updateModelComboMapping(
  id: string,
  data: Partial<{
    pattern: string;
    comboId: string;
    priority: number;
    enabled: boolean;
    description: string;
  }>,
): Promise<ModelComboMapping | null>;
export function deleteModelComboMapping(id: string): Promise<boolean>;
export function getDatabaseSettings(): unknown;
export function getApiKeyMetadata(apiKey: string | null | undefined): Promise<any>;
export function resolveProxyForConnection(
  connectionId: string,
  apiKeyId?: string,
  providerId?: string,
): Promise<Record<string, unknown> | null>;

export interface BatchRecord {
  id: string;
  endpoint: string;
  completionWindow: string;
  inputFileId: string;
  status: string;
  apiKeyId?: string | null;
  [key: string]: unknown;
}
export function createBatch(input: Record<string, unknown>): BatchRecord;
export function getBatch(id: string): BatchRecord | null;
export function updateBatch(id: string, patch: Record<string, unknown>): boolean;
export function listBatches(apiKeyId?: string, limit?: number, after?: string): BatchRecord[];
export function countBatches(apiKeyId?: string): number;
export function deleteBatch(id: string): boolean;
export function deleteCompletedBatches(): { deletedBatches: number; deletedFiles: number };
