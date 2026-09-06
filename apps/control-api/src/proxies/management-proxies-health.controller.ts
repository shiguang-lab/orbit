import { Controller, Get, Inject, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxiesService } from "./proxies.service.js";

/** Management API alias for proxy health statistics. */
@Controller("api/v1/management/proxies/health")
export class ManagementProxiesHealthController {
  constructor(
    @Inject(ProxiesService) private readonly proxies: ProxiesService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.proxies.health(req));
  }
}
