import { Controller, Get, Head, Inject, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ModelsService } from "./models.service.js";

/** OpenAI-compatible model catalog and its /v1 compatibility alias. */
@Controller(["v1", "api/v1"])
export class ModelsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ModelsService) private readonly models: ModelsService,
  ) {}

  @Get("models")
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.models.handleGet(r));
  }

  @Head("models")
  head(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.models.handleHead());
  }

  @Options("models")
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.models.handleOptions());
  }

  @Get()
  getRoot(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (r) => this.models.handleGetRoot(r));
  }

  @Options()
  optionsRoot(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.models.handleOptions());
  }
}
