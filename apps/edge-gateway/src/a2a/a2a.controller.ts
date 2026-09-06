import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { A2aService } from "./a2a.service.js";

/** JSON-RPC A2A compatibility alias (`/api/a2a`). */
@Controller("api/a2a")
export class A2aController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(A2aService) private readonly a2a: A2aService,
  ) {}

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.a2a.handleRpc(r, "POST"));
  }
}
