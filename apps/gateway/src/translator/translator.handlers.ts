import { detectFormat, getTargetFormat, buildProviderUrl, buildProviderHeaders } from "@orbit/inference/services/provider";
import { translateRequest } from "@orbit/inference/translator";
import { FORMATS } from "@orbit/inference/translator/formats";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { getProviderConnections } from "@orbit/core/db/provider-connections";
import { isConnectionUnavailableToAuxiliaryActivity } from "@orbit/core/shared/connection-isolation";
import { translatorDetectSchema, translatorSendSchema, translatorTranslateSchema } from "@orbit/core/validation/translator";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { toJsonErrorPayload } from "@orbit/core/shared/upstream-error";
import { getTranslationEvents, logTranslationEvent } from "./translator-events.js";
import { transformChatCompletionSseToResponses } from "./stream-transform.js";
import { z } from "zod";

const invalidJson = () => Response.json({ success: false, error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
const asRecord = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const providerBaseUrl = (data: unknown): string | undefined => {
  const baseUrl = asRecord(data).baseUrl;
  return typeof baseUrl === "string" && baseUrl.trim() ? baseUrl : undefined;
};
async function activeConnection(provider?: string | null): Promise<Record<string, any> | undefined> {
  if (!provider) return undefined;
  const connections = await getProviderConnections({ provider });
  for (const item of connections as Array<Record<string, any>>) {
    if (item.isActive !== false && !(await isConnectionUnavailableToAuxiliaryActivity(String(item.id)))) return item;
  }
  return undefined;
}

export async function detect(request: Request): Promise<Response> {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return invalidJson(); }
  try {
    const validation = validateBody(translatorDetectSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ success: false, error: validation.error }, { status: 400 });
    return Response.json({ success: true, format: detectFormat(validation.data.body) });
  } catch (error) {
    console.error("Error detecting format:", error);
    return Response.json({ success: false, error: "Failed to detect format" }, { status: 500 });
  }
}

export async function history(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const { events, total } = getTranslationEvents(searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined);
    const normalizedEvents = events.map((event) => {
      const connectionId = typeof event.connectionId === "string" && event.connectionId.trim() ? event.connectionId : null;
      const comboName = typeof event.comboName === "string" && event.comboName.trim() ? event.comboName : null;
      const provider = typeof event.provider === "string" && event.provider.trim() ? event.provider : null;
      const endpoint = typeof event.endpoint === "string" && event.endpoint.trim() ? event.endpoint : null;
      return { ...event, routeProvider: provider, routeCombo: comboName, routeEndpoint: endpoint, routeConnectionId: connectionId, routeConnectionShortId: connectionId ? connectionId.slice(0, 8) : null, isComboRouted: Boolean(comboName) };
    });
    return Response.json({ success: true, events: normalizedEvents, total });
  } catch (error) {
    console.error("Error fetching history:", error);
    return Response.json({ success: false, error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

export async function transformStream(request: Request): Promise<Response> {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return invalidJson(); }
  const validation = z.object({ rawSse: z.string().min(1).max(100_000) }).safeParse(rawBody);
  if (!validation.success) return Response.json({ success: false, error: { message: "Invalid request" } }, { status: 400 });
  try { return Response.json({ success: true, transformed: await transformChatCompletionSseToResponses(validation.data.rawSse) }); }
  catch (error) { return Response.json({ success: false, error: error instanceof Error ? error.message : "Failed to transform chat completions stream" }, { status: 500 }); }
}

export async function send(request: Request): Promise<Response> {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return invalidJson(); }
  try {
    const startedAt = Date.now();
    const validation = validateBody(translatorSendSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ success: false, error: validation.error }, { status: 400 });
    const { provider, body } = validation.data;
    const sourceFormat = detectFormat(body);
    const connections = await getProviderConnections({ provider });
    const connection = await activeConnection(provider);
    let targetFormat = getTargetFormat(provider);
    if (!connection) {
      logTranslationEvent({ provider, model: body.model || "test-model", sourceFormat, targetFormat, status: "error", statusCode: 400, latency: Date.now() - startedAt, endpoint: "/api/translator/send" });
      return Response.json({ success: false, error: `No active connection found for provider: ${provider}. Available connections: ${connections.length}` }, { status: 400 });
    }
    const credentials = { apiKey: connection.apiKey, accessToken: connection.accessToken, refreshToken: connection.refreshToken, copilotToken: connection.copilotToken, projectId: connection.projectId, providerSpecificData: connection.providerSpecificData };
    targetFormat = getTargetFormat(provider, connection.providerSpecificData);
    const url = buildProviderUrl(provider, body.model || "test-model", true, { baseUrlIndex: 0, baseUrl: providerBaseUrl(connection.providerSpecificData), providerSpecificData: connection.providerSpecificData });
    const response = await fetch(String(url), { method: "POST", headers: buildProviderHeaders(provider, credentials, true, body as any), body: JSON.stringify(body) });
    if (!response.ok) {
      const normalized = toJsonErrorPayload(await response.text(), `Provider error: ${response.status} ${response.statusText}`);
      logTranslationEvent({ provider, model: body.model || "test-model", sourceFormat, targetFormat, status: "error", statusCode: response.status, latency: Date.now() - startedAt, endpoint: "/api/translator/send" });
      const normalizedMessage = (normalized as any)?.error?.message;
      return Response.json({ success: false, error: normalizedMessage || `Provider error: ${response.status} ${response.statusText}`, details: normalized }, { status: response.status });
    }
    logTranslationEvent({ provider, model: body.model || "test-model", sourceFormat, targetFormat, status: "success", statusCode: 200, latency: Date.now() - startedAt, endpoint: "/api/translator/send" });
    return new Response(response.body, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
  } catch (error) { console.error("Error sending request:", error); return Response.json({ success: false, error: "Failed to send request" }, { status: 500 }); }
}

export async function translate(request: Request): Promise<Response> {
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch { return invalidJson(); }
  try {
    const validation = validateBody(translatorTranslateSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ success: false, error: validation.error }, { status: 400 });
    const { step, provider, body, sourceFormat: reqSourceFormat, targetFormat: reqTargetFormat } = validation.data;
    if (step === "direct") {
      const src = reqSourceFormat || detectFormat(body);
      const connection = await activeConnection(provider);
      const tgt = reqTargetFormat || (provider ? getTargetFormat(provider, connection?.providerSpecificData) : "openai");
      const translated = translateRequest(src, tgt, asRecord(body).model || "test-model", body, true, null, provider);
      return Response.json({ success: true, sourceFormat: src, targetFormat: tgt, result: translated });
    }
    const actualBody = (() => { const nested = asRecord(asRecord(body).body); return Object.keys(nested).length ? nested : asRecord(body); })();
    let result: Record<string, unknown>;
    if (step === 1) { result = { timestamp: asRecord(body).timestamp || new Date().toISOString(), endpoint: asRecord(body).endpoint || "/v1/messages", headers: asRecord(body).headers || {}, body: actualBody, _detectedFormat: detectFormat(actualBody) }; }
    else if (step === 2) { result = { timestamp: new Date().toISOString(), headers: {}, body: translateRequest(detectFormat(actualBody), FORMATS.OPENAI, actualBody.model || "test-model", actualBody, true, null, provider) }; }
    else if (step === 3) { const connection = await activeConnection(provider); result = { timestamp: new Date().toISOString(), body: translateRequest(FORMATS.OPENAI, getTargetFormat(provider, connection?.providerSpecificData), actualBody.model || "test-model", actualBody, true, null, provider) }; }
    else if (step === 4) {
      const connection = await activeConnection(provider);
      if (!connection) return Response.json({ success: false, error: `No active connection found for provider: ${provider}` }, { status: 400 });
      const credentials = { apiKey: connection.apiKey, accessToken: connection.accessToken, refreshToken: connection.refreshToken, copilotToken: connection.copilotToken, projectId: connection.projectId, providerSpecificData: connection.providerSpecificData };
      result = { timestamp: new Date().toISOString(), url: String(buildProviderUrl(provider, actualBody.model || "test-model", true, { baseUrlIndex: 0, baseUrl: providerBaseUrl(connection.providerSpecificData), providerSpecificData: connection.providerSpecificData })), headers: buildProviderHeaders(provider, credentials, true, actualBody as any), body: actualBody };
    } else return Response.json({ success: false, error: "Invalid step" }, { status: 400 });
    return Response.json({ success: true, result });
  } catch (error) { console.error("Error translating:", error); return Response.json({ success: false, error: "Failed to translate request" }, { status: 500 }); }
}
