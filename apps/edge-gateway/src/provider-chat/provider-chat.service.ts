import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./provider-chat.handler.js";

@Injectable()
export class ProviderChatService {
  handlePost(request: Request, provider: string): Promise<Response> {
    return POST(request, { params: { provider } });
  }

  handleOptions(): Response {
    return OPTIONS();
  }
}
