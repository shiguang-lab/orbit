import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Delete, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { OneproxyService } from "./oneproxy.service.js";

/** HTTP transport for the legacy 1proxy settings compatibility endpoints. */
@Controller("api/settings/oneproxy")
export class OneproxyController {
  constructor(@Inject(OneproxyService) private readonly oneproxy: OneproxyService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  private redirect(reply: FastifyReply, result: ReturnType<OneproxyService["listRedirect"]>): unknown {
    return reply.status(result.status).header("Location", result.location).send();
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(request, reply))) return;
    return this.redirect(reply, this.oneproxy.listRedirect());
  }

  @Post()
  async sync(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(request, reply))) return;
    return this.redirect(reply, this.oneproxy.syncRedirect());
  }

  @Delete()
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(request, reply))) return;
    return this.redirect(reply, this.oneproxy.listRedirect());
  }

  @Post("rotate")
  async rotate(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await this.authorize(request, reply))) return;
    return this.redirect(reply, this.oneproxy.syncRedirect());
  }
}
