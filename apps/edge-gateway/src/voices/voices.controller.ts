import { Controller, Get, Inject, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { VoicesService } from "./voices.service.js";

@Controller()
export class VoicesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(VoicesService) private readonly voicesService: VoicesService
  ) {}

  @Get(["v1/voices", "api/v1/voices"])
  getVoices(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.voicesService.handleGetVoices(r));
  }

  @Options(["v1/text-to-speech/:voiceId", "api/v1/text-to-speech/:voiceId"])
  optionsTextToSpeech(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.voicesService.handleOptionsTextToSpeech());
  }

  @Post(["v1/text-to-speech/:voiceId", "api/v1/text-to-speech/:voiceId"])
  postTextToSpeech(
    @Param("voiceId") voiceId: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    return this.routes.dispatch(
      req,
      reply,
      (r) => this.voicesService.handlePostTextToSpeech(r, voiceId),
      { voiceId }
    );
  }

}
