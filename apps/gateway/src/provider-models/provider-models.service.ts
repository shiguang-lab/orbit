import { Injectable } from "@nestjs/common";
import { GET, OPTIONS } from "./provider-models.handler.js";

@Injectable()
export class ProviderModelsService {
  handleGet(request: Request, provider: string): Promise<Response> {
    return GET(request, { params: { provider } });
  }

  handleOptions(): Response {
    return OPTIONS();
  }
}
