import { Injectable } from "@nestjs/common";
import { buildShiguangGatewayStatus } from "@shiguang-gateway/core-domain/control/gateway-status";
import { getQuotaMonitorSummary } from "@shiguang-gateway/open-sse/services/quotaMonitor";

@Injectable()
export class GatewayService {
  async getGatewayStatus() {
    return {
      generatedAt: new Date().toISOString(),
      liveRequestExecuted: false,
      ...(await buildShiguangGatewayStatus(getQuotaMonitorSummary)),
    };
  }

  scheduleRestart() {
    setTimeout(() => {
      process.kill(process.pid, "SIGTERM");
    }, 500);
    return { status: "restarting" };
  }

  scheduleShutdown() {
    setTimeout(() => {
      process.kill(process.pid, "SIGTERM");
    }, 500);
    return { success: true, message: "Shutting down..." };
  }
}
