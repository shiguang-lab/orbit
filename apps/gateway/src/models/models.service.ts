import { Injectable } from "@nestjs/common";
import { GET, GET_ROOT, HEAD, OPTIONS } from "./models.handler.js";
import { GET as GET_BY_ID, HEAD as HEAD_BY_ID, OPTIONS as OPTIONS_BY_ID } from "./model-by-id.handler.js";

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

  handleGetById(request: Request, requestedId: string): Promise<Response> {
    return GET_BY_ID(request, requestedId);
  }

  handleHeadById(): Response {
    return HEAD_BY_ID();
  }

  handleOptionsById(): Response {
    return OPTIONS_BY_ID();
  }
}
