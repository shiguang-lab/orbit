import { Controller, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { CommandCodeAuthService } from "./command-code-auth.service.js";

@Controller("api/providers/command-code/auth")
export class CommandCodeAuthController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly auth: CommandCodeAuthService) {}
  @Post("start") start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.start(req)); }
  @Options("callback") callbackOptions(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.options(req)); }
  @Post("callback") callback(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.callback(req)); }
  @Get("status") statusGet(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.status(req)); }
  @Post("status") statusPost(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.status(req)); }
  @Post("apply") apply(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(request, reply, (req) => this.auth.apply(req)); }
}
