import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getCachedSettings } from "@orbit/core/cache/services";
import {
  getAuditStats,
  queryAuditEntries,
} from "@orbit/inference/mcp-server/audit";
import {
  getMcpHttpStatus,
  isMcpHttpTransportReady,
} from "@orbit/inference/mcp-server/httpTransport";
import {
  isMcpHeartbeatOnline,
  isProcessAlive,
  readMcpHeartbeat,
  resolveMcpHeartbeatPath,
} from "@orbit/inference/mcp-server/runtimeHeartbeat";

export async function getStatus(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request, { acceptMcpConnectScope: true });
  if (authError) return authError;
  try {
    const [heartbeat, stats, lastCallPage, settings] = await Promise.all([
      readMcpHeartbeat(),
      getAuditStats(),
      queryAuditEntries({ limit: 1, offset: 0 }),
      getCachedSettings(),
    ]);
    const enabled = !!settings.mcpEnabled;
    const transport = (settings.mcpTransport as string) || "stdio";
    const httpTransport = getMcpHttpStatus();
    const stdioOnline = isMcpHeartbeatOnline(heartbeat, { requireLivePid: true });
    const online = transport === "stdio" ? enabled && stdioOnline : isMcpHttpTransportReady(enabled, transport);
    const runtimeState = !enabled
      ? "disabled"
      : online
        ? "online"
        : transport === "stdio"
          ? "idle"
          : "offline";
    const scopesEnforced = process.env.ORBIT_MCP_ENFORCE_SCOPES === "true";
    const lastCall = lastCallPage.entries[0] || null;
    const now = Date.now();
    const heartbeatAt = heartbeat ? new Date(heartbeat.lastHeartbeatAt).getTime() : null;
    const startedAt = heartbeat ? new Date(heartbeat.startedAt).getTime() : null;
    const heartbeatAgeMs = typeof heartbeatAt === "number" && Number.isFinite(heartbeatAt) ? Math.max(0, now - heartbeatAt) : null;
    const uptimeMs = typeof startedAt === "number" && Number.isFinite(startedAt) ? Math.max(0, now - startedAt) : null;
    return Response.json({
      status: runtimeState, runtimeState, online, enabled, transport, scopesEnforced,
      heartbeatPath: resolveMcpHeartbeatPath(),
      heartbeat: heartbeat ? { ...heartbeat, pidAlive: isProcessAlive(heartbeat.pid), heartbeatAgeMs, uptimeMs } : null,
      httpTransport,
      activity: {
        totalCalls24h: stats.totalCalls, successRate: stats.successRate, avgDurationMs: stats.avgDurationMs,
        topTools: stats.topTools, lastCallAt: lastCall?.createdAt || null, lastCallTool: lastCall?.toolName || null,
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Failed to load MCP status" }, { status: 500 });
  }
}
