import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { CommandCodeAuthRepository } from "../command-code-auth.repository.js";
import {
  COMMAND_CODE_AUTH_TTL_MS,
  COMMAND_CODE_STUDIO_AUTH_URL,
  buildCallbackUrl,
  generateState,
  noStoreJson,
  stateHash,
} from "./shared.handler.js";

export async function startCommandCodeAuth(request: Request, repository: CommandCodeAuthRepository): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const state = generateState();
  const expiresAt = new Date(Date.now() + COMMAND_CODE_AUTH_TTL_MS).toISOString();
  repository.createPending(stateHash(repository, state), expiresAt);
  const callbackUrl = buildCallbackUrl();
  const authUrl = `${COMMAND_CODE_STUDIO_AUTH_URL}?callback=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}`;
  return noStoreJson({ state, authUrl, callbackUrl, expiresAt, mode: "manual" });
}
