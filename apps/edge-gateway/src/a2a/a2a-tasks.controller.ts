import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { A2aService } from "./a2a.service.js";

/** REST task collection used by the dashboard and A2A operators. */
@Controller(["a2a/tasks", "api/a2a/tasks"])
export class A2aTasksController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(A2aService) private readonly a2a: A2aService,
  ) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.a2a.listTasks(r));
  }

  @Post()
  delegate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.a2a.delegateTask(r));
  }
}
