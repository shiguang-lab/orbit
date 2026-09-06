import { Body, Controller, Delete, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ProxySettingsService } from "./proxy-settings.service.js";
import { ProxyDeployService } from "./proxy-deploy.service.js";

@Controller("api/settings/proxy")
export class ProxySettingsController {
  constructor(private readonly settings: ProxySettingsService, private readonly deploy: ProxyDeployService) {}
  private async send(reply: FastifyReply, response: Response) { return reply.status(response.status).send(await response.json()); }
  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.send(reply, await this.settings.get(request.raw as unknown as Request)); }
  @Put()
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.settings.update(request.raw as unknown as Request, body)); }
  @Delete()
  async delete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.send(reply, await this.settings.delete(request.raw as unknown as Request)); }
  @Post("cloudflare-deploy")
  async cloudflare(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.cloudflare(request.raw as unknown as Request, body)); }
  @Post("deno-deploy")
  async deno(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.deno(request.raw as unknown as Request, body)); }
  @Post("vercel-deploy")
  async vercel(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) { return this.send(reply, await this.deploy.vercel(request.raw as unknown as Request, body)); }
}
