import { Injectable } from "@nestjs/common";
import { POST as audioSpeech } from "@shiguang-gateway/core-domain/edge/audio-speech-handler";
import { POST as audioTranslations } from "@shiguang-gateway/core-domain/edge/audio-translation-handler";
import { POST as audioTranscriptions } from "@shiguang-gateway/core-domain/edge/audio-transcription-handler";
import {
  elevenLabsOptionsResponse,
  proxyElevenLabsRequest,
} from "@shiguang-gateway/core-domain/edge/elevenlabs-proxy";

@Injectable()
export class AudioService {
  handleSpeechToText(req: Request) {
    return proxyElevenLabsRequest(req, "/speech-to-text", {
      method: "POST",
      body: req.body,
      duplex: "half",
    } as any);
  }

  handleOptions() {
    return elevenLabsOptionsResponse();
  }

  handleAudioSpeech(req: Request) {
    return audioSpeech(req);
  }

  handleAudioTranscriptions(req: Request) {
    return audioTranscriptions(req);
  }

  handleAudioTranslations(req: Request) {
    return audioTranslations(req);
  }
}
