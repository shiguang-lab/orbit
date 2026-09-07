import { getApiKeyById } from "@shiguang-gateway/core-domain/db/api-keys";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import * as log from "@shiguang-gateway/core-domain/sse/logger";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";
import { json } from "./response.js";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = params;
    const key = await getApiKeyById(id);
    if (!key || typeof key.id !== "string") return json(buildErrorBody(404, "Key not found"), { status: 404 });
    const snapshot = await executeEdgeRuntimeCommand<{ count: number; devices: unknown[] }>({
      command: "key-devices.snapshot",
      apiKeyId: key.id,
    });
    return json({ keyId: key.id, name: typeof key.name === "string" ? key.name : "", ...snapshot });
  } catch (error) {
    log.error("keys", "Error fetching API key devices", error);
    return json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
  }
}
