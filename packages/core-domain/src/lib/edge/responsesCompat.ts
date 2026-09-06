import { handleChat } from "@shiguang-gateway/open-sse/handlers/chat";
import { withChatAdmission } from "../../shared/middleware/withChatAdmission.ts";
import { initTranslators } from "../../../../open-sse/translator/index.ts";

let initialized = false;
async function ensureInitialized() {
  if (initialized) return;
  await initTranslators();
  initialized = true;
}

/** Internal tokenized-VSCode bridge delegate while its transport remains in core-domain. */
export const POST = withChatAdmission(async (request: Request) => {
  await ensureInitialized();
  return handleChat(request);
});

export function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
