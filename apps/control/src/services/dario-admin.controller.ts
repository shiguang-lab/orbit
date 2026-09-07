import { Controller, Delete, Get, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { DarioAdminService } from "./dario-admin.service.js";

@Controller("api/services/dario/admin")
export class DarioAdminController {
  constructor(
    @Inject(DarioAdminService) private readonly service: DarioAdminService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}
  @Get("accounts") accounts(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.accounts(r)); }
  @Delete("accounts") deleteAccount(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.deleteAccount(r)); }
  @Post("login-start") loginStart(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.loginStart(r)); }
  @Post("login-complete") loginComplete(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.loginComplete(r)); }
  @Get("import-from-gateway") importCandidates(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.importCandidates(r)); }
  @Post("import-from-gateway") importConnection(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.service.importConnection(r)); }
}
