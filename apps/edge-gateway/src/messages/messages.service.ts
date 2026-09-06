import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./messages.handler.js";

@Injectable()
export class MessagesService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
