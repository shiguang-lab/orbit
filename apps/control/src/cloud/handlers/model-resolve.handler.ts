import { getModelAliases } from "@orbit/core/db/model-aliases";
import { validateApiKey } from "@orbit/core/db/api-keys";
import { cloudResolveAliasSchema } from "@orbit/core/control/cloud-validation";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";

export async function POST(request: Request) {
  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 }); }
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return Response.json({ error: "Missing API key" }, { status: 401 });
    const validation = validateBody(cloudResolveAliasSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    if (!(await validateApiKey(authHeader.slice(7)))) return Response.json({ error: "Invalid API key" }, { status: 401 });
    const alias = validation.data.alias;
    const resolved = (await getModelAliases())[alias];
    if (typeof resolved === "string") {
      const firstSlash = resolved.indexOf("/");
      if (firstSlash > 0) return Response.json({ alias, provider: resolved.slice(0, firstSlash), model: resolved.slice(firstSlash + 1) });
    }
    return Response.json({ error: "Alias not found" }, { status: 404 });
  } catch (error) {
    console.log("Model resolve error:", error);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
