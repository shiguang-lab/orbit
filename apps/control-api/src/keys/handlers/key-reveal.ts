import { getApiKeyById } from "@shiguang-gateway/core-domain/db/api-keys";
import { isApiKeyRevealEnabled } from "@shiguang-gateway/core-domain/control/api-key-exposure";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import * as log from "@shiguang-gateway/core-domain/sse/logger";
import { json } from "./response.js";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    if (!isApiKeyRevealEnabled()) return json({ error: "API key reveal is disabled" }, { status: 403 });
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key || typeof key.key !== "string") return json({ error: "Key not found" }, { status: 404 });
    return json({ key: key.key });
  } catch (error) {
    log.error("keys", "Error revealing key", error);
    return json({ error: "Failed to reveal key" }, { status: 500 });
  }
}
