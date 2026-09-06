import { Injectable } from "@nestjs/common";
import * as jsonRpcRoute from "./legacy/jsonrpc.js";
import * as tasksRoute from "./legacy/tasks.js";
import * as taskByIdRoute from "./legacy/task-by-id.js";
import * as taskCancelRoute from "./legacy/task-cancel.js";
import * as statusRoute from "./legacy/status.js";

/**
 * Edge-owned A2A application service.
 *
 * The transport and route registration live in this app. The current skill
 * implementation is app-owned and calls core through its transport-neutral A2A runtime contract.
 */
@Injectable()
export class A2aService {
  async handleRpc(request: Request, method: "POST" | "OPTIONS"): Promise<Response> {
    return jsonRpcRoute[method](request);
  }

  async listTasks(request: Request): Promise<Response> {
    return tasksRoute.GET(request);
  }

  async delegateTask(request: Request): Promise<Response> {
    return tasksRoute.POST(request);
  }

  async getTask(request: Request, params: { id: string }): Promise<Response> {
    return taskByIdRoute.GET(request, { params: Promise.resolve(params) });
  }

  async cancelTask(request: Request, params: { id: string }): Promise<Response> {
    return taskCancelRoute.POST(request, { params: Promise.resolve(params) });
  }

  async status(request: Request): Promise<Response> {
    return statusRoute.GET(request);
  }
}
