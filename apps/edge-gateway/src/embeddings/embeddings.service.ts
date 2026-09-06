import { Injectable } from "@nestjs/common";
import { GET as getEmbeddings, POST as createEmbedding } from "./embeddings.handler.js";

@Injectable()
export class EmbeddingsService {
  handleGetEmbeddings(req?: Request) {
    return getEmbeddings(req);
  }

  handleCreateEmbedding(req: Request) {
    return createEmbedding(req);
  }
}
