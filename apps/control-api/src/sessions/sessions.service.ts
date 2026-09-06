import { Injectable } from "@nestjs/common";
import { getActiveSessions, getActiveSessionCount, getAllActiveSessionCountsByKey } from "@shiguang-gateway/open-sse/services/sessionManager";
import { getWebSessionPoolHealth } from "@shiguang-gateway/open-sse/services/webSessionPoolHealth";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { explainRouteByRequestId } from "@shiguang-gateway/core-domain/usage/route-explain";

@Injectable()
export class SessionsService {
  async sessions(request: Request) { const auth = await requireManagementAuth(request); if (auth) return auth; try { return Response.json({ count: getActiveSessionCount(), sessions: getActiveSessions(), byApiKey: getAllActiveSessionCountsByKey(), exclusiveSessions: [] }); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) }, { status: 500 }); } }
  async pools(request: Request) { const auth = await requireManagementAuth(request); if (auth) return auth; try { return Response.json(getWebSessionPoolHealth()); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) || "Failed to get session pool health" }, { status: 500 }); } }
  async pool(request: Request, provider: string) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const report = getWebSessionPoolHealth(provider); const data = report.providers[0]; return data ? Response.json({ checkedAt: report.checkedAt, ...data }) : Response.json({ error: `No session pool found for provider '${provider}'` }, { status: 404 }); } catch (e) { return Response.json({ error: sanitizeErrorMessage(e) || "Failed to get session pool health" }, { status: 500 }); } }
  async decision(request: Request, requestId: string) { const auth = await requireManagementAuth(request); if (auth) return auth; try { const explanation = await explainRouteByRequestId(requestId); return explanation ? Response.json(explanation) : Response.json({ error: "Routing decision not found" }, { status: 404 }); } catch { return Response.json({ error: "Failed to explain routing decision" }, { status: 500 }); } }
}
