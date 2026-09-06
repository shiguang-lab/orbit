import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import {
  getHttpProxyHandle,
  getSystemProxyState,
  isTlsInterceptEnabled,
  listCustomHosts,
} from "@shiguang-gateway/core-domain/control/traffic-inspector";

export async function captureModes(): Promise<Response> {
  try {
    const customHosts = listCustomHosts();
    const httpProxy = getHttpProxyHandle();
    const systemProxy = getSystemProxyState();
    return Response.json({
      agentBridge: true,
      customHosts: { count: customHosts.length, enabledCount: customHosts.filter((h) => h.enabled).length },
      httpProxy: { running: httpProxy !== null, port: httpProxy?.port ?? null },
      systemProxy: { applied: systemProxy.applied, guardUntil: systemProxy.guardUntil, port: systemProxy.port },
      tlsIntercept: { enabled: isTlsInterceptEnabled() },
    });
  } catch (err) {
    const msg = sanitizeErrorMessage(err);
    return new Response(JSON.stringify(buildErrorBody(500, msg || "Failed to get capture mode status")), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
