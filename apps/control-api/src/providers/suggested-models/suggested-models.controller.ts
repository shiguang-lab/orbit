import { Controller, Get, Options, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { SuggestedModelsService } from "./suggested-models.service.js";

@Controller("api/v1/providers/suggested-models")
export class SuggestedModelsController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: SuggestedModelsService,
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
