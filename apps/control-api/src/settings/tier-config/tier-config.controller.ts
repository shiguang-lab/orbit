import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { TierConfigService } from "./tier-config.service.js";

const tierOverridePutSchema = z
  .object({
    provider: z.string().min(1),
    tier: z.enum(["free", "cheap", "premium"]).nullable(),
  })
  .strict();

/** HTTP transport for persisted provider routing-tier overrides. */
@Controller("api/settings")
export class TierConfigController {
  constructor(private readonly tierConfig: TierConfigService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get("tier-config")
  async getTierConfig(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(this.tierConfig.getConfig());
  }

  @Put("tier-config")
  async updateTierConfig(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = tierOverridePutSchema.safeParse(body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send(buildErrorBody(400, "Invalid tier override payload"));
    }
    return reply.send(await this.tierConfig.updateProviderOverride(parsed.data));
  }
}
