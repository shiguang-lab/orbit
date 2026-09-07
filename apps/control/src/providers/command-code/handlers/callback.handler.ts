import { CommandCodeAuthRepository } from "../command-code-auth.repository.js";
import {
  MAX_CALLBACK_BODY_BYTES,
  callbackCorsHeaders,
  commandCodeCallbackSchema,
  noStoreJson,
  readJsonBodyWithLimit,
  rejectDisallowedCallbackOrigin,
  stateHash,
} from "./shared.handler.js";

export function optionsCommandCodeCallback(request: Request): Response {
  return new Response(null, { status: 204, headers: callbackCorsHeaders(request) });
}

export async function callbackCommandCodeAuth(request: Request, repository: CommandCodeAuthRepository): Promise<Response> {
  const originError = rejectDisallowedCallbackOrigin(request);
  if (originError) return originError;
  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, MAX_CALLBACK_BODY_BYTES);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === "BODY_TOO_LARGE";
    return noStoreJson(
      { success: false, error: tooLarge ? "Request body too large" : "Invalid JSON body" },
      { status: tooLarge ? 413 : 400, headers: callbackCorsHeaders(request) },
    );
  }
  const parsed = commandCodeCallbackSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ success: false, error: "Invalid callback payload" }, { status: 400, headers: callbackCorsHeaders(request) });
  }
  const session = repository.markReceived({
    stateHash: stateHash(repository, parsed.data.state),
    apiKey: parsed.data.apiKey,
    metadata: { userId: parsed.data.userId, userName: parsed.data.userName, keyName: parsed.data.keyName },
  });
  if (!session || session.status !== "received") {
    return noStoreJson({ success: false, error: "Invalid or expired state" }, { status: 400, headers: callbackCorsHeaders(request) });
  }
  return noStoreJson(
    { success: true, ok: true, status: session.status, expiresAt: session.expiresAt, metadata: session.metadata },
    { headers: callbackCorsHeaders(request) },
  );
}
