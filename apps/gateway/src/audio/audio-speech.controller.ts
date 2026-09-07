import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AudioSpeechService } from "./audio-speech.service.js";

@Controller()
export class AudioSpeechController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(AudioSpeechService) private readonly speech: AudioSpeechService,
  ) {}

  @Post(["v1/audio/speech", "api/v1/audio/speech"])
  audioSpeech(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.speech.handleAudioSpeech(r));
  }

  @Options(["v1/audio/speech", "api/v1/audio/speech"])
  audioSpeechOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.speech.handleOptions());
  }
}
