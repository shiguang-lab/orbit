import { Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { VolcenginePlanService } from "./volcengine-plan.service.js";

@Controller("api/providers/volcengine-plan/connect")
export class VolcenginePlanController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly plans: VolcenginePlanService,
  ) {}

  @Post()
  connect(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.plans.connect(req));
  }

  @Get(":sessionId/status")
  status(
    @Param("sessionId") sessionId: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.plans.status(req, sessionId), { sessionId });
  }

  @Post(":sessionId/cancel")
  cancel(@Param("sessionId") sessionId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.plans.cancel(req, sessionId), { sessionId });
  }

  @Post(":sessionId/code")
  code(@Param("sessionId") sessionId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.plans.code(req, sessionId), { sessionId });
  }

  @Post(":sessionId/identity")
  identity(@Param("sessionId") sessionId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.plans.identity(req, sessionId), { sessionId });
  }

  @Post(":sessionId/resend")
  resend(@Param("sessionId") sessionId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.plans.resend(req, sessionId), { sessionId });
  }
}
