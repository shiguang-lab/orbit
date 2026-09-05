import { Controller, Get, Inject, Query, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { HealthService } from "./health.service.js";

@Controller("api/health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  health(@Res() reply: FastifyReply) {
    return reply
      .header("Content-Type", "application/json; charset=utf-8")
      .header("Cache-Control", "no-store, no-cache, must-revalidate")
      .send(this.healthService.getLiveness());
  }

  @Get("ping")
  ping(@Res() reply: FastifyReply) {
    const result = this.healthService.ping();
    if (!result.success) {
      return reply
        .status(503)
        .header("Content-Type", "application/json; charset=utf-8")
        .send({ status: result.status, error: result.error });
    }
    return reply
      .header("Content-Type", "application/json; charset=utf-8")
      .header("Cache-Control", "no-store, no-cache, must-revalidate")
      .send({
        status: result.status,
        timestamp: result.timestamp,
        latencyMs: result.latencyMs,
      });
  }

  @Get("degradation")
  degradation(@Res() reply: FastifyReply, @Query("summary") summary?: string) {
    try {
      const data = this.healthService.getDegradation(summary === "true");
      return reply
        .header("Content-Type", "application/json; charset=utf-8")
        .send(data);
    } catch (error) {
      console.error("[API ERROR] /api/health/degradation GET:", error);
      return reply
        .status(500)
        .header("Content-Type", "application/json; charset=utf-8")
        .send({ error: "Failed to fetch degradation report." });
    }
  }
}
