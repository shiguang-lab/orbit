import { updateProviderConnection, getProviderConnections } from "@orbit/core/db/provider-connections";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { cloudCredentialUpdateSchema } from "@orbit/core/control/cloud-validation";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";

export async function PUT(request: Request) {
  const authError = await requireManagementAuth(request, { alwaysRequireAuth: true, invalidApiKeyStatus: 401 });
  if (authError) return authError;
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 }); }
  try {
    const validation = validateBody(cloudCredentialUpdateSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const { provider, credentials } = validation.data;
    const connection = (await getProviderConnections({ provider, isActive: true }))[0];
    if (!connection) return Response.json({ error: `No active connection found for provider: ${provider}` }, { status: 404 });
    const updateData: Record<string, unknown> = {};
    if (credentials.accessToken) updateData.accessToken = credentials.accessToken;
    if (credentials.refreshToken) updateData.refreshToken = credentials.refreshToken;
    if (credentials.expiresIn) updateData.expiresAt = new Date(Date.now() + credentials.expiresIn * 1000).toISOString();
    const connectionId = typeof connection.id === "string" ? connection.id : null;
    if (!connectionId) return Response.json({ error: "Invalid provider connection ID" }, { status: 500 });
    await updateProviderConnection(connectionId, updateData);
    return Response.json({ success: true, message: `Credentials updated for provider: ${provider}` });
  } catch (error) {
    console.log("Update credentials error:", error);
    return Response.json({ error: "Failed to update credentials" }, { status: 500 });
  }
}
