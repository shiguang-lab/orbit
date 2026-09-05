import { Injectable } from "@nestjs/common";
import { audioOptionsResponse } from "./audio-options.js";
import { proxyElevenLabsRequest } from "./elevenlabs-proxy.js";

/** Application service for the ElevenLabs-compatible speech-to-text endpoint. */
@Injectable()
export class SpeechToTextService {
  handleOptions(): Response {
    return audioOptionsResponse();
  }

  handleSpeechToText(request: Request): Promise<Response> {
    return proxyElevenLabsRequest(request, "/speech-to-text", {
      method: "POST",
      body: request.body,
      duplex: "half",
    } as RequestInit);
  }
}

