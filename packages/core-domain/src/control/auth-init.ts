import { finalizeTokens } from "../lib/oauth/providers.ts";
import { persistOAuthConnection } from "../lib/oauth/connectionPersistence.ts";
import {
  peekDeviceFlowTicket,
  claimDeviceFlowTicket,
  completeDeviceFlowTicket,
  releaseDeviceFlowTicket,
} from "../lib/oauth/deviceFlowTickets.ts";
import { validateBody, isValidationFailure } from "../shared/validation/helpers.ts";
import { oauthDeviceCompleteSchema } from "../shared/validation/schemas.ts";
import { safeOutboundFetch, SafeOutboundFetchError, getSafeOutboundFetchErrorStatus } from "../shared/network/safeOutboundFetch.ts";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import ensureCloudSyncInitialized from "../lib/initCloudSync.ts";

export type ControlResult = { status: number; body: unknown };

export function getCodexDeviceTicket(token: string): ControlResult {
  const ticket = peekDeviceFlowTicket(token);
  if (!ticket || ticket.provider !== "codex" || ticket.status !== "pending") {
    return { status: 404, body: { valid: false, error: "This link is invalid, already used, or expired." } };
  }
  return { status: 200, body: { valid: true, provider: ticket.provider, expiresAt: new Date(ticket.expiresAt).toISOString() } };
}

export async function completeCodexDeviceFlow(token: string, rawBody: unknown): Promise<ControlResult> {
  const validation = validateBody(oauthDeviceCompleteSchema, rawBody);
  if (isValidationFailure(validation)) return { status: 400, body: { error: validation.error } };
  const ticket = claimDeviceFlowTicket(token, "codex");
  if (!ticket) return { status: 410, body: { success: false, error: "This link is invalid, already used, or expired." } };
  try {
    const { access_token, refresh_token, id_token, expires_in } = validation.data;
    const tokenData = await finalizeTokens("codex", { access_token, refresh_token, id_token, expires_in });
    const connection = await persistOAuthConnection("codex", tokenData, ticket.connectionId);
    completeDeviceFlowTicket(token, { connectionId: connection.id, email: connection.email ?? null });
    return { status: 200, body: { success: true, connection: { id: connection.id, provider: connection.provider, email: connection.email } } };
  } catch (error) {
    releaseDeviceFlowTicket(token);
    return { status: 500, body: { success: false, error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) || "Failed to save connection" } };
  }
}

export async function issueDahlTokens(): Promise<ControlResult> {
  try {
    const response = await safeOutboundFetch("https://inference.dahl.global/tokens", { method: "POST", headers: { "Content-Type": "application/json" } });
    if (!response.ok) return { status: response.status, body: { error: `Upstream ${response.status}`, detail: sanitizeErrorMessage(await response.text().catch(() => "")) } };
    return { status: response.status, body: await response.json() };
  } catch (error) {
    if (error instanceof SafeOutboundFetchError) return { status: getSafeOutboundFetchErrorStatus(error) ?? 502, body: { error: "Upstream fetch failed", detail: sanitizeErrorMessage(error.message) } };
    return { status: 500, body: { error: "Internal error", detail: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) } };
  }
}

export async function initializeControlRuntime(): Promise<ControlResult> {
  return { status: 200, body: { initialized: await ensureCloudSyncInitialized() } };
}
