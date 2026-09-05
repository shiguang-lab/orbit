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

export function getComboByName(name: string): Promise<unknown>;
export function getCombos(limit?: number, offset?: number): Promise<unknown[]>;
export function getDatabaseSettings(): unknown;
export function getApiKeyMetadata(apiKey: string | null | undefined): Promise<any>;

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
