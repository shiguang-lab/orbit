import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Patch, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { ModelCapabilityOverridesService } from "./model-capability-overrides.service.js";

/** Management transport for model capability and context-window overrides. */
@Controller("api/model-capability-overrides")
export class ModelCapabilityOverridesController {
  constructor(private readonly overrides: ModelCapabilityOverridesService) {}

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    return reply.send(await this.overrides.list());
  }

  @Patch()
  async upsert(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    const result = await this.overrides.upsert(body);
    if (!result.ok) return reply.status(result.status).send({ error: result.error });
    return reply.send(result.result);
  }

  @Delete()
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    const url = new URL(request.url, "http://control");
    const result = await this.overrides.remove(url.searchParams.get("target") || "", url.searchParams.get("key") || "");
    if (!result.ok) return reply.status(result.status).send({ error: result.error });
    return reply.send(result.result);
  }
}
