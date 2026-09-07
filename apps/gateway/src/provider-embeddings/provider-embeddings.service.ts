import { Injectable } from "@nestjs/common";
import { OPTIONS, POST } from "./provider-embeddings.handler.js";

@Injectable()
export class ProviderEmbeddingsService {
  handlePost(request: Request, provider: string): Promise<Response> {
    return POST(request, { params: { provider } });
  }

  handleOptions(): Response {
    return OPTIONS();
  }
}

