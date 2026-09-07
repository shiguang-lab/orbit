import { Injectable } from "@nestjs/common";
import { getBatch, listBatches } from "@orbit/core/db/batches";

@Injectable()
export class BatchesService {
  list(limit: number) {
    return listBatches(undefined, limit);
  }

  get(id: string) {
    return getBatch(id);
  }
}
