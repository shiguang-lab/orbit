import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { IssuesService } from "./issues.service.js";

@Controller("api/v1/issues")
export class IssuesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(IssuesService) private readonly service: IssuesService,
  ) {}

  @Post("report")
  report(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.report(req));
  }
}
