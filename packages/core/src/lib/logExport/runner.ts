import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { advanceLogExportCursor,getEnabledLogExportDestinations,getLogExportDestination,recordLogExportRun,resetLogExportCursor,type LogExportDestinationRow } from "../db/logExportDestinations";
import { attachExportBodies,countCallLogsAfterRowId,getCallLogsForExport,getMaxCallLogRowId } from "../usage/callLogExportSource";
import { getLogExportDestinationType } from "./registry";
import { decryptDestinationConfig } from "./secrets";

export interface DestinationRunResult { destinationId:string;destinationName:string;type:string;exported:number;batches:number;cursorRowId:number;pendingAfterRun:number;success:boolean;error:string|null;skipped:boolean }
const inFlight = new Set<string>();

export function createClientForDestination(destination: LogExportDestinationRow) {
  const type = getLogExportDestinationType(destination.type);
  if (!type) throw new Error(`Unknown log export destination type "${destination.type}"`);
  const parsed = type.configSchema.safeParse(decryptDestinationConfig(destination.type,destination.config));
  if (!parsed.success) throw new Error(`Stored configuration for "${destination.name}" is invalid or incomplete`);
  return type.createClient(parsed.data);
}

export async function runDestinationExport(destination: LogExportDestinationRow): Promise<DestinationRunResult> {
  const result: DestinationRunResult = {destinationId:destination.id,destinationName:destination.name,type:destination.type,exported:0,batches:0,cursorRowId:destination.cursorRowId,pendingAfterRun:0,success:true,error:null,skipped:false};
  if (inFlight.has(destination.id)) { result.skipped=true; result.pendingAfterRun=countCallLogsAfterRowId(destination.cursorRowId); return result; }
  inFlight.add(destination.id);
  try {
    const client=createClientForDestination(destination);
    let cursor=destination.cursorRowId;
    const max=getMaxCallLogRowId();
    if (cursor > max) { cursor=0; resetLogExportCursor(destination.id); }
    const batchSize=Math.max(1,Math.min(destination.batchSize,10_000));
    const maxRows=Math.max(batchSize,destination.maxRowsPerRun);
    let prepared=false;
    while (result.exported < maxRows) {
      const source=getCallLogsForExport(cursor,Math.min(batchSize,maxRows-result.exported));
      if (!source.length) break;
      const batch=destination.includeBodies ? await attachExportBodies(source,destination.maxBodyBytes) : source;
      if (!prepared) { await client.prepare(); prepared=true; }
      await client.send(batch.map((item)=>item.record));
      cursor=batch.at(-1)!.rowId; advanceLogExportCursor(destination.id,cursor,batch.length);
      result.exported+=batch.length; result.batches++; result.cursorRowId=cursor;
      if (batch.length < batchSize) break;
    }
    result.pendingAfterRun=countCallLogsAfterRowId(cursor); recordLogExportRun(destination.id,"success",null);
  } catch (error) {
    result.success=false; result.error=sanitizeErrorMessage(error instanceof Error ? error.message : String(error));
    result.pendingAfterRun=countCallLogsAfterRowId(result.cursorRowId); recordLogExportRun(destination.id,"failure",result.error);
  } finally { inFlight.delete(destination.id); }
  return result;
}
export async function runSingleLogExport(id:string) { const row=getLogExportDestination(id); return row ? runDestinationExport(row) : null; }
export async function runAllLogExports() { const destinations=[]; for (const row of getEnabledLogExportDestinations()) destinations.push(await runDestinationExport(row)); return {destinations,exported:destinations.reduce((sum,item)=>sum+item.exported,0),failures:destinations.filter((item)=>!item.success).length}; }
