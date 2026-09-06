import { Injectable } from "@nestjs/common";
import { GET, OPTIONS, OPTIONS_GENERATE, POST } from "./gemini-v1beta.handler.js";

@Injectable()
export class GeminiV1betaService {
  handleGet(): Promise<Response> { return GET(); }
  handleOptions(): Response { return OPTIONS(); }
  handlePost(request: Request, path: string[]): Promise<Response> { return POST(request, path); }
  handleGenerateOptions(): Response { return OPTIONS_GENERATE(); }
}
