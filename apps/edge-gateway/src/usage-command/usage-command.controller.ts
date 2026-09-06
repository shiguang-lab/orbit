import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { UsageCommandService } from "./usage-command.service.js";

@Controller("api/usage/om-usage")
export class UsageCommandController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly service: UsageCommandService) {}

  @Options()
  options() { return this.service.options(); }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req));
  }
}
