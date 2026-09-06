import { Injectable } from "@nestjs/common";
import { getBatch, listBatches } from "@shiguang-gateway/core-domain/db/batches";

@Injectable()
export class BatchesService {
  list(limit: number) {
    return listBatches(undefined, limit);
  }

  get(id: string) {
    return getBatch(id);
  }
}
