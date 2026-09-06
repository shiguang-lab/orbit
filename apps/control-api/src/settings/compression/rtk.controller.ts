import { Body, Controller, Get, Put, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { rtkConfigSchema } from "@shiguang-gateway/core-domain/shared/validation/compression-config-schemas";
import { CompressionSettingsService } from "./compression.service.js";

/** Management transport for the RTK compression configuration and diagnostics. */
@Controller("api/context/rtk")
export class RtkController {
  constructor(private readonly compression: CompressionSettingsService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get("config")
  async getConfig(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(await this.compression.getRtkConfig());
  }

  @Put("config")
  async updateConfig(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(rtkConfigSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }
    return reply.send(await this.compression.updateRtkConfig(validation.data));
  }

  @Get("discover")
  async discover(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("limit") limitParam?: string,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const value = Number(limitParam);
    const limit = !Number.isFinite(value) || value <= 0 ? 500 : Math.min(2000, Math.floor(value));
    return reply.send(this.compression.getRtkDiscover(limit));
  }

  @Get("filters")
  async filters(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(this.compression.getRtkFilters());
  }
}
