/**
 * requestId 插件：为每个请求生成 requestId，写入 header 供审计关联。
 * 对齐 Shiguang Gateway 的 generateRequestId 约定(header: x-request-id)。
 */
import type { FastifyInstance } from "fastify";

export function requestIdPlugin(app: FastifyInstance): void {
  app.addHook("onRequest", (request, _reply, done) => {
    const existing = request.headers["x-request-id"];
    const id =
      (Array.isArray(existing) ? existing[0] : existing) ??
      `req-${crypto.randomUUID().slice(0, 8)}${Date.now().toString(36)}`;
    request.id = id;
    done();
  });

  app.addHook("onSend", (request, reply, payload, done) => {
    if (!reply.getHeader("x-request-id")) {
      reply.header("x-request-id", request.id);
    }
    done();
  });
}
