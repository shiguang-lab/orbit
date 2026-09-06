import { getModelAliases, setModelAlias } from "@shiguang-gateway/core-domain/db/model-aliases";
import { validateApiKey } from "@shiguang-gateway/core-domain/db/api-keys";
import { isCloudEnabled } from "@shiguang-gateway/core-domain/db/settings";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { syncToCloud } from "@shiguang-gateway/core-domain/control/cloud-sync";
import { cloudModelAliasUpdateSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";

export async function PUT(request: Request) {
  const authError = await requireManagementAuth(request, { alwaysRequireAuth: true, invalidApiKeyStatus: 401 });
  if (authError) return authError;
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 }); }
  try {
    const validation = validateBody(cloudModelAliasUpdateSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const { model, alias } = validation.data;
    const existingModel = (await getModelAliases())[alias];
    if (existingModel && existingModel !== model) return Response.json({ error: `Alias '${alias}' already in use for model '${existingModel}'` }, { status: 400 });
    await setModelAlias(alias, model);
    try { if (await isCloudEnabled()) await syncToCloud(await getConsistentMachineId()); } catch (error) { console.log("Error syncing aliases to cloud:", error); }
    return Response.json({ success: true, model, alias, message: `Alias '${alias}' set for model '${model}'` });
  } catch (error) {
    console.log("Error updating alias:", error);
    return Response.json({ error: "Failed to update alias" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const apiKey = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!apiKey) return Response.json({ error: "Missing API key" }, { status: 401 });
    if (!(await validateApiKey(apiKey))) return Response.json({ error: "Invalid API key" }, { status: 401 });
    return Response.json({ aliases: await getModelAliases() });
  } catch (error) {
    console.log("Error fetching aliases:", error);
    return Response.json({ error: "Failed to fetch aliases" }, { status: 500 });
  }
}
