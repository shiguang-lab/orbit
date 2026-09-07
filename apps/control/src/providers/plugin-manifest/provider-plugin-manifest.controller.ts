import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { ProviderPluginManifestService } from "./provider-plugin-manifest.service.js";

@Controller("api/v1/provider-plugin-manifest")
export class ProviderPluginManifestController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: ProviderPluginManifestService,
  ) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req));
  }
}
