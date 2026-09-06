import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./relay-chat.handler.js";

@Injectable()
export class RelayChatService {
  post(request: Request) {
    return POST(request);
  }

  options() {
    return OPTIONS();
  }
}
