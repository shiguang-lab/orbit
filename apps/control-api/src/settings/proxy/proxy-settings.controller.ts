import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Delete, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ProxySettingsService } from "./proxy-settings.service.js";
import { ProxyDeployService } from "./proxy-deploy.service.js";

@Controller("api/settings/proxy")
export class ProxySettingsController {
  constructor(private readonly settings: ProxySettingsService, private readonly deploy: ProxyDeployService) {}
  private async send(reply: FastifyReply, response: Response) { return reply.status(response.status).send(await response.json()); }
  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.send(reply, await this.settings.get(toWebRequest(request))); }
  @Put()
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.settings.update(toWebRequest(request), body)); }
  @Delete()
  async delete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.send(reply, await this.settings.delete(toWebRequest(request))); }
  @Post("cloudflare-deploy")
  async cloudflare(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.cloudflare(toWebRequest(request), body)); }
  @Post("deno-deploy")
  async deno(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.deno(toWebRequest(request), body)); }
  @Post("vercel-deploy")
  async vercel(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.vercel(toWebRequest(request), body)); }
}
