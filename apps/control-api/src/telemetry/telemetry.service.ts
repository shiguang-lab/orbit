import { Injectable } from "@nestjs/common";
import { buildTelemetryPayload } from "@shiguang-gateway/core-domain/metrics/observability";
import { getTelemetrySummary } from "@shiguang-gateway/core-domain/metrics/request-telemetry";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { readEdgeRuntimeHealth } from "../edge-runtime/client.js";

@Injectable()
export class TelemetryService {
  async summary(request: Request): Promise<Response> {
    try {
      const { searchParams } = new URL(request.url);
      const parsedWindow = Number.parseInt(searchParams.get("windowMs") ?? "300000", 10);
      const windowMs = Number.isFinite(parsedWindow) ? parsedWindow : 300000;
      const summary = getTelemetrySummary(windowMs);
      const runtime = await readEdgeRuntimeHealth();
      const quotaMonitorSummary = runtime.quotaMonitorSummary as unknown as Parameters<typeof buildTelemetryPayload>[0]["quotaMonitorSummary"];
      const activeSessions = runtime.activeSessions as Parameters<typeof buildTelemetryPayload>[0]["activeSessions"];
      const payload = buildTelemetryPayload({ summary, quotaMonitorSummary, activeSessions });
      const totalRequests = Number(payload.totalRequests ?? 0);
      return Response.json({
        ...payload,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        activeConnections: activeSessions.length,
        errorRate:
          totalRequests > 0 ? (quotaMonitorSummary.errors / Math.max(totalRequests, 1)) * 100 : 0,
      });
    } catch (error) {
      return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
    }
  }
}
