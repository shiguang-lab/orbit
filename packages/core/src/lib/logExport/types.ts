import type { ZodType } from "zod";

export interface LogExportRecord {
  id: string;
  timestamp: string | null;
  method: string | null;
  path: string | null;
  status: number | null;
  model: string | null;
  requestedModel: string | null;
  provider: string | null;
  providerDisplay: string | null;
  account: string | null;
  connectionId: string | null;
  duration: number | null;
  tokensIn: number | null;
  tokensOut: number | null;
  tokensCacheRead: number | null;
  tokensCacheWrite: number | null;
  tokensReasoning: number | null;
  tokensCompressed: number | null;
  cacheSource: string | null;
  requestType: string | null;
  sourceFormat: string | null;
  targetFormat: string | null;
  apiKeyId: string | null;
  apiKeyName: string | null;
  comboName: string | null;
  comboStepId: string | null;
  comboExecutionKey: string | null;
  errorSummary: string | null;
  errorType: string | null;
  correlationId: string | null;
  sessionTag: string | null;
  modelPinned: boolean;
  detailState: string | null;
  hasRequestBody: boolean;
  hasResponseBody: boolean;
  hasPipelineDetails: boolean;
  requestBody: string | null;
  responseBody: string | null;
  pipelineRouteDecision: string | null;
  pipelineClientRequest: string | null;
  pipelineOpenaiRequest: string | null;
  pipelineProviderRequest: string | null;
  pipelineProviderResponse: string | null;
  pipelineClientResponse: string | null;
  pipelineError: string | null;
  bodiesTruncated: boolean;
}

export interface LogExportSourceRow {
  rowId: number;
  record: LogExportRecord;
}

export type LogExportFieldType = "text" | "password" | "textarea" | "number" | "boolean";
export interface LogExportConfigField {
  key: string;
  label: string;
  type: LogExportFieldType;
  required?: boolean;
  secret?: boolean;
  help?: string;
  placeholder?: string;
  options?: ReadonlyArray<{ value: string; label: string }>;
}
export interface LogExportClient {
  test(): Promise<{ ok: boolean; detail: string }>;
  prepare(): Promise<void>;
  send(records: readonly LogExportRecord[]): Promise<void>;
}
export interface LogExportDestinationType<TConfig = Record<string, unknown>> {
  id: string;
  label: string;
  description: string;
  docsUrl?: string;
  secretFields: readonly string[];
  fields: readonly LogExportConfigField[];
  configSchema: ZodType<TConfig>;
  createClient(config: TConfig): LogExportClient;
}
