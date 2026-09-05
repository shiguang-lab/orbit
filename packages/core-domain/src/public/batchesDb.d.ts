export interface BatchRecord {
  id: string;
  endpoint: string;
  completionWindow: string;
  status: string;
  inputFileId: string;
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
