import { Injectable } from "@nestjs/common";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { explainRouteByRequestId } from "../usage/reporting/routeExplain.js";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

@Injectable()
export class SessionsService {
  async sessions(request: Request) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const { pools: _pools, ...result } = await executeEdgeRuntimeCommand<Record<string, unknown>>({ command: "sessions.snapshot" }); return Response.json(result); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) }, { status: 500 }); } }
  async pools(request: Request) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const result = await executeEdgeRuntimeCommand<{ pools: unknown }>({ command: "sessions.snapshot" }); return Response.json(result.pools); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) || "Failed to get session pool health" }, { status: 500 }); } }
  async pool(request: Request, provider: string) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const { pools } = await executeEdgeRuntimeCommand<{ pools: { checkedAt: string; providers: Array<Record<string, unknown>> } }>({ command: "sessions.snapshot", provider }); const data = pools.providers[0]; return data ? Response.json({ checkedAt: pools.checkedAt, ...data }) : Response.json({ error: `No session pool found for provider '${provider}'` }, { status: 404 }); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) || "Failed to get session pool health" }, { status: 500 }); } }
  async decision(request: Request, requestId: string) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const explanation = await explainRouteByRequestId(requestId); return explanation ? Response.json(explanation) : Response.json({ error: "Routing decision not found" }, { status: 404 }); } catch { return Response.json({ error: "Failed to explain routing decision" }, { status: 500 }); } }
}
