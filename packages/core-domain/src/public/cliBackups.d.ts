export interface CliConfigBackup {
  id: string;
  toolId: string;
  originalPath: string;
  createdAt: string;
  size: number;
}

export interface CliConfigRestoreResult {
  restored: true;
  backupId: string;
  originalPath: string;
}

export interface CliConfigDeleteResult {
  deleted: true;
  backupId: string;
}

export function createBackup(toolId: string, filePath: string): Promise<string | null>;
export function createMultiBackup(
  toolId: string,
  filePaths: string[],
): Promise<Array<string | null>>;
export function listBackups(toolId: string): Promise<CliConfigBackup[]>;
export function restoreBackup(
  toolId: string,
  backupId: string,
): Promise<CliConfigRestoreResult>;
export function deleteBackup(
  toolId: string,
  backupId: string,
): Promise<CliConfigDeleteResult>;
