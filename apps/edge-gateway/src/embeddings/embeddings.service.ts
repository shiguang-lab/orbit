import { Injectable } from "@nestjs/common";
import { GET as getEmbeddings, POST as createEmbedding } from "@shiguang-gateway/core-domain/edge/embeddings-handler";

@Injectable()
export class EmbeddingsService {
  handleGetEmbeddings(req?: Request) {
    return getEmbeddings(req);
  }

  handleCreateEmbedding(req: Request) {
    return createEmbedding(req);
  }
}
