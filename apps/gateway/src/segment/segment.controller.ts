import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SegmentService } from "./segment.service.js";

@Controller(["v1/segment", "api/v1/segment"])
export class SegmentController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SegmentService) private readonly segmentService: SegmentService,
  ) {}

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.segmentService.handleOptions());
  }

  @Post()
  segment(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.segmentService.handlePost(r));
  }
}
