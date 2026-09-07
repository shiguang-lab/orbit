import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./handlers/antigravity.handler.js";

@Injectable()
export class AntigravityService {
  post(request: Request): Promise<Response> {
    return POST(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
