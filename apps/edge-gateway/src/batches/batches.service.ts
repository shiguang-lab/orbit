import { Injectable } from "@nestjs/common";
import { GET as getBatches, POST as createBatch } from "./handlers/root.handler.js";
import { GET as getBatch, DELETE as deleteBatch } from "./handlers/by-id.handler.js";
import { POST as cancelBatch } from "./handlers/cancel.handler.js";
import { DELETE as deleteCompletedBatches } from "./handlers/delete-completed.handler.js";

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
