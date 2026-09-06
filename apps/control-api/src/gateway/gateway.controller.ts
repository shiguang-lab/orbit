import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { GatewayService } from "./gateway.service.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { POST as previewRoute } from "./handlers/route-preview.handler.js";

@Controller("api")
export class GatewayController {
  constructor(
    @Inject(GatewayService) private readonly gatewayService: GatewayService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Post("gateway/route/preview")
  preview(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, previewRoute);
  }

  @Get("gateway/status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = request.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const status = await this.gatewayService.getGatewayStatus();
      return reply.send(status);
    } catch {
      return reply.status(500).send({ error: "Failed to build ShiguangGateway status" });
    }
  }

  @Post("restart")
  async restart(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = request.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    return reply.send(this.gatewayService.scheduleRestart());
  }

  @Post("shutdown")
  async shutdown(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    const rawReq = request.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).send(await authError.json());

    return reply.send(this.gatewayService.scheduleShutdown());
  }
}
