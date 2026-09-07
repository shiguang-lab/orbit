import { Injectable } from "@nestjs/common";

import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

/** Use cases for the operator concurrency diagnostics endpoint. */
@Injectable()
export class AdminConcurrencyService {
  async status() {
    return executeEdgeRuntimeCommand({ command: "concurrency.snapshot" });
  }

  async resetSemaphores() {
    await executeEdgeRuntimeCommand({ command: "concurrency.reset" });
  }
}
