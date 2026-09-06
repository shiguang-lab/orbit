import { Controller, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { A2aService } from "./a2a.service.js";

/** Single-task cancellation endpoint. */
@Controller(["a2a/tasks/:id/cancel", "api/a2a/tasks/:id/cancel"])
export class A2aTaskCancelController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(A2aService) private readonly a2a: A2aService,
  ) {}

  @Post()
  cancel(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
  ) {
    return this.routes.dispatch(request, reply, (r) => this.a2a.cancelTask(r, { id }), { id });
  }
}
