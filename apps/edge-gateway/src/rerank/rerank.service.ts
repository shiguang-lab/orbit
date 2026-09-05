import { Injectable } from "@nestjs/common";
import { POST as rerank } from "@shiguang-gateway/core-domain/edge/rerank-handler";

@Injectable()
export class RerankService {
  handleRerank(req: Request) {
    return rerank(req);
  }
}
