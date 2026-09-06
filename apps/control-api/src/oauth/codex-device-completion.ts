import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { persistOAuthConnection } from "@shiguang-gateway/core-domain/control/oauth-runtime/connectionPersistence";
import {
  claimDeviceFlowTicket,
  completeDeviceFlowTicket,
  peekDeviceFlowTicket,
  releaseDeviceFlowTicket,
} from "./device-flow-tickets.js";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { oauthDeviceCompleteSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { finalizeTokens } from "@shiguang-gateway/open-sse/oauth/providers";

export type CodexDeviceCompletionResult = { status: number; body: unknown };

export function getCodexDeviceTicket(token: string): CodexDeviceCompletionResult {
  const ticket = peekDeviceFlowTicket(token);
  if (!ticket || ticket.provider !== "codex" || ticket.status !== "pending") {
    return { status: 404, body: { valid: false, error: "This link is invalid, already used, or expired." } };
  }
  return {
    status: 200,
    body: { valid: true, provider: ticket.provider, expiresAt: new Date(ticket.expiresAt).toISOString() },
  };
}

export async function completeCodexDeviceFlow(
  token: string,
  rawBody: unknown
): Promise<CodexDeviceCompletionResult> {
  const validation = validateBody(oauthDeviceCompleteSchema, rawBody);
  if (isValidationFailure(validation)) return { status: 400, body: { error: validation.error } };
  const ticket = claimDeviceFlowTicket(token, "codex");
  if (!ticket) {
    return { status: 410, body: { success: false, error: "This link is invalid, already used, or expired." } };
  }
  try {
    const { access_token, refresh_token, id_token, expires_in } = validation.data;
    const tokenData = await finalizeTokens("codex", { access_token, refresh_token, id_token, expires_in });
    const connection = await persistOAuthConnection("codex", tokenData, ticket.connectionId);
    completeDeviceFlowTicket(token, { connectionId: connection.id, email: connection.email ?? null });
    return {
      status: 200,
      body: { success: true, connection: { id: connection.id, provider: connection.provider, email: connection.email } },
    };
  } catch (error) {
    releaseDeviceFlowTicket(token);
    return {
      status: 500,
      body: {
        success: false,
        error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) || "Failed to save connection",
      },
    };
  }
}
