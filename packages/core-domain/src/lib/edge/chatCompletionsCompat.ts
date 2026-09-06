/**
 * Protocol-level chat dispatch for non-HTTP callers inside core-domain.
 *
 * The deployable HTTP route lives in apps/edge-gateway. Internal evaluators,
 * chaos runs, and tokenized compatibility adapters use this shared business
 * handler without importing an app-owned route module.
 */
import { handleChat } from "@shiguang-gateway/open-sse/handlers/chat";
import { handleCorsOptions } from "../../shared/utils/cors.ts";

export async function POST(request: Request): Promise<Response> {
  return handleChat(request);
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}
