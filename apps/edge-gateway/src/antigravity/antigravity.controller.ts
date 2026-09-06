import { Controller, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AntigravityService } from "./antigravity.service.js";

@Controller()
export class AntigravityController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: AntigravityService,
  ) {}

  @Post(["v1/antigravity", "api/v1/antigravity"])
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.post(req));
  }

  @Options(["v1/antigravity", "api/v1/antigravity"])
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
