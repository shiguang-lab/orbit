import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  listCliproxyInstances,
  getCliproxyInstance,
  updateCliproxyInstance,
} from "@orbit/core/control/cliproxy";

export async function getModelMappings(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const instanceId = url.searchParams.get("instanceId");

  if (instanceId) {
    const instance = getCliproxyInstance(instanceId);
    if (!instance) {
      return Response.json({ error: "Instance not found" }, { status: 404 });
    }
    return Response.json(instance.modelMappings, { headers: { "Cache-Control": "no-store" } });
  }

  // Default to primary local or first instance
  const instances = listCliproxyInstances();
  const primary = instances.find((i) => i.type === "local_managed") || instances[0];
  return Response.json(primary ? primary.modelMappings : {}, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function updateModelMappings(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");
    const body = (await request.json()) as Record<string, unknown>;
    const mappings =
      body.mappings && typeof body.mappings === "object"
        ? (body.mappings as Record<string, string>)
        : (body as Record<string, string>);

    let targetId = instanceId;
    if (!targetId) {
      const instances = listCliproxyInstances();
      const primary = instances.find((i) => i.type === "local_managed") || instances[0];
      targetId = primary?.id;
    }

    if (!targetId) {
      return Response.json({ error: "No CLIProxyAPI instance available" }, { status: 404 });
    }

    const updated = updateCliproxyInstance(targetId, { modelMappings: mappings });
    if (!updated) {
      return Response.json({ error: "Instance not found" }, { status: 404 });
    }

    return Response.json({ success: true, modelMappings: updated.modelMappings });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
