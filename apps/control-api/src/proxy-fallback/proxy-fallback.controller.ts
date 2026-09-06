import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxyFallbackService } from "./proxy-fallback.service.js";

@Controller("api/proxy-fallback")
export class ProxyFallbackController {
  constructor(private readonly service: ProxyFallbackService, private readonly routes: WebRouteDispatcher) {}

  @Post("test")
  async test(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(req.raw as unknown as Request);
    if (authError) return reply.status(authError.status).send(await authError.json());
    return this.routes.dispatch(req, reply, (request) => this.service.test(request));
  }
}
