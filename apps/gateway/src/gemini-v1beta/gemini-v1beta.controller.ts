import { Controller, Get, Inject, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { GeminiV1betaService } from "./gemini-v1beta.service.js";

@Controller(["v1beta", "api/v1beta"])
export class GeminiV1betaController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(GeminiV1betaService) private readonly service: GeminiV1betaService,
  ) {}

  @Options("models")
  optionsModels(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleOptions());
  }

  @Get("models")
  getModels(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleGet());
  }

  @Options("models/*")
  optionsGenerate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleGenerateOptions());
  }

  @Post("models/*")
  postGenerate(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const raw = (request.params as Record<string, unknown> | undefined)?.["*"] ?? "";
    const path = String(raw).split("/").filter(Boolean).map(decodeURIComponent);
    return this.routes.dispatch(request, reply, (r) => this.service.handlePost(r, path));
  }
}
