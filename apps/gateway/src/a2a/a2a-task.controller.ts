import { Controller, Get, Inject, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { A2aService } from "./a2a.service.js";

/** Single-task read endpoint. */
@Controller(["a2a/tasks/:id", "api/a2a/tasks/:id"])
export class A2aTaskController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(A2aService) private readonly a2a: A2aService,
  ) {}

  @Get()
  get(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
  ) {
    return this.routes.dispatch(request, reply, (r) => this.a2a.getTask(r, { id }), { id });
  }
}
