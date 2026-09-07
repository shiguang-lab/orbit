import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AgentCardService } from "./agent-card.service.js";

@Controller()
export class AgentCardController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(AgentCardService) private readonly cards: AgentCardService,
  ) {}

  @Get(".well-known/agent.json")
  getLegacy(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cards.get(r, "0.3"));
  }

  @Get("api/.well-known/agent.json")
  getLegacyApi(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cards.get(r, "0.3"));
  }

  @Get(".well-known/agent-card.json")
  getV1(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cards.get(r, "1.0"));
  }

  @Get("api/.well-known/agent-card.json")
  getV1Api(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.cards.get(r, "1.0"));
  }
}
