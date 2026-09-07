import { regenerateApiKey } from "@orbit/core/db/api-keys";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import * as log from "@orbit/core/sse/logger";
import { json } from "./response.js";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = params;
    if (!id) return json({ error: "Missing key ID" }, { status: 400 });
    const result = await regenerateApiKey(id);
    if (!result) return json({ error: "Key not found" }, { status: 404 });
    return json({ message: "API key regenerated successfully", key: result.key, id: result.id });
  } catch (error) {
    log.error("keys", "Error regenerating key", error);
    return json({ error: "Failed to regenerate key" }, { status: 500 });
  }
}
