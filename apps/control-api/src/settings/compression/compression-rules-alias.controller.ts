import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { CompressionSettingsService } from "./compression.service.js";

/** Explicit alias for the original non-settings compression rules endpoint. */
@Controller("api/compression")
export class CompressionRulesAliasController {
  constructor(private readonly compression: CompressionSettingsService) {}

  @Get("rules")
  async getRules(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (authError) {
      return reply.status(authError.status).send(await authError.json());
    }
    return reply.send(this.compression.getRules());
  }
}
