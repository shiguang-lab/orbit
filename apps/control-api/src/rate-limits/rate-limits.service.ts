import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getProviderConnections, updateProviderConnection } from "@shiguang-gateway/core-domain/db/provider-connections";
import { getAccountDisplayName } from "@shiguang-gateway/core-domain/catalog/display-names";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { toggleRateLimitSchema } from "@shiguang-gateway/core-domain/validation/misc";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

type JsonRecord = Record<string, unknown>;

@Injectable()
export class RateLimitsService {
  async getStatus(reply: FastifyReply): Promise<unknown> {
    try {
      const rawConnections = await getProviderConnections();
      const targets = rawConnections.map((raw) => {
        const conn = this.asRecord(raw);
        return { connectionId: String(conn.id ?? ""), provider: String(conn.provider ?? "unknown") };
      }).filter((target) => target.connectionId);
      const runtime = await executeEdgeRuntimeCommand<{ statusByTarget: Record<string, Record<string, unknown>>; overview: unknown; lockouts: unknown; cacheStats: unknown }>({ command: "rate-limits.snapshot", targets });
      const connections = rawConnections.map((raw) => {
        const conn = this.asRecord(raw);
        const connectionId = typeof conn.id === "string" ? conn.id : "";
        const provider = typeof conn.provider === "string" ? conn.provider : "unknown";
        const name =
          (typeof conn.name === "string" && conn.name.trim()) ||
          (typeof conn.email === "string" && conn.email.trim()) ||
          getAccountDisplayName({ id: connectionId });
        return {
          connectionId,
          provider,
          name,
          rateLimitProtection: conn.rateLimitProtection === true,
          ...(runtime.statusByTarget[`${provider}:${connectionId}`] ?? {}),
        };
      });
      return reply.send({
        connections,
        overview: runtime.overview,
        lockouts: runtime.lockouts,
        cacheStats: runtime.cacheStats,
      });
    } catch (error) {
      console.error("[API ERROR] /api/rate-limits GET:", error);
      return reply.status(500).send({ error: "Failed to get rate limit status" });
    }
  }

  async toggle(request: FastifyRequest, reply: FastifyReply): Promise<unknown> {
    let rawBody: unknown;
    try {
      rawBody = request.body;
    } catch {
      return reply.status(400).send({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } });
    }
    try {
      const validation = validateBody(toggleRateLimitSchema, rawBody);
      if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
      const { connectionId, enabled } = validation.data as { connectionId: string; enabled: boolean };
      await updateProviderConnection(connectionId, { rateLimitProtection: !!enabled });
      await executeEdgeRuntimeCommand({ command: "rate-limits.toggle", connectionId, enabled });
      return reply.send({ success: true, connectionId, enabled: !!enabled });
    } catch (error) {
      console.error("[API ERROR] /api/rate-limits POST:", error);
      return reply.status(500).send({ error: "Failed to toggle rate limit" });
    }
  }

  private asRecord(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
  }
}
