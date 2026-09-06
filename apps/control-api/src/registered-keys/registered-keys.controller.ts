import { Controller, Delete, Get, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RegisteredKeysService } from "./registered-keys.service.js";

@Controller("api/v1")
export class RegisteredKeysController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: RegisteredKeysService) {}

  @Get("registered-keys") list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.list(r)); }
  @Post("registered-keys") issue(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.issue(r)); }
  @Get("registered-keys/:id") get(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.get(r, id)); }
  @Delete("registered-keys/:id") revokeDelete(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.revoke(r, id)); }
  @Post("registered-keys/:id/revoke") revoke(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.revoke(r, id)); }
  @Get("quotas/check") quota(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.checkQuota(r)); }
  @Get("accounts/:id/limits") getLimits(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.getLimits(r, id)); }
  @Put("accounts/:id/limits") setLimits(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.setLimits(r, id)); }
}
