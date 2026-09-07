import { Controller, Delete, Get, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { MiddlewareHooksService } from "./middleware-hooks.service.js";

@Controller("api/middleware/hooks")
export class MiddlewareHooksController {
  constructor(private readonly routes: WebRouteDispatcher, private readonly hooks: MiddlewareHooksService) {}

  @Get() list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.hooks.list(r)); }
  @Post() create(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.hooks.create(r)); }
  @Get(":name") get(@Param("name") name: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.hooks.get(r, name), { name }); }
  @Put(":name") update(@Param("name") name: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.hooks.update(r, name), { name }); }
  @Delete(":name") remove(@Param("name") name: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.hooks.remove(r, name), { name }); }
}
