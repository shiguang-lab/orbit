import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { InspectorListQuerySchema, globalTrafficBuffer } from "@shiguang-gateway/core-domain/control/traffic-inspector";

export async function listRequests(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawQuery: Record<string, string> = {};
  url.searchParams.forEach((value, key) => { rawQuery[key] = value; });
  const parsed = InspectorListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return new Response(JSON.stringify(buildErrorBody(400, parsed.error.issues[0]?.message ?? "Invalid query")), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const requests = globalTrafficBuffer.list(parsed.data);
  return Response.json({ requests, total: requests.length });
}

export async function clearRequests(): Promise<Response> {
  globalTrafficBuffer.clear();
  return new Response(null, { status: 204 });
}
