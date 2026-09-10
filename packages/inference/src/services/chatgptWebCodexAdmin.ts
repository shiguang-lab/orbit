/**
 * Service-boundary re-exports for the chatgpt-web-codex admin/dashboard API
 * routes (src/app/api/providers/**).
 *
 * `no-restricted-imports` (EXECUTOR_IMPORT_RESTRICTION, eslint.config.mjs)
 * forbids `src/app/**` files from importing `open-sse/executors/**` directly
 * — executor implementations must stay behind an open-sse handler or service
 * boundary. This file is that boundary for the small set of
 * chatgpt-web-codex helpers the provider CRUD/doctor routes need (secret
 * encode/decode, storage-state finalization, connection health status).
 */
export { finalizeValidatedChatGptWebCodexSecrets } from "../executors/chatgpt-web-codex/storageState.ts";
export {
  decodeChatGptWebCodexSecrets,
  encodeChatGptWebCodexSecrets,
  type ChatGptWebCodexSecrets,
} from "../executors/chatgpt-web-codex/credentials.ts";

// #12355: doctor.ts is imported lazily, not re-exported statically — its own
// chain pulls in executors/chatgpt-web-codex.ts, whose vendor browser adapter
// reaches token-estimate.ts and tiktoken's WASM tokenizer. A static re-export
// would evaluate that whole chain on EVERY admin route that merely imports
// this module (provider CRUD, doctor), turning an unrelated-provider bundling
// failure into a route-wide crash. The wrapper keeps the exported signature
// stable while deferring the heavy module to first call.
export async function getChatGptWebCodexDoctorStatus(connection: {
  id?: unknown;
  apiKey?: unknown;
  providerSpecificData?: unknown;
  lastError?: unknown;
}): Promise<Awaited<ReturnType<typeof import("../executors/chatgpt-web-codex/doctor.ts").getChatGptWebCodexDoctorStatus>>> {
  const { getChatGptWebCodexDoctorStatus: getDoctorStatus } = await import(
    "../executors/chatgpt-web-codex/doctor.ts"
  );
  return getDoctorStatus(connection);
}
