/**
 * Gate for the server-owned tool follow-up loop.
 *
 * The loop only makes sense for a non-streaming Chat Completions / Messages turn: a streaming
 * response has already begun reaching the client, and the Responses endpoint owns its own
 * server-side tool lifecycle. Anything else keeps the legacy "append the tool result to the
 * response" behaviour.
 */

export function shouldRunServerOwnedToolLoop(input: {
  enabled: boolean;
  stream: boolean;
  isResponsesEndpoint: boolean;
  sourceFormat: string;
}): boolean {
  if (!input.enabled) return false;
  if (input.stream) return false;
  if (input.isResponsesEndpoint) return false;
  return input.sourceFormat === "openai" || input.sourceFormat === "claude";
}

/** Reads the runtime flag that enables the follow-up loop. */
export function isServerOwnedToolLoopEnabled(): boolean {
  const raw = String(process.env.ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
