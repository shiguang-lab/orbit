export function createBackup(toolId: string, filePath: string): Promise<string | null>;
export function createMultiBackup(toolId: string, filePaths: string[]): Promise<Array<string | null>>;
