import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  listCliproxyInstances,
  getCliproxyInstance,
  createCliproxyInstance,
  updateCliproxyInstance,
  deleteCliproxyInstance,
  probeCliproxyInstance,
} from "@orbit/core/control/cliproxy";

export async function listInstances(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const instances = listCliproxyInstances();
  return Response.json(instances, { headers: { "Cache-Control": "no-store" } });
}

export async function createInstance(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return Response.json({ error: "Instance name is required" }, { status: 400 });
    }
    if (!body.endpoint || typeof body.endpoint !== "string" || !body.endpoint.trim()) {
      return Response.json({ error: "Instance endpoint is required" }, { status: 400 });
    }

    const instance = createCliproxyInstance({
      name: body.name.trim(),
      endpoint: body.endpoint.trim(),
      managementKey: typeof body.managementKey === "string" ? body.managementKey.trim() : null,
      type: body.type === "local_managed" ? "local_managed" : "remote_agent",
      enabled: body.enabled !== false,
      weight: typeof body.weight === "number" ? body.weight : 100,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
      modelMappings:
        body.modelMappings && typeof body.modelMappings === "object"
          ? (body.modelMappings as Record<string, string>)
          : {},
    });

    // Probe immediately in background to populate status
    probeCliproxyInstance(instance).catch(() => {});

    return Response.json(instance, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function updateInstance(request: Request, id: string): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updated = updateCliproxyInstance(id, {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.endpoint !== undefined ? { endpoint: String(body.endpoint).trim() } : {}),
      ...(body.managementKey !== undefined
        ? { managementKey: body.managementKey ? String(body.managementKey).trim() : null }
        : {}),
      ...(body.type !== undefined
        ? { type: body.type === "local_managed" ? "local_managed" : "remote_agent" }
        : {}),
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(body.weight !== undefined ? { weight: Number(body.weight) } : {}),
      ...(Array.isArray(body.tags) ? { tags: body.tags.map(String) } : {}),
      ...(body.modelMappings && typeof body.modelMappings === "object"
        ? { modelMappings: body.modelMappings as Record<string, string> }
        : {}),
    });

    if (!updated) {
      return Response.json({ error: "Instance not found" }, { status: 404 });
    }

    return Response.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function deleteInstance(request: Request, id: string): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const deleted = deleteCliproxyInstance(id);
    if (!deleted) {
      return Response.json({ error: "Instance not found" }, { status: 404 });
    }
    return Response.json({ success: true, id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function probeInstance(request: Request, id: string): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const instance = getCliproxyInstance(id);
  if (!instance) {
    return Response.json({ error: "Instance not found" }, { status: 404 });
  }
  const result = await probeCliproxyInstance(instance);
  return Response.json({ ...result, instanceId: id });
}
