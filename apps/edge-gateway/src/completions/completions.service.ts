import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./completions.handler.js";

@Injectable()
export class CompletionsService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
