import { getApiKeyById } from "@orbit/core/db/api-keys";
import { isApiKeyRevealEnabled } from "@orbit/core/control/api-key-exposure";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import * as log from "@orbit/core/sse/logger";
import { json } from "./response.js";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    if (!isApiKeyRevealEnabled()) return json({ error: "API key reveal is disabled" }, { status: 403 });
    const { id } = params;
    const key = await getApiKeyById(id);
    if (!key || typeof key.key !== "string") return json({ error: "Key not found" }, { status: 404 });
    return json({ key: key.key });
  } catch (error) {
    log.error("keys", "Error revealing key", error);
    return json({ error: "Failed to reveal key" }, { status: 500 });
  }
}
