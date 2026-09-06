import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { EmbeddingsService } from "./embeddings.service.js";

@Controller([
  "v1/embeddings",
  "api/v1/embeddings",
  "v1/multimodal-embeddings",
  "api/v1/multimodal-embeddings",
])
export class EmbeddingsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(EmbeddingsService) private readonly embeddingsService: EmbeddingsService
  ) {}

  @Get()
  getEmbeddings(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.embeddingsService.handleGetEmbeddings(r));
  }

  @Post()
  createEmbedding(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.embeddingsService.handleCreateEmbedding(r));
  }
}
