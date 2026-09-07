import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { WebhooksService } from "./webhooks.service.js";

@Controller("api/webhooks")
export class WebhooksController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(WebhooksService) private readonly webhooks: WebhooksService,
  ) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.list(request));
  }

  @Post()
  create(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() _body: unknown) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.create(request));
  }

  @Post("validate-url")
  validateUrl(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.validateUrl(request));
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.get(request, id), { id });
  }

  @Put(":id")
  update(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.update(request, id), { id });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.remove(request, id), { id });
  }

  @Get(":id/deliveries")
  deliveries(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.deliveries(request, id), { id });
  }

  @Post(":id/test")
  test(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.webhooks.test(request, id), { id });
  }
}
