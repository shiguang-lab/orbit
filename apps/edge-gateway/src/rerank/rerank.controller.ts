import { Controller, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { RerankService } from "./rerank.service.js";

@Controller(["v1/rerank", "api/v1/rerank"])
export class RerankController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(RerankService) private readonly rerankService: RerankService
  ) {}

  @Post()
  rerank(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.rerankService.handleRerank(r));
  }

}
