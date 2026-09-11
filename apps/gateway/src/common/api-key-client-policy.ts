import type { FastifyInstance } from "fastify";
import { extractApiKey } from "@orbit/auth";
import { getApiKeyMetadata, getApiKeyById, validateApiKey, recordApiKeyClient } from "@orbit/core/db/api-keys";
import { isIpAllowed } from "@orbit/utils/network/ip-allowlist";

/** All gateway protocols pass this hook before route dispatch, including URL-scoped keys. */
export function installApiKeyClientPolicy(app: FastifyInstance): void {
  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") return;
    const key = extractApiKey(request)
      || (typeof request.headers["x-api-key"] === "string" ? request.headers["x-api-key"] : null);
    if (!key) return;
    const metadata = await getApiKeyMetadata(key);
    if (!metadata || !(await validateApiKey(key))) return;
    // Read the current row so control-process edits take effect without waiting for a cache TTL.
    const policy = await getApiKeyById(metadata.id);
    if (!policy) return;
    if (!isIpAllowed(request.ip, policy.ipAllowlist ?? [])) {
      return reply.code(403).send({ error: { type: "permission_error", code: "ip_not_allowed", message: "Client IP is not allowed for this API key" } });
    }
    if (!policy.noLog) recordApiKeyClient(metadata.id, request.ip, request.headers["user-agent"] ?? "");
  });
}
