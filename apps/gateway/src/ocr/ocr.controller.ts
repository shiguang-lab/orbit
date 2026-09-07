import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { OcrService } from "./ocr.service.js";

@Controller(["v1/ocr", "api/v1/ocr"])
export class OcrController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(OcrService) private readonly ocrService: OcrService,
  ) {}

  @Options()
  options(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.ocrService.handleOptions());
  }

  @Post()
  ocr(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.ocrService.handlePost(r));
  }
}
