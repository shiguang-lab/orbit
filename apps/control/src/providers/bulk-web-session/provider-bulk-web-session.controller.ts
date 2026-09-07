import { Inject, Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { ProviderBulkWebSessionService } from "./provider-bulk-web-session.service.js";

@Controller("api/providers")
export class ProviderBulkWebSessionController {
  constructor(
    @Inject(ProviderBulkWebSessionService) private readonly service: ProviderBulkWebSessionService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Post("bulk-web-session")
  handle(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.service.handle(req),
    );
  }
}
