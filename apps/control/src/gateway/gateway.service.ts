import { Injectable } from "@nestjs/common";
import { buildOrbitStatus } from "./runtime/gateway-status.js";
import { readEdgeRuntimeHealth } from "../edge-runtime/client.js";

@Injectable()
export class GatewayService {
  async getGatewayStatus() {
    const runtime = await readEdgeRuntimeHealth();
    return {
      generatedAt: new Date().toISOString(),
      liveRequestExecuted: false,
      ...(await buildOrbitStatus({
        circuitStatuses: runtime.circuitBreakers as Array<{ state: string }>,
        quotaSummary: runtime.quotaMonitorSummary as { active: number },
      })),
    };
  }
}
