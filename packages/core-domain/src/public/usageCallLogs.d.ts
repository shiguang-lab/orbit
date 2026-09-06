export type CallLogDetailState = "none" | "ready" | "missing" | "corrupt" | "legacy-inline";

export interface CallLogFilter {
  status?: "error" | "ok" | string;
  model?: string;
  provider?: string;
  account?: string;
  apiKey?: string;
  correlationId?: string;
  sessionTag?: string;
  combo?: boolean;
  excludeTests?: boolean;
  since?: string | Date;
  until?: string | Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CallLogSummary {
  id: string;
  timestamp: string | null;
  method: string | null;
  path: string | null;
  status: number;
  model: string | null;
  requestedModel: string | null;
  provider: string | null;
  providerDisplay: string | null;
  account: string | null;
  connectionId: string | null;
  duration: number;
  tokens: {
    in: number;
    out: number;
    cacheRead: number | null;
    cacheWrite: number | null;
    reasoning: number | null;
    compressed: number | null;
  };
  cacheSource: string;
  requestType: string | null;
  sourceFormat: string | null;
  targetFormat: string | null;
  apiKeyId: string | null;
  apiKeyName: string | null;
  comboName: string | null;
  comboStepId: string | null;
  comboExecutionKey: string | null;
  error: string | null;
  detailState: CallLogDetailState;
  artifactRelPath: string | null;
  artifactSizeBytes: number | null;
  artifactSha256: string | null;
  requestSummary: unknown;
  hasRequestBody: boolean;
  hasResponseBody: boolean;
  hasPipelineDetails: boolean;
  correlationId: string | null;
  modelPinned: boolean;
  sessionTag: string | null;
}

export type CallLogDetail = Omit<CallLogSummary, "error"> & {
  requestBody: unknown;
  responseBody: unknown;
  error: unknown;
  pipelinePayloads: unknown;
  active: false;
};

export interface DeleteCallLogsResult {
  deletedRows: number;
  deletedArtifacts: number;
}

export function saveCallLog(entry: Record<string, unknown>): Promise<void>;
export function waitForCallLogSaves(timeoutMs: number): Promise<boolean>;
export function closeCallLogSaves(timeoutMs?: number): Promise<void>;
export function getCallLogs(filter?: CallLogFilter): Promise<CallLogSummary[]>;
export function getCallLogById(id: string): Promise<CallLogDetail | null>;
export function exportCallLogsSince(since: string): Promise<CallLogDetail[]>;
export function cleanupOrphanCallLogFiles(
  baseDir?: string | null,
  options?: { maxCandidates?: number; maxScanEntries?: number; minAgeMs?: number },
): number;
export function cleanupOverflowCallLogFiles(
  baseDir?: string | null,
  maxEntries?: number,
  maxDeletes?: number,
): number;
export function deleteCallLogsBefore(cutoff: string, maxDeletes?: number): DeleteCallLogsResult;
export function trimCallLogsToMaxRows(maxRows?: number, maxDeletes?: number): DeleteCallLogsResult;
export function rotateCallLogs(): void;
export function scheduleCallLogRotation(): void;
