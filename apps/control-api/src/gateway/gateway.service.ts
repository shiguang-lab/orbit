import { Injectable } from "@nestjs/common";
import { buildShiguangGatewayStatus } from "@shiguang-gateway/core-domain/control/gateway-status";

@Injectable()
export class GatewayService {
  async getGatewayStatus() {
    return {
      generatedAt: new Date().toISOString(),
      liveRequestExecuted: false,
      ...(await buildShiguangGatewayStatus()),
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
