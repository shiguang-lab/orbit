import { Injectable } from "@nestjs/common";

/**
 * Edge-owned A2A application service.
 *
 * The transport and route registration live in this app. The current skill
 * implementation remains behind an explicit legacy package export while its
 * provider/DB dependencies are migrated domain by domain. Dynamic loading is
 * intentional: it keeps the Nest app boundary independent of the Next route
 * tree and avoids importing package internals during compilation.
 */
@Injectable()
export class A2aService {
  private load(specifier: string): Promise<Record<string, any>> {
    return import(specifier as string) as Promise<Record<string, any>>;
  }

  async handleRpc(request: Request, method: "POST" | "OPTIONS"): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-jsonrpc");
    return route[method](request);
  }

  async listTasks(request: Request): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-tasks");
    return route.GET(request);
  }

  async delegateTask(request: Request): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-tasks");
    return route.POST(request);
  }

  async getTask(request: Request, params: { id: string }): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-task-by-id");
    return route.GET(request, { params });
  }

  async cancelTask(request: Request, params: { id: string }): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-task-cancel");
    return route.POST(request, { params });
  }

  async status(request: Request): Promise<Response> {
    const route = await this.load("@shiguang-gateway/core-domain/a2a/legacy-status");
    return route.GET(request);
  }
}
