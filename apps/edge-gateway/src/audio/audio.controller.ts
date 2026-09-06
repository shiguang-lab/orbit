import { Controller, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { SpeechToTextService } from "./speech-to-text.service.js";
import { AudioTranscriptionService } from "./audio-transcription.service.js";
import { AudioTranslationService } from "./audio-translation.service.js";

@Controller()
export class AudioController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(SpeechToTextService) private readonly speechToTextService: SpeechToTextService,
    @Inject(AudioTranscriptionService) private readonly transcriptions: AudioTranscriptionService,
    @Inject(AudioTranslationService) private readonly translations: AudioTranslationService,
  ) {}


  @Post(["v1/speech-to-text", "api/v1/speech-to-text"])
  speechToText(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.speechToTextService.handleSpeechToText(r));
  }

  @Options(["v1/speech-to-text", "api/v1/speech-to-text"])
  speechToTextOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.speechToTextService.handleOptions());
  }

  @Post(["v1/audio/transcriptions", "api/v1/audio/transcriptions"])
  audioTranscriptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.transcriptions.handleAudioTranscriptions(r));
  }

  @Options(["v1/audio/transcriptions", "api/v1/audio/transcriptions"])
  audioTranscriptionsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.transcriptions.handleOptions());
  }

  @Post(["v1/audio/translations", "api/v1/audio/translations"])
  audioTranslations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.translations.handleAudioTranslations(r));
  }

  @Options(["v1/audio/translations", "api/v1/audio/translations"])
  audioTranslationsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, () => this.translations.handleOptions());
  }
}
