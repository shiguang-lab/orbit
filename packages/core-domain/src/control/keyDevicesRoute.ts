import { NextResponse } from "next/server";
import { requireManagementAuth } from "../lib/api/requireManagementAuth.ts";
import { getApiKeyById } from "../lib/db/apiKeys.ts";
import { getDeviceCount, getDeviceDetails } from "../../../open-sse/services/deviceTracker.ts";
import { buildErrorBody, sanitizeErrorMessage } from "../../../open-sse/utils/error.ts";
import * as log from "../sse/utils/logger.ts";

/** GET /api/keys/[id]/devices */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const key = await getApiKeyById(id);
    if (!key || typeof key.id !== "string") {
      return NextResponse.json(buildErrorBody(404, "Key not found"), { status: 404 });
    }

    return NextResponse.json({
      keyId: key.id,
      name: typeof key.name === "string" ? key.name : "",
      count: getDeviceCount(key.id),
      devices: getDeviceDetails(key.id),
    });
  } catch (error) {
    log.error("keys", "Error fetching API key devices", error);
    return NextResponse.json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
  }
}
