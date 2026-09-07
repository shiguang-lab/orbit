import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  createServiceNode,
  deleteServiceNode,
  getServiceNodeConnection,
  listServiceNodes,
  storeServiceNodeReport,
} from "@orbit/core/control/service-nodes";
import { createNodeSchema, nodeReportSchema } from "./report-schema.js";

@Injectable()
export class ServiceNodesService {
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  onModuleInit() {
    const endpoint = process.env.ORBIT_CLIPROXY_MANAGER_ENDPOINT?.trim();
    if (endpoint) {
      const id = process.env.ORBIT_CLIPROXY_MANAGER_ID || "nas";
      const existing = listServiceNodes().find((node) => node.id === id);
      if (existing && existing.endpoint !== new URL(endpoint).origin) {
        throw new Error(
          "Configured CLIProxyAPI instance ID already has a different address",
        );
      }
      if (!existing)
        this.create({
          id,
          name: process.env.ORBIT_CLIPROXY_MANAGER_NAME || "NAS",
          endpoint,
        });
    }
    void this.poll();
  }
  onModuleDestroy() {
    this.closed = true;
    clearTimeout(this.timer);
  }
  private async poll() {
    const nodes = listServiceNodes();
    for (let offset = 0; offset < nodes.length && !this.closed; offset += 4) {
      // A failed refresh retains the last report; its online lease expires.
      await Promise.allSettled(
        nodes.slice(offset, offset + 4).map((node) => this.refresh(node.id)),
      );
    }
    if (!this.closed) {
      this.timer = setTimeout(() => void this.poll(), 15_000);
      this.timer.unref();
    }
  }

  list() {
    return listServiceNodes();
  }
  create(body: unknown) {
    const parsed = createNodeSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("Invalid node configuration");
    const endpoint = new URL(parsed.data.endpoint);
    if (
      !["http:", "https:"].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== "/"
    ) {
      throw new BadRequestException(
        "Node endpoint must be an HTTP(S) origin without credentials or path",
      );
    }
    if (
      parsed.data.id &&
      listServiceNodes().some((node) => node.id === parsed.data.id)
    )
      throw new ConflictException("Node ID already registered");
    if (listServiceNodes().some((node) => node.endpoint === endpoint.origin))
      throw new ConflictException("Instance address already registered");
    const created = createServiceNode({
      ...parsed.data,
      endpoint: endpoint.origin,
    });
    void this.refresh(created.node.id).catch(() => {});
    return created;
  }
  remove(id: string) {
    if (!deleteServiceNode(id)) throw new NotFoundException("Node not found");
    return { success: true };
  }
  async request(
    id: string,
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const node = getServiceNodeConnection(id);
    if (!node) throw new NotFoundException("Node not found");
    let response: Response;
    try {
      response = await fetch(`${node.endpoint}/v1/${path}`, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: {
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      throw new BadGatewayException("Node is unreachable");
    }
    if (response.status === 204) return { success: true };
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2 * 1024 * 1024) {
          await reader.cancel();
          throw new BadGatewayException("Node response exceeds size limit");
        }
        chunks.push(value);
      }
    }
    const text = Buffer.concat(chunks).toString("utf8");
    if (!response.ok)
      throw new BadGatewayException(
        `Node returned HTTP ${response.status}: ${text.slice(0, 500)}`,
      );
    try {
      return JSON.parse(text);
    } catch {
      throw new BadGatewayException("Invalid node response");
    }
  }
  management(id: string, instanceId: string, body: unknown) {
    if (!body || typeof body !== "object")
      throw new BadRequestException("Invalid management request");
    const input = body as { method?: string; path?: string; payload?: unknown };
    const method = input.method ?? "GET";
    if (
      !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method) ||
      typeof input.path !== "string"
    )
      throw new BadRequestException("Invalid management method or path");
    const parsed = new URL(input.path, "http://instance/");
    const allowed =
      /^(auth-files(?:\/(?:status|fields|models))?|(?:codex|anthropic|antigravity|kimi|xai)-auth-url|get-auth-status|oauth-callback|oauth-session|oauth-model-alias|oauth-excluded-models|config|proxy-url|request-retry|routing\/strategy)$/;
    if (
      parsed.origin !== "http://instance" ||
      parsed.hash ||
      !allowed.test(parsed.pathname.slice(1))
    )
      throw new BadRequestException("Unsupported management endpoint");
    return this.request(
      id,
      `instances/${encodeURIComponent(instanceId)}/management${parsed.pathname}${parsed.search}`,
      method,
      input.payload,
    );
  }
  async refresh(id: string) {
    const raw = await this.request(id, "node");
    const result = nodeReportSchema.safeParse(raw);
    if (!result.success)
      throw new BadGatewayException("Invalid instance report");
    storeServiceNodeReport(id, result.data);
    return result.data;
  }
}
