import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./handlers/chat-completions.handler.js";

@Injectable()
export class ChatCompletionsService {
  post(request: Request): Promise<Response> { return POST(request); }
  options(): Response { return OPTIONS(); }
}
