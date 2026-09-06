import { Injectable } from "@nestjs/common";
import { GET, GET_ROOT, HEAD, OPTIONS } from "./models.handler.js";

@Injectable()
export class ModelsService {
  handleGet(request: Request): Promise<Response> {
    return GET(request);
  }

  handleGetRoot(request: Request): Promise<Response> {
    return GET_ROOT(request);
  }

  handleHead(): Response {
    return HEAD();
  }

  handleOptions(): Response {
    return OPTIONS();
  }
}
