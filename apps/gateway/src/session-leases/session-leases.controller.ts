import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SessionLeasesService } from "./session-leases.service.js";

@Controller(["v1/session-leases", "api/v1/session-leases"])
export class SessionLeasesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SessionLeasesService) private readonly service: SessionLeasesService,
  ) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleOptions());
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.service.handlePost(r));
  }
}
