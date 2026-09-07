import { Inject, Controller, Get, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { SearchProvidersService } from "./search-providers.service.js";

@Controller("api/search/providers")
export class SearchProvidersController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SearchProvidersService) private readonly service: SearchProvidersService,
  ) {}

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req));
  }
}
