import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./classify.handler.js";

@Injectable()
export class ClassifyService {
  handleOptions(): Response {
    return OPTIONS();
  }

  handlePost(request: Request): Promise<Response> {
    return POST(request);
  }
}
