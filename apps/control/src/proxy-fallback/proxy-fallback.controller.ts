import { toWebRequest } from "@orbit/http/web-handler";
import { Inject, Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxyFallbackService } from "./proxy-fallback.service.js";

@Controller("api/proxy-fallback")
export class ProxyFallbackController {
  constructor(@Inject(ProxyFallbackService) private readonly service: ProxyFallbackService, @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Post("test")
  async test(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(req));
    if (authError) return reply.status(authError.status).send(await authError.json());
    return this.routes.dispatch(req, reply, (request) => this.service.test(request));
  }
}
