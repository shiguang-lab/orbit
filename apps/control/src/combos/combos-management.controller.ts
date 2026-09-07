import { Controller, Delete, Get, Inject, Param, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { CombosManagementService } from "./combos-management.service.js";

/** Management-only combo operations. Runtime combo execution remains edge-owned. */
@Controller("api/combos")
export class CombosManagementController {
  constructor(
    @Inject(CombosManagementService) private readonly combos: CombosManagementService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.list(request));
  }

  @Post()
  create(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.create(request));
  }

  @Get("builder/options")
  builderOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.builderOptions(request));
  }

  @Get("metrics")
  metrics(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.metrics(request));
  }

  @Delete("metrics")
  resetMetrics(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.resetMetrics(request));
  }

  @Post("reorder")
  reorder(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.reorder(request));
  }

  @Post("duplicate")
  duplicate(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.duplicate(request));
  }

  @Get("auto")
  auto(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.auto(request));
  }

  @Post("test")
  test(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.test(request));
  }

  @Get(":id")
  get(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.get(request, id), { id });
  }

  @Put(":id")
  update(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.update(request, id), { id });
  }

  @Patch(":id")
  patch(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.patch(request, id), { id });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.combos.remove(request, id), { id });
  }
}
