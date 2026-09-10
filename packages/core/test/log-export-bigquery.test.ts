import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createBigQueryClientForTest, toBigQueryRow } from "../src/lib/logExport/destinations/bigquery.js";
import type { LogExportRecord } from "../src/lib/logExport/types.js";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const serviceAccountJson = JSON.stringify({
  type: "service_account",
  client_email: "exporter@example.invalid",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});
const record: LogExportRecord = {
  id:"call-1",timestamp:"2026-09-10T00:00:00Z",method:"POST",path:"/v1/chat/completions",status:200,
  model:"m",requestedModel:"m",provider:"p",providerDisplay:"P",account:null,connectionId:null,duration:10,
  tokensIn:1,tokensOut:2,tokensCacheRead:0,tokensCacheWrite:0,tokensReasoning:0,tokensCompressed:0,
  cacheSource:"upstream",requestType:"chat",sourceFormat:"openai",targetFormat:"openai",apiKeyId:null,
  apiKeyName:null,comboName:null,comboStepId:null,comboExecutionKey:null,errorSummary:null,errorType:null,
  correlationId:null,sessionTag:null,modelPinned:false,detailState:"none",hasRequestBody:false,
  hasResponseBody:false,hasPipelineDetails:false,requestBody:null,responseBody:null,pipelineRouteDecision:null,
  pipelineClientRequest:null,pipelineOpenaiRequest:null,pipelineProviderRequest:null,pipelineProviderResponse:null,
  pipelineClientResponse:null,pipelineError:null,bodiesTruncated:false,
};

test("BigQuery projection preserves stable snake_case fields", () => {
  const row = toBigQueryRow(record, "now");
  assert.equal(row.requested_model, "m");
  assert.equal(row.tokens_in, 1);
  assert.equal(row.exported_at, "now");
});

test("BigQuery insert uses call id as insertId and rejects HTTP-200 partial failures", async () => {
  const requests: Array<{ url: string; body?: string }> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "token", expires_in: 3600 });
    return Response.json({ insertErrors: [{ errors: [{ message: "bad row" }] }] });
  };
  const client = createBigQueryClientForTest({
    projectId:"project",datasetId:"dataset",tableId:"table",location:"EU",serviceAccountJson,
    autoCreate:false,partitionExpirationDays:0,
  }, fetchImpl as typeof fetch);
  await assert.rejects(client.send([record]), /bad row/);
  const insert = requests.find((request) => request.url.endsWith("/insertAll"));
  assert.equal(JSON.parse(insert?.body || "{}").rows[0].insertId, "call-1");
});

test("BigQuery splits batches at the 500-row streaming recommendation", async () => {
  let inserts = 0;
  const fetchImpl = async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "token", expires_in: 3600 });
    if (url.endsWith("/insertAll")) inserts++;
    return Response.json({});
  };
  const client = createBigQueryClientForTest({
    projectId:"project",datasetId:"dataset",tableId:"table",location:"EU",serviceAccountJson,
    autoCreate:false,partitionExpirationDays:0,
  }, fetchImpl as typeof fetch);
  await client.send(Array.from({ length: 501 }, (_, index) => ({ ...record, id: `call-${index}` })));
  assert.equal(inserts, 2);
});
