import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getProviderConnections, updateProviderConnection } from "@shiguang-gateway/core-domain/db/provider-connections";
import { getAccountDisplayName } from "@shiguang-gateway/core-domain/catalog/display-names";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { toggleRateLimitSchema } from "@shiguang-gateway/core-domain/shared/validation/schemas";

type RateLimitApi = {
  getAllModelLockouts(): unknown;
  getCacheStats(): unknown;
  enableRateLimitProtection(connectionId: string): void;
  disableRateLimitProtection(connectionId: string): void;
  getRateLimitStatus(provider: string, connectionId: string): Record<string, unknown>;
  getAllRateLimitStatus(): unknown;
};

type JsonRecord = Record<string, unknown>;
const load = <T>(specifier: string): Promise<T> => import(specifier) as Promise<T>;

@Injectable()
export class RateLimitsService {
  async getStatus(reply: FastifyReply): Promise<unknown> {
    try {
      const [{ getAllModelLockouts }, { getCacheStats }, rateLimits] = await Promise.all([
        load<Pick<RateLimitApi, "getAllModelLockouts">>("@shiguang-gateway/open-sse/services/accountFallback"),
        load<Pick<RateLimitApi, "getCacheStats">>("@shiguang-gateway/open-sse/services/signatureCache"),
        load<RateLimitApi>("@shiguang-gateway/open-sse/services/rateLimitManager"),
      ]);
      const connections = getProviderConnections().map((raw) => {
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
          ...rateLimits.getRateLimitStatus(provider, connectionId),
        };
      });
      return reply.send({
        connections,
        overview: rateLimits.getAllRateLimitStatus(),
        lockouts: getAllModelLockouts(),
        cacheStats: getCacheStats(),
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
      const rateLimits = await load<RateLimitApi>("@shiguang-gateway/open-sse/services/rateLimitManager");
      if (enabled) rateLimits.enableRateLimitProtection(connectionId);
      else rateLimits.disableRateLimitProtection(connectionId);
      await updateProviderConnection(connectionId, { rateLimitProtection: !!enabled });
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
