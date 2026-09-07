import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./messages.handler.js";
import {
  OPTIONS as COUNT_TOKENS_OPTIONS,
  POST as COUNT_TOKENS_POST,
} from "./handlers/count-tokens.handler.js";

@Injectable()
export class MessagesService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }

  options(): Response {
    return OPTIONS();
  }

  countTokens(request: Request): Promise<Response> {
    return COUNT_TOKENS_POST(request);
  }

  countTokensOptions(): Promise<Response> {
    return COUNT_TOKENS_OPTIONS();
  }
}
