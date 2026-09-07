import { Controller, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProviderImagesService } from "./provider-images.service.js";

@Controller(["v1/providers/:provider/images", "api/v1/providers/:provider/images"])
export class ProviderImagesController {
  constructor(
    private readonly providerImages: ProviderImagesService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Options("generations")
  options(@Res() reply: FastifyReply) {
    const response = this.providerImages.options();
    return reply.status(response.status).headers(Object.fromEntries(response.headers.entries())).send();
  }

  @Post("generations")
  generate(@Param("provider") provider: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (request) => this.providerImages.generate(request, provider), { provider });
  }
}
