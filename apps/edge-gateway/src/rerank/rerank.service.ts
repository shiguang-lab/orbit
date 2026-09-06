import { Injectable } from "@nestjs/common";
import { POST as rerank } from "./rerank.handler.js";

@Injectable()
export class RerankService {
  handleRerank(req: Request) {
    return rerank(req);
  }
}
