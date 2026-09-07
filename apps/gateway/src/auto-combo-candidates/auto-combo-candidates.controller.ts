import { Controller, Get, Options, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AutoComboCandidatesService } from "./auto-combo-candidates.service.js";

@Controller()
export class AutoComboCandidatesController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly service: AutoComboCandidatesService,
  ) {}

  @Get(["v1/auto-combo/:channel/candidates", "api/v1/auto-combo/:channel/candidates"])
  get(
    @Param("channel") channel: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, (req) => this.service.get(req, channel), { channel });
  }

  @Options(["v1/auto-combo/:channel/candidates", "api/v1/auto-combo/:channel/candidates"])
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, () => this.service.options());
  }
}
