import { Controller, Delete, Get, Patch, Post, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxySubscriptionsService } from "./proxy-subscriptions.service.js";

@Controller("api/v1/management/proxy-subscriptions")
export class ProxySubscriptionsController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: ProxySubscriptionsService,
  ) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.list(request));
  }

  @Post()
  create(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.service.create(request));
  }

  @Get(":id")
  get(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(req, reply, (request) => this.service.get(request, id));
  }

  @Patch(":id")
  update(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(req, reply, (request) => this.service.update(request, id));
  }

  @Delete(":id")
  remove(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(req, reply, (request) => this.service.remove(request, id));
  }

  @Get(":id/nodes")
  nodes(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(req, reply, (request) => this.service.nodes(request, id));
  }

  @Post(":id/refresh")
  refresh(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(req, reply, (request) => this.service.refresh(request, id));
  }
}
