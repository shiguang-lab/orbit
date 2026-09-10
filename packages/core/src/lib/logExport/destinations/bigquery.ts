import { z } from "zod";
import { getServiceAccountAccessToken, parseServiceAccountKey, type ServiceAccountKey } from "../googleServiceAccount";
import type { LogExportClient, LogExportDestinationType, LogExportRecord } from "../types";

const API = "https://bigquery.googleapis.com/bigquery/v2";
const SCOPE = "https://www.googleapis.com/auth/bigquery";
const NAME = /^[A-Za-z0-9_]+$/;
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
const MAX_INSERT_REQUEST_BYTES = 9 * 1024 * 1024;

export const bigQueryConfigSchema = z.object({
  projectId: z.string().min(1).max(200), datasetId: z.string().min(1).max(1024).regex(NAME),
  tableId: z.string().min(1).max(1024).regex(NAME), location: z.string().min(1).max(64).default("EU"),
  serviceAccountJson: z.string().min(1), autoCreate: z.boolean().default(true),
  partitionExpirationDays: z.number().int().min(0).max(3650).default(0),
});
export type BigQueryConfig = z.infer<typeof bigQueryConfigSchema>;

export const BIGQUERY_CLUSTERING_FIELDS = ["api_key_name", "provider", "model", "status"] as const;
const FIELD_TYPES: Record<string, string> = {
  id: "STRING", timestamp: "TIMESTAMP", status: "INT64", duration_ms: "INT64", tokens_in: "INT64",
  tokens_out: "INT64", tokens_cache_read: "INT64", tokens_cache_write: "INT64", tokens_reasoning: "INT64",
  tokens_compressed: "INT64", model_pinned: "BOOL", has_request_body: "BOOL", has_response_body: "BOOL",
  has_pipeline_details: "BOOL", bodies_truncated: "BOOL", exported_at: "TIMESTAMP",
};
const FIELD_NAMES = ["id","timestamp","method","path","status","model","requested_model","provider","provider_display","account","connection_id","duration_ms","tokens_in","tokens_out","tokens_cache_read","tokens_cache_write","tokens_reasoning","tokens_compressed","cache_source","request_type","source_format","target_format","api_key_id","api_key_name","combo_name","combo_step_id","combo_execution_key","error_summary","error_type","correlation_id","session_tag","model_pinned","detail_state","has_request_body","has_response_body","has_pipeline_details","request_body","response_body","pipeline_route_decision","pipeline_client_request","pipeline_openai_request","pipeline_provider_request","pipeline_provider_response","pipeline_client_response","pipeline_error","bodies_truncated","exported_at"];
export const BIGQUERY_TABLE_SCHEMA = { fields: FIELD_NAMES.map((name) => ({ name, type: FIELD_TYPES[name] || "STRING", mode: name === "id" ? "REQUIRED" : "NULLABLE" })) };

export function toBigQueryRow(r: LogExportRecord, exportedAt: string): Record<string, unknown> {
  return { id:r.id,timestamp:r.timestamp,method:r.method,path:r.path,status:r.status,model:r.model,requested_model:r.requestedModel,
    provider:r.provider,provider_display:r.providerDisplay,account:r.account,connection_id:r.connectionId,duration_ms:r.duration,
    tokens_in:r.tokensIn,tokens_out:r.tokensOut,tokens_cache_read:r.tokensCacheRead,tokens_cache_write:r.tokensCacheWrite,
    tokens_reasoning:r.tokensReasoning,tokens_compressed:r.tokensCompressed,cache_source:r.cacheSource,request_type:r.requestType,
    source_format:r.sourceFormat,target_format:r.targetFormat,api_key_id:r.apiKeyId,api_key_name:r.apiKeyName,combo_name:r.comboName,
    combo_step_id:r.comboStepId,combo_execution_key:r.comboExecutionKey,error_summary:r.errorSummary,error_type:r.errorType,
    correlation_id:r.correlationId,session_tag:r.sessionTag,model_pinned:r.modelPinned,detail_state:r.detailState,
    has_request_body:r.hasRequestBody,has_response_body:r.hasResponseBody,has_pipeline_details:r.hasPipelineDetails,
    request_body:r.requestBody,response_body:r.responseBody,pipeline_route_decision:r.pipelineRouteDecision,
    pipeline_client_request:r.pipelineClientRequest,pipeline_openai_request:r.pipelineOpenaiRequest,
    pipeline_provider_request:r.pipelineProviderRequest,pipeline_provider_response:r.pipelineProviderResponse,
    pipeline_client_response:r.pipelineClientResponse,pipeline_error:r.pipelineError,bodies_truncated:r.bodiesTruncated,exported_at:exportedAt };
}

type Body = { error?: { message?: string }; insertErrors?: Array<{ errors?: Array<{ message?: string }> }> };
class BigQueryClient implements LogExportClient {
  private key: ServiceAccountKey;
  private createdTableThisRun = false;
  constructor(private config: BigQueryConfig, private fetchImpl: typeof fetch = fetch) { this.key = parseServiceAccountKey(config.serviceAccountJson); }
  private get datasetPath() { return `/projects/${encodeURIComponent(this.config.projectId)}/datasets/${encodeURIComponent(this.config.datasetId)}`; }
  private get tablePath() { return `${this.datasetPath}/tables/${encodeURIComponent(this.config.tableId)}`; }
  private async request(method: string, path: string, value?: unknown) {
    const token = await getServiceAccountAccessToken(this.key, SCOPE, this.fetchImpl);
    const response = await this.fetchImpl(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: value === undefined ? undefined : JSON.stringify(value) });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) as Body | null };
  }
  private failure(result: { status: number; body: Body | null }) { return result.body?.error?.message || `BigQuery request failed with HTTP ${result.status}`; }
  async test() { const result = await this.request("GET", this.datasetPath); return result.ok || (result.status === 404 && this.config.autoCreate) ? { ok: true, detail: `Authenticated as ${this.key.client_email}` } : { ok: false, detail: this.failure(result) }; }
  async prepare() {
    const table = await this.request("GET", this.tablePath); if (table.ok) return;
    if (table.status !== 404 || !this.config.autoCreate) throw new Error(this.failure(table));
    const dataset = await this.request("GET", this.datasetPath);
    if (dataset.status === 404) { const made = await this.request("POST", `/projects/${encodeURIComponent(this.config.projectId)}/datasets`, { datasetReference: { projectId: this.config.projectId, datasetId: this.config.datasetId }, location: this.config.location }); if (!made.ok && made.status !== 409) throw new Error(this.failure(made)); }
    else if (!dataset.ok) throw new Error(this.failure(dataset));
    const made = await this.request("POST", `${this.datasetPath}/tables`, { tableReference: { projectId: this.config.projectId, datasetId: this.config.datasetId, tableId: this.config.tableId }, schema: BIGQUERY_TABLE_SCHEMA, timePartitioning: { type: "DAY", field: "timestamp", ...(this.config.partitionExpirationDays ? { expirationMs: String(this.config.partitionExpirationDays * 86_400_000) } : {}) }, clustering: { fields: [...BIGQUERY_CLUSTERING_FIELDS] } });
    if (!made.ok && made.status !== 409) throw new Error(this.failure(made));
    this.createdTableThisRun = true;
  }
  async send(records: readonly LogExportRecord[]) {
    const exportedAt = new Date().toISOString();
    let part: LogExportRecord[] = [];
    let bytes = 0;
    const flush = async () => {
      if (!part.length) return;
      const payload = { skipInvalidRows: false, ignoreUnknownValues: false, rows: part.map((r) => ({ insertId: r.id, json: toBigQueryRow(r, exportedAt) })) };
      let freshTableAttempts = 0;
      for (let attempt = 1; ; attempt++) {
        const result = await this.request("POST", `${this.tablePath}/insertAll`, payload);
        if (result.ok && !result.body?.insertErrors?.length) return;
        if (result.ok) throw new Error(`BigQuery rejected rows: ${result.body?.insertErrors?.[0]?.errors?.[0]?.message || "unknown error"}`);
        if (result.status === 404 && this.createdTableThisRun && freshTableAttempts < 6) {
          freshTableAttempts++;
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          continue;
        }
        if (!RETRYABLE.has(result.status) || attempt === 3) throw new Error(this.failure(result));
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
      }
    };
    for (const record of records) {
      const rowBytes = Buffer.byteLength(JSON.stringify({ insertId: record.id, json: toBigQueryRow(record, exportedAt) }), "utf8");
      if (part.length && (part.length >= 500 || bytes + rowBytes > MAX_INSERT_REQUEST_BYTES)) {
        await flush(); part = []; bytes = 0;
      }
      part.push(record); bytes += rowBytes;
    }
    await flush();
  }
}

export const bigQueryDestination: LogExportDestinationType<BigQueryConfig> = {
  id:"bigquery",label:"Google BigQuery",description:"Continuously export call logs to BigQuery.",
  docsUrl:"https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery",secretFields:["serviceAccountJson"],
  fields:[{key:"projectId",label:"GCP project ID",type:"text",required:true},{key:"datasetId",label:"Dataset ID",type:"text",required:true},{key:"tableId",label:"Table ID",type:"text",required:true},{key:"location",label:"Dataset location",type:"text",required:true},{key:"serviceAccountJson",label:"Service account JSON",type:"textarea",required:true,secret:true},{key:"autoCreate",label:"Create dataset/table",type:"boolean"},{key:"partitionExpirationDays",label:"Partition retention days",type:"number"}],
  configSchema:bigQueryConfigSchema,createClient:(config)=>new BigQueryClient(config),
};
export function createBigQueryClientForTest(config: BigQueryConfig, fetchImpl: typeof fetch): LogExportClient { return new BigQueryClient(config, fetchImpl); }
