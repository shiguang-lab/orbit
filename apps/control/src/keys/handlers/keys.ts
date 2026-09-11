import {
  getApiKeys,
  getApiKeysCount,
  createApiKey,
  updateApiKeyPermissions,
} from "@orbit/core/db/api-keys";
import { isCloudEnabled } from "@orbit/core/db/settings";
import { getConsistentMachineId } from "@orbit/core/shared/utils/machineId";
import { syncToCloud } from "@orbit/core/sync/cloud";
import { createKeySchema } from "@orbit/core/validation/keys";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { isApiKeyRevealEnabled, maskStoredApiKey } from "@orbit/core/control/api-key-exposure";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { normalizeSelfServiceScopesForCreate } from "@orbit/core/shared/constants/selfServiceScopes";
import * as log from "@orbit/core/sse/logger";

const json = (body: unknown, init?: ResponseInit): Response => Response.json(body, init);

function parsePagination(request: Request) {
  const url = new URL(request.url);
  const limitValue = url.searchParams.get("limit");
  const offsetValue = url.searchParams.get("offset");

  const parsedLimit = limitValue ? Number.parseInt(limitValue, 10) : undefined;
  const parsedOffset = offsetValue ? Number.parseInt(offsetValue, 10) : 0;

  const limit =
    Number.isInteger(parsedLimit) && parsedLimit && parsedLimit > 0 ? parsedLimit : null;
  const offset = Number.isInteger(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  return { limit, offset };
}

// GET /api/keys - List API keys
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { limit, offset } = parsePagination(request);
    const dbLimit = limit ?? undefined;
    const total = getApiKeysCount();
    const keys = await getApiKeys(dbLimit, offset);
    const maskedKeys = keys.map((k) => ({
      ...k,
      key: maskStoredApiKey(k.key),
    }));

    return json({
      keys: maskedKeys,
      total,
      allowKeyReveal: isApiKeyRevealEnabled(),
    });
  } catch (error) {
    log.error("keys", "Error fetching keys", error);
    return json({ error: "Failed to fetch keys" }, { status: 500 });
  }
}

// POST /api/keys - Create new API key
export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Zod validation
    const validation = validateBody(createKeySchema, body);
    if (isValidationFailure(validation)) {
      return json({ error: validation.error }, { status: 400 });
    }
    const {
      name,
      modelAccessMode,
      ipAllowlist,
      allowedModels,
      blockedModels,
      allowedCombos,
      noLog,
      scopes,
      allowedConnections,
      allowUsageCommand,
      usageLimitEnabled,
      dailyUsageLimitUsd,
      weeklyUsageLimitUsd,
      chaosModeEnabled,
    } = validation.data;

    // Always get machineId from server
    const machineId = await getConsistentMachineId();
    const normalizedScopes = normalizeSelfServiceScopesForCreate(scopes);
    const apiKey = await createApiKey(name, machineId, normalizedScopes, {
      modelAccessMode,
      ipAllowlist,
      allowedModels,
      allowedCombos,
      allowedConnections,
    });
    if (
      noLog === true ||
      blockedModels !== undefined ||
      allowUsageCommand === true ||
      usageLimitEnabled === true ||
      dailyUsageLimitUsd !== undefined ||
      weeklyUsageLimitUsd !== undefined ||
      chaosModeEnabled === true
    ) {
      await updateApiKeyPermissions(apiKey.id, {
        ...(noLog === true && { noLog: true }),
        ...(blockedModels !== undefined && { blockedModels }),
        ...(allowUsageCommand === true && { allowUsageCommand: true }),
        ...(usageLimitEnabled === true && { usageLimitEnabled: true }),
        ...(dailyUsageLimitUsd !== undefined && { dailyUsageLimitUsd }),
        ...(weeklyUsageLimitUsd !== undefined && { weeklyUsageLimitUsd }),
        ...(chaosModeEnabled === true && { chaosModeEnabled: true }),
      });
    }

    // Auto sync to Cloud if enabled — fire-and-forget. Cloud sync is a
    // background side-effect, not part of the key-creation contract, and it
    // performs an outbound network call. Awaiting it here blocked the HTTP
    // response on a slow/unreachable Cloud endpoint (e.g. a fresh/offline
    // install with a misconfigured or unreachable CLOUD_URL): the request
    // would hang until the fetch settled or timed out (#6570). Errors inside
    // syncKeysToCloudIfEnabled() are already caught and logged internally, so
    // this is safe to leave unawaited.
    void syncKeysToCloudIfEnabled();

    return json(
      {
        key: apiKey.key,
        name: apiKey.name,
        id: apiKey.id,
        machineId: apiKey.machineId,
        modelAccessMode: apiKey.modelAccessMode,
        ipAllowlist: apiKey.ipAllowlist,
        allowedModels: apiKey.allowedModels,
        blockedModels: blockedModels ?? [],
        allowedCombos: apiKey.allowedCombos,
        allowedConnections: apiKey.allowedConnections,
        noLog: noLog === true,
        allowUsageCommand: allowUsageCommand === true,
        usageLimitEnabled: usageLimitEnabled === true,
        dailyUsageLimitUsd: dailyUsageLimitUsd ?? null,
        weeklyUsageLimitUsd: weeklyUsageLimitUsd ?? null,
        chaosModeEnabled: chaosModeEnabled === true,
        streamDefaultMode: "legacy",
        compressionEnabled: true,
        cacheDefaultMode: "legacy",
      },
      { status: 201 }
    );
  } catch (error) {
    log.error("keys", "Error creating key", error);
    return json({ error: "Failed to create key" }, { status: 500 });
  }
}

/**
 * Sync API keys to Cloud if enabled
 */
async function syncKeysToCloudIfEnabled() {
  try {
    const cloudEnabled = await isCloudEnabled();
    if (!cloudEnabled) return;

    const machineId = await getConsistentMachineId();
    await syncToCloud(machineId);
  } catch (error) {
    log.error("keys", "Error syncing keys to cloud", error);
  }
}
