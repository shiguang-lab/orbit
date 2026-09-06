import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SyncService } from "./sync.service.js";

@Controller("api/sync")
export class SyncController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SyncService) private readonly sync: SyncService,
  ) {}

  @Get("initialize")
  initializeGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.initializeGet(request)); }
  @Post("initialize")
  initializePost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.initializePost(request)); }
  @Get("bundle")
  bundle(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.bundle(request)); }
  @Get("cloud")
  cloudGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.cloudGet(request)); }
  @Post("cloud")
  cloudPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.cloudPost(request)); }
  @Get("tokens")
  tokensGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.tokensGet(request)); }
  @Post("tokens")
  tokensPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.tokensPost(request)); }
  @Delete("tokens/:id")
  tokenDelete(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (request) => this.sync.tokenDelete(request, id), { id }); }
}
