export interface LocalCorpusConfig {
  rootPath: string | null;
  configured: boolean;
}

export interface LocalCorpusStatus {
  configured: boolean;
  source: string | null;
  indexedFiles: number;
  indexedBytes: number;
  chunks: number;
  truncated: boolean;
  lastIndexedAt: string | null;
  limits: {
    maxFiles: number;
    maxFileBytes: number;
    maxTotalBytes: number;
    maxReadLines: number;
  };
}

export function getLocalCorpusRoot(): string | null;
export function setLocalCorpusRoot(rootPath: string): void;
export function clearLocalCorpusRoot(): void;
export function getLocalCorpusConfig(): LocalCorpusConfig;
export function canonicalizeLocalCorpusRoot(inputPath: string): Promise<string>;
export function getDefaultLocalCorpusStatus(): LocalCorpusStatus;
export function getConfiguredLocalCorpusStatus(dynamicRoot?: string): LocalCorpusStatus;
export function resetLocalCorpusIndex(): void;
export function searchConfiguredLocalCorpus(
  query: string,
  options?: { limit?: number; refresh?: boolean; absoluteRootPath?: string; rootPath?: string },
): Promise<unknown>;
export function readConfiguredLocalCorpus(
  relativePath: string,
  options?: { startLine?: number; endLine?: number; absoluteRootPath?: string; rootPath?: string },
): Promise<unknown>;

