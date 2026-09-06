import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./handlers/suggested-models.handler.js";

@Injectable()
export class SuggestedModelsService {
  get(request: Request): Promise<Response> {
    return GET(request);
  }

  options(): Response {
    return OPTIONS();
  }
}
