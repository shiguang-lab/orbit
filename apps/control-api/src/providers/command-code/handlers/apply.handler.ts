import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getCachedProviderConnectionById } from "@shiguang-gateway/core-domain/db/read-cache";
import { createProviderConnection, updateProviderConnection } from "@shiguang-gateway/core-domain/db/provider-connections";
import { sanitizeProviderSpecificDataForResponse } from "@shiguang-gateway/open-sse/oauth/provider-auth-import";
import { CommandCodeAuthRepository } from "../command-code-auth.repository.js";
import { commandCodeApplySchema, noStoreJson, stateHash } from "./shared.handler.js";

function safeConnection(connection: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!connection) return null;
  const result = { ...connection };
  delete result.apiKey;
  delete result.accessToken;
  delete result.refreshToken;
  delete result.idToken;
  if (result.providerSpecificData) result.providerSpecificData = sanitizeProviderSpecificDataForResponse(result.providerSpecificData);
  return result;
}

export async function applyCommandCodeAuth(request: Request, repository: CommandCodeAuthRepository): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let body: unknown;
  try { body = await request.json(); } catch { return noStoreJson({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = commandCodeApplySchema.safeParse(body);
  if (!parsed.success) return noStoreJson({ error: "Invalid apply payload" }, { status: 400 });

  let existing: Record<string, unknown> | null = null;
  if (parsed.data.connectionId) {
    existing = (await getCachedProviderConnectionById(parsed.data.connectionId)) as Record<string, unknown> | null;
    if (!existing || existing.provider !== "command-code" || existing.authType !== "apikey") {
      return noStoreJson({ error: "Command Code API-key connection not found" }, { status: 404 });
    }
  }
  const consumed = repository.consume(stateHash(repository, parsed.data.state));
  if (!consumed) return noStoreJson({ error: "No received Command Code API key for this state" }, { status: 409 });

  let connection: Record<string, unknown> | null;
  const providerSpecificData = {
    ...((existing?.providerSpecificData as Record<string, unknown> | null) || {}),
    authAssist: {
      userId: consumed.metadata?.userId,
      userName: consumed.metadata?.userName,
      keyName: consumed.metadata?.keyName,
      appliedAt: consumed.appliedAt,
    },
  };
  if (parsed.data.connectionId && existing) {
    connection = (await updateProviderConnection(parsed.data.connectionId, {
      apiKey: consumed.apiKey,
      name: parsed.data.name || existing.name || consumed.metadata?.keyName || "Command Code",
      isActive: true,
      testStatus: "unknown",
      providerSpecificData,
      ...(parsed.data.setDefault ? { priority: 1 } : {}),
    })) as Record<string, unknown> | null;
  } else {
    connection = (await createProviderConnection({
      provider: "command-code",
      authType: "apikey",
      name: parsed.data.name || consumed.metadata?.keyName || "Command Code",
      apiKey: consumed.apiKey,
      priority: parsed.data.setDefault ? 1 : undefined,
      isActive: true,
      testStatus: "unknown",
      providerSpecificData,
    })) as Record<string, unknown> | null;
  }
  return noStoreJson({ connection: safeConnection(connection), status: "applied" });
}
