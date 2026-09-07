import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { CcDiscoveryMetricsService } from "./cc-discovery-metrics.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) {
      headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
    }
  }
  const host = String(request.headers.host ?? "control");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

/** HTTP transport for the read-only Claude Code discovery metrics surface. */
@Controller("api/settings/cc-discovery-metrics")
export class CcDiscoveryMetricsController {
  constructor(private readonly metrics: CcDiscoveryMetricsService) {}

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      return reply.send(this.metrics.getMetrics());
    } catch (error) {
      return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error)));
    }
  }
}
