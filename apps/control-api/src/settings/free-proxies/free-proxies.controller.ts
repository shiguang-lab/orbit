import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Delete, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { FreeProxiesService } from "./free-proxies.service.js";

@Controller("api/settings/free-proxies")
export class FreeProxiesController {
  constructor(private readonly freeProxies: FreeProxiesService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.list(toWebRequest(request));
    return reply.status(result.status).send(result.body);
  }

  @Delete()
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.remove(toWebRequest(request));
    return reply.status(result.status).send(result.body);
  }

  @Get("stats")
  async stats(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.stats();
    return reply.status(result.status).send(result.body);
  }

  @Post("sync")
  async sync(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.sync(toWebRequest(request), body);
    return reply.status(result.status).send(result.body);
  }

  @Post("bulk-add-to-pool")
  async bulkAddToPool(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.bulkAddToPool(body);
    return reply.status(result.status).send(result.body);
  }

  @Post(":id/add-to-pool")
  async addToPool(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const result = await this.freeProxies.addToPool(id);
    return reply.status(result.status).send(result.body);
  }
}
