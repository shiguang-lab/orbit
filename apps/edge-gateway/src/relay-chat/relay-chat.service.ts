import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "@shiguang-gateway/core-domain/edge/relay-chat";

@Injectable()
export class RelayChatService {
  post(request: Request) {
    return POST(request);
  }

  options() {
    return OPTIONS();
  }
}
