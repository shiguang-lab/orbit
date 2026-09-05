import { Injectable } from "@nestjs/common";
import {
  elevenLabsOptionsResponse,
  isSafeElevenLabsVoiceId,
  proxyElevenLabsRequest,
} from "@shiguang-gateway/core-domain/edge/elevenlabs-proxy";
import { buildErrorBody } from "@shiguang-gateway/core-domain/open-sse/utils/error.ts";
import { CORS_HEADERS } from "@shiguang-gateway/core-domain/edge/ws-cors";

@Injectable()
export class VoicesService {
  handleGetVoices(req: Request) {
    return proxyElevenLabsRequest(req, "/voices");
  }

  handleOptionsTextToSpeech() {
    return elevenLabsOptionsResponse();
  }

  async handlePostTextToSpeech(request: Request, voiceId: string) {
    if (!isSafeElevenLabsVoiceId(voiceId)) {
      return new Response(JSON.stringify(buildErrorBody(400, "Invalid ElevenLabs voice ID")), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    return proxyElevenLabsRequest(request, `/text-to-speech/${voiceId}`, {
      method: "POST",
      body: request.body,
      duplex: "half",
    } as any);
  }
}
