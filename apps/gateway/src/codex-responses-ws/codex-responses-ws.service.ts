import { Injectable } from "@nestjs/common";
import { POST } from "./codex-responses-ws.handler.js";

@Injectable()
export class CodexResponsesWsService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }
}
