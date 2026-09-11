import {
  ApiKeyPolicyInvariantError,
  deleteApiKey,
  getApiKeyById,
  updateApiKeyPermissions,
} from "@orbit/core/db/api-keys";
import { isCloudEnabled } from "@orbit/core/db/settings";
import { syncToCloud } from "@orbit/core/sync/cloud";
import { getConsistentMachineId } from "@orbit/core/shared/utils/machineId";
import { updateKeyPermissionsSchema } from "@orbit/core/validation/keys";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody } from "@orbit/inference/utils/error";
import * as log from "@orbit/core/sse/logger";
import { json } from "./response.js";

type RouteParams = { params: { id: string } };

export async function GET(request: Request, { params }: RouteParams) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = params;
    const key = await getApiKeyById(id);
    if (!key) return json({ error: "Key not found" }, { status: 404 });
    const keyValue = typeof key.key === "string" ? key.key : null;
    return json({ ...key, key: keyValue ? `${keyValue.slice(0, 8)}****${keyValue.slice(-4)}` : null });
  } catch (error) {
    log.error("keys", "Error fetching key", error);
    return json({ error: "Failed to fetch key" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
  }
  try {
    const { id } = params;
    const validation = validateBody(updateKeyPermissionsSchema, rawBody);
    if (isValidationFailure(validation)) return json({ error: validation.error }, { status: 400 });
    const data = validation.data;
    const payload: Parameters<typeof updateApiKeyPermissions>[1] = {};
    for (const field of [
      "ipAllowlist", "name", "modelAccessMode", "allowedModels", "blockedModels", "allowedCombos",
      "noLog", "autoResolve", "isActive", "throttleDelayMs", "isBanned", "expiresAt", "maxSessions",
      "accessSchedule", "rateLimits", "scopes", "allowedEndpoints", "streamDefaultMode", "compressionEnabled",
      "cacheDefaultMode", "disableNonPublicModels", "allowUsageCommand", "usageLimitEnabled", "dailyUsageLimitUsd",
      "weeklyUsageLimitUsd", "chaosModeEnabled",
    ] as const) {
      const value = data[field];
      if (value !== undefined) (payload as Record<string, unknown>)[field] = value;
    }
    // Connection access is a two-state policy: "all" clears the allow-list so the key can
    // reach every active connection; otherwise the explicit allow-list is persisted as-is.
    if (data.connectionAccessMode === "all") {
      payload.allowedConnections = [];
    } else if (data.allowedConnections !== undefined) {
      payload.allowedConnections = data.allowedConnections;
    }
    const updated = await updateApiKeyPermissions(id, payload);
    if (!updated) return json({ error: "Key not found" }, { status: 404 });
    await syncKeysToCloudIfEnabled();
    return json({ message: "API key settings updated successfully", ...payload });
  } catch (error) {
    if (
      error instanceof ApiKeyPolicyInvariantError ||
      (error instanceof Error && (error as { code?: string }).code === "LEASE_KEY_POLICY_INVALID")
    ) {
      const leaseError = error as Error & { code?: string };
      return json(
        buildErrorBody(400, leaseError.message, null, {
          type: "lease_error",
          code: leaseError.code || "LEASE_KEY_POLICY_INVALID",
        }),
        { status: 400 }
      );
    }
    log.error("keys", "Error updating key permissions", error);
    return json({ error: "Failed to update permissions" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = params;
    const deleted = await deleteApiKey(id);
    if (!deleted) return json({ error: "Key not found" }, { status: 404 });
    await syncKeysToCloudIfEnabled();
    return json({ message: "Key deleted successfully" });
  } catch (error) {
    log.error("keys", "Error deleting key", error);
    return json({ error: "Failed to delete key" }, { status: 500 });
  }
}

async function syncKeysToCloudIfEnabled() {
  try {
    if (!(await isCloudEnabled())) return;
    await syncToCloud(await getConsistentMachineId());
  } catch (error) {
    log.error("keys", "Error syncing keys to cloud", error);
  }
}
