import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./ollama-chat.handler.js";

@Injectable()
export class OllamaChatService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
