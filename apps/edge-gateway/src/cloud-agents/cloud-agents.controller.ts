import { Controller, Get, Inject, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CloudAgentsService } from "./cloud-agents.service.js";

/** Edge-owned cloud-agent provider health endpoint. */
@Controller(["v1/agents/health", "api/v1/agents/health"])
export class CloudAgentsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(CloudAgentsService) private readonly cloudAgents: CloudAgentsService,
  ) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cloudAgents.healthOptions(r));
  }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cloudAgents.health(r));
  }
}
