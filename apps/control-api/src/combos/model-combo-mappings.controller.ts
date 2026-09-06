import { Controller, Delete, Get, Inject, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ModelComboMappingsService } from "./model-combo-mappings.service.js";

@Controller("api/model-combo-mappings")
export class ModelComboMappingsController {
  constructor(
    @Inject(ModelComboMappingsService) private readonly mappings: ModelComboMappingsService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get()
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.mappings.handleList(req));
  }

  @Post()
  create(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.mappings.handleCreate(req));
  }

  @Get(":id")
  getById(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.mappings.handleGetById(req, id), { id });
  }

  @Put(":id")
  update(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.mappings.handleUpdate(req, id), { id });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.mappings.handleRemove(req, id), { id });
  }
}
