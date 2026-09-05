import { Injectable } from "@nestjs/common";
import { GET as getBatches, POST as createBatch } from "@shiguang-gateway/core-domain/edge/batches-root-handler";
import { GET as getBatch, DELETE as deleteBatch } from "@shiguang-gateway/core-domain/edge/batches-by-id-handler";
import { POST as cancelBatch } from "@shiguang-gateway/core-domain/edge/batches-cancel-handler";
import { DELETE as deleteCompletedBatches } from "@shiguang-gateway/core-domain/edge/batches-delete-completed-handler";

@Injectable()
export class BatchesService {
  handleGetBatches(req: Request) {
    return getBatches(req);
  }

  handleCreateBatch(req: Request) {
    return createBatch(req);
  }

  handleDeleteCompleted(req: Request) {
    return deleteCompletedBatches(req);
  }

  handleGetBatch(req: Request, id: string) {
    return getBatch(req, { params: { id } as any });
  }

  handleDeleteBatch(req: Request, id: string) {
    return deleteBatch(req, { params: { id } as any });
  }

  handleCancelBatch(req: Request, id: string) {
    return cancelBatch(req, { params: { id } as any });
  }
}
