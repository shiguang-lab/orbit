import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import {
  InspectorCustomHostSchema,
  addCustomHost,
  addDNSEntries,
  getCachedPassword,
  listCustomHosts,
} from "@orbit/core/control/traffic-inspector";

export async function listHosts(): Promise<Response> {
  try {
    return Response.json({ hosts: listCustomHosts() });
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    return new Response(JSON.stringify(buildErrorBody(500, msg || "Failed to list hosts")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function createHost(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(buildErrorBody(400, "Invalid JSON body")), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const parsed = InspectorCustomHostSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(buildErrorBody(400, parsed.error.issues[0]?.message ?? "Validation error")), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const { host, kind, label } = parsed.data;
  try {
    addCustomHost(host, kind, label ?? undefined);
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    return new Response(JSON.stringify(buildErrorBody(500, msg || "Failed to add host")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const sudoPassword = getCachedPassword();
  if (sudoPassword) {
    try {
      await addDNSEntries([host], sudoPassword);
    } catch (err) {
      const msg = sanitizeErrorMessage(err);
      return Response.json({ ok: true, host, warning: `DNS routing entry could not be added: ${msg}` }, { status: 201 });
    }
    return Response.json({ ok: true, host }, { status: 201 });
  }
  return Response.json({
    ok: true,
    host,
    warning: "DNS routing requires the MITM proxy to be running with a cached sudo password",
  }, { status: 201 });
}
