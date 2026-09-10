import { getDbInstance } from "../db/core";
import { applyNodePrefix, getCallLogById, resolveProviderDisplay } from "./callLogs";
import type { LogExportRecord, LogExportSourceRow } from "../logExport/types";

export const DEFAULT_MAX_BODY_BYTES = 262_144;
type Row = Record<string, unknown> & { row_id: number; id: string };
const stringOrNull = (value: unknown) => typeof value === "string" ? value : null;
const numberOrNull = (value: unknown) => value == null || !Number.isFinite(Number(value)) ? null : Number(value);

function mapRow(row: Row): LogExportRecord {
  const provider = stringOrNull(row.provider);
  return {
    id: row.id, timestamp:stringOrNull(row.timestamp),method:stringOrNull(row.method),path:stringOrNull(row.path),
    status:numberOrNull(row.status),model:stringOrNull(row.model),
    requestedModel:applyNodePrefix(stringOrNull(row.requested_model),provider,stringOrNull(row.provider_node_prefix)),
    provider,providerDisplay:resolveProviderDisplay(provider,stringOrNull(row.provider_node_name),stringOrNull(row.provider_node_prefix)),
    account:stringOrNull(row.resolved_account) || stringOrNull(row.account),connectionId:stringOrNull(row.connection_id),
    duration:numberOrNull(row.duration),tokensIn:numberOrNull(row.tokens_in),tokensOut:numberOrNull(row.tokens_out),
    tokensCacheRead:numberOrNull(row.tokens_cache_read),tokensCacheWrite:numberOrNull(row.tokens_cache_creation),
    tokensReasoning:numberOrNull(row.tokens_reasoning),tokensCompressed:numberOrNull(row.tokens_compressed),
    cacheSource:stringOrNull(row.cache_source) || "upstream",requestType:stringOrNull(row.request_type),
    sourceFormat:stringOrNull(row.source_format),targetFormat:stringOrNull(row.target_format),apiKeyId:stringOrNull(row.api_key_id),
    apiKeyName:stringOrNull(row.api_key_name),comboName:stringOrNull(row.combo_name),comboStepId:stringOrNull(row.combo_step_id),
    comboExecutionKey:stringOrNull(row.combo_execution_key),errorSummary:stringOrNull(row.error_summary),errorType:stringOrNull(row.error_type),
    correlationId:stringOrNull(row.correlation_id),sessionTag:stringOrNull(row.session_tag),modelPinned:numberOrNull(row.model_pinned) === 1,
    detailState:stringOrNull(row.detail_state),hasRequestBody:numberOrNull(row.has_request_body) === 1,
    hasResponseBody:numberOrNull(row.has_response_body) === 1,hasPipelineDetails:numberOrNull(row.has_pipeline_details) === 1,
    requestBody:null,responseBody:null,pipelineRouteDecision:null,pipelineClientRequest:null,pipelineOpenaiRequest:null,
    pipelineProviderRequest:null,pipelineProviderResponse:null,pipelineClientResponse:null,pipelineError:null,bodiesTruncated:false,
  };
}

function serialize(value: unknown, maxBytes: number): { text: string | null; truncated: boolean } {
  if (value == null) return { text:null,truncated:false };
  let text: string;
  try { text = typeof value === "string" ? value : JSON.stringify(value); } catch { return { text:'{"_export_error":"payload is not serialisable"}',truncated:false }; }
  if (Buffer.byteLength(text,"utf8") <= maxBytes) return { text,truncated:false };
  const clipped = Buffer.from(text,"utf8").subarray(0,maxBytes).toString("utf8");
  return { text:`${clipped.endsWith("�") ? clipped.slice(0,-1) : clipped}…[truncated]`,truncated:true };
}

export async function attachExportBodies(rows: LogExportSourceRow[], maxBodyBytes = DEFAULT_MAX_BODY_BYTES) {
  const cap = Math.max(1024,maxBodyBytes);
  return Promise.all(rows.map(async (row) => {
    const detail = await getCallLogById(row.record.id).catch(() => null);
    if (!detail) return row;
    const pipeline = detail.pipelinePayloads && typeof detail.pipelinePayloads === "object" ? detail.pipelinePayloads as Record<string,unknown> : {};
    let truncated = false;
    const take = (value: unknown) => { const result=serialize(value,cap); truncated ||= result.truncated; return result.text; };
    return { rowId:row.rowId, record:{ ...row.record,requestBody:take(detail.requestBody),responseBody:take(detail.responseBody),
      pipelineRouteDecision:take(pipeline.routeDecision),pipelineClientRequest:take(pipeline.clientRawRequest ?? pipeline.clientRequest),
      pipelineOpenaiRequest:take(pipeline.openaiRequest),pipelineProviderRequest:take(pipeline.providerRequest),
      pipelineProviderResponse:take(pipeline.providerResponse),pipelineClientResponse:take(pipeline.clientResponse),
      pipelineError:take(pipeline.error),bodiesTruncated:truncated } };
  }));
}

export function getMaxCallLogRowId(): number {
  const row = getDbInstance().prepare("SELECT COALESCE(MAX(rowid),0) max FROM call_logs").get() as { max:number };
  return Number(row.max || 0);
}
export function countCallLogsAfterRowId(afterRowId: number): number {
  const row = getDbInstance().prepare("SELECT COUNT(*) count FROM call_logs WHERE rowid > ?").get(afterRowId) as { count:number };
  return Number(row.count || 0);
}
export function getCallLogsForExport(afterRowId: number, limit: number): LogExportSourceRow[] {
  const rows = getDbInstance().prepare(`SELECT cl.rowid row_id,cl.*,pn.name provider_node_name,pn.prefix provider_node_prefix,
    COALESCE(NULLIF(pc.name,''),NULLIF(pc.email,''),cl.account) resolved_account FROM call_logs cl
    LEFT JOIN provider_nodes pn ON pn.id=cl.provider LEFT JOIN provider_connections pc ON pc.id=cl.connection_id
    WHERE cl.rowid > @afterRowId ORDER BY cl.rowid LIMIT @limit`).all({afterRowId,limit}) as Row[];
  return rows.map((row)=>({rowId:Number(row.row_id),record:mapRow(row)}));
}
