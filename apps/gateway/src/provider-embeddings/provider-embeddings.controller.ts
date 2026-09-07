import { Controller, Inject, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProviderEmbeddingsService } from "./provider-embeddings.service.js";

@Controller([
  "v1/providers/:provider/embeddings",
  "api/v1/providers/:provider/embeddings",
])
export class ProviderEmbeddingsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ProviderEmbeddingsService) private readonly service: ProviderEmbeddingsService,
  ) {}

  @Post()
  post(
    @Param("provider") provider: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (r) => this.service.handlePost(r, provider), {
      provider,
    });
  }

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.handleOptions());
  }
}

