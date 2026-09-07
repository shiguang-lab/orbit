import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ModerationsService } from "./moderations.service.js";

@Controller(["v1/moderations", "api/v1/moderations"])
export class ModerationsController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ModerationsService) private readonly moderationsService: ModerationsService
  ) {}

  @Post()
  moderations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.moderationsService.handleModerations(r));
  }

}
