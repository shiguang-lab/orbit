import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { AudioService } from "./audio.service.js";

@Controller()
export class AudioController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(AudioService) private readonly audioService: AudioService
  ) {}


  @Post(["v1/speech-to-text", "api/v1/speech-to-text"])
  speechToText(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.audioService.handleSpeechToText(r));
  }

  @Options(["v1/speech-to-text", "api/v1/speech-to-text"])
  speechToTextOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.audioService.handleOptions());
  }

  @Post(["v1/audio/speech", "api/v1/audio/speech"])
  audioSpeech(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.audioService.handleAudioSpeech(r));
  }

  @Options(["v1/audio/speech", "api/v1/audio/speech"])
  audioSpeechOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.audioService.handleOptions());
  }

  @Post(["v1/audio/transcriptions", "api/v1/audio/transcriptions"])
  audioTranscriptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.audioService.handleAudioTranscriptions(r));
  }

  @Options(["v1/audio/transcriptions", "api/v1/audio/transcriptions"])
  audioTranscriptionsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.audioService.handleOptions());
  }

  @Post(["v1/audio/translations", "api/v1/audio/translations"])
  audioTranslations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.audioService.handleAudioTranslations(r));
  }

  @Options(["v1/audio/translations", "api/v1/audio/translations"])
  audioTranslationsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.audioService.handleOptions());
  }
}
