import { Injectable } from "@nestjs/common";
import { ollamaModels } from "@shiguang-gateway/open-sse/config/ollamaModels";
import { CORS_HEADERS } from "@shiguang-gateway/core-domain/shared/cors";

@Injectable()
export class TagsService {
  options(): Response {
    return new Response(null, { headers: CORS_HEADERS });
  }

  list(): Response {
    return new Response(JSON.stringify(ollamaModels), {
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  }
}
