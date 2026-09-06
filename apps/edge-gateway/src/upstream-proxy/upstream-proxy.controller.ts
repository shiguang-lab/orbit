import { Controller, Delete, Get, Inject, Param, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { UpstreamProxyService } from "./upstream-proxy.service.js";

@Controller("api/upstream-proxy/:providerId")
export class UpstreamProxyController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(UpstreamProxyService) private readonly service: UpstreamProxyService,
  ) {}

  @Get()
  get(@Param("providerId") providerId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.get(providerId));
  }

  @Put()
  put(@Param("providerId") providerId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) => this.service.put(webRequest, providerId));
  }

  @Delete()
  delete(@Param("providerId") providerId: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.delete(providerId));
  }
}
