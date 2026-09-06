export interface BatchRecord {
  id: string;
  endpoint: string;
  completionWindow: string;
  status:
    | "validating"
    | "failed"
    | "in_progress"
    | "finalizing"
    | "completed"
    | "expired"
    | "cancelling"
    | "cancelled";
  inputFileId: string;
  outputFileId?: string | null;
  errorFileId?: string | null;
  createdAt: number;
  inProgressAt?: number | null;
  expiresAt?: number | null;
  finalizingAt?: number | null;
  completedAt?: number | null;
  failedAt?: number | null;
  expiredAt?: number | null;
  cancellingAt?: number | null;
  cancelledAt?: number | null;
  requestCountsTotal: number;
  requestCountsCompleted: number;
  requestCountsFailed: number;
  metadata?: Record<string, unknown> | null;
  apiKeyId?: string | null;
  errors?: unknown | null;
  model?: string | null;
  usage?: unknown | null;
  outputExpiresAfterSeconds?: number | null;
  outputExpiresAfterAnchor?: string | null;
}
export function createBatch(input: Record<string, unknown>): BatchRecord;
export function getBatch(id: string): BatchRecord | null;
export function updateBatch(id: string, updates: Partial<BatchRecord>): boolean;
export function listBatches(apiKeyId?: string, limit?: number, after?: string): BatchRecord[];
export function countBatches(apiKeyId?: string): number;
export function deleteBatch(id: string): boolean;
export function deleteCompletedBatches(): { deletedBatches: number; deletedFiles: number };

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
