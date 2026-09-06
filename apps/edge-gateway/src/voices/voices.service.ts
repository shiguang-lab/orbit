import { Injectable } from "@nestjs/common";
import {
  elevenLabsOptionsResponse,
  isSafeElevenLabsVoiceId,
  proxyElevenLabsRequest,
  ELEVENLABS_CORS_HEADERS,
} from "../audio/elevenlabs-proxy.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

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
      const { buildErrorBody } = await load("@shiguang-gateway/open-sse/utils/error");
      return new Response(JSON.stringify(buildErrorBody(400, "Invalid ElevenLabs voice ID")), {
        status: 400,
        headers: { ...ELEVENLABS_CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    return proxyElevenLabsRequest(request, `/text-to-speech/${voiceId}`, {
      method: "POST",
      body: request.body,
      duplex: "half",
    } as any);
  }
}
