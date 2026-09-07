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
export function listFiles(options?: { apiKeyId?: string; purpose?: string; limit?: number; after?: string; order?: "asc" | "desc" }): FileRecord[];
export function countFiles(options?: { apiKeyId?: string; purpose?: string }): number;
export function formatFileResponse(file: FileRecord): Record<string, unknown>;
export function deleteFile(id: string): boolean;
