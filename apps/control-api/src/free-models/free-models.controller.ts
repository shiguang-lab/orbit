import { toWebRequest } from "@orbit/http/web-handler";
import { Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { FreeModelsService } from "./free-models.service.js";

@Controller("api/free-models")
export class FreeModelsController {
  constructor(private readonly models: FreeModelsService) {}

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    try { return reply.send({ models: this.models.list() }); }
    catch (error) { console.error("Error fetching free models:", error); return reply.send({ models: [] }); }
  }
}
