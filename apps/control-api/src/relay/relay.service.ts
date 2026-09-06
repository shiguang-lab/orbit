import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { createRelayToken, deleteRelayToken, getRelayLogs, getRelayToken, getRelayTokens, getRelayUsage, toggleRelayToken, updateRelayToken } from "@shiguang-gateway/core-domain/db/relayProxies";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";

const input = z.object({ name: z.string().trim().min(1, "name is required"), description: z.string().optional(), comboId: z.string().trim().min(1).optional(), allowedModels: z.array(z.string().trim().min(1)).optional(), maxTokensPerRequest: z.number().int().positive().optional(), maxRequestsPerMinute: z.number().int().positive().optional(), maxRequestsPerDay: z.number().int().positive().optional(), maxCostPerDay: z.number().nonnegative().optional(), expiresAt: z.number().int().positive().optional(), metadata: z.record(z.string(), z.unknown()).optional() });
const patch = input.partial().extend({ enabled: z.boolean().optional() }).refine((v) => Object.keys(v).length > 0, "At least one update field is required");
const safe = (t: any) => ({ id: t.id, name: t.name, tokenPrefix: t.tokenPrefix, description: t.description, comboId: t.comboId, allowedModels: t.allowedModels, maxTokensPerRequest: t.maxTokensPerRequest, maxRequestsPerMinute: t.maxRequestsPerMinute, maxRequestsPerDay: t.maxRequestsPerDay, maxCostPerDay: t.maxCostPerDay, enabled: t.enabled, createdAt: t.createdAt, updatedAt: t.updatedAt, expiresAt: t.expiresAt, lastUsedAt: t.lastUsedAt });

@Injectable()
export class RelayService {
  list() { return Response.json(getRelayTokens().map(safe)); }
  async create(request: Request) { try { const v = validateBody(input, await request.json()); if (isValidationFailure(v)) return Response.json({ error: v.error }, { status: 400 }); const t = createRelayToken(v.data); return Response.json({ id: t.id, name: t.name, rawToken: t.rawToken, tokenPrefix: t.tokenPrefix }); } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 400 }); } }
  async get(_request: Request, id: string) { const t = getRelayToken(id); if (!t) return Response.json({ error: "Token not found" }, { status: 404 }); const now = Math.floor(Date.now() / 1000); return Response.json({ ...t, usage: { lastHour: getRelayUsage(id, now - 3600), lastDay: getRelayUsage(id, now - 86400) }, logs: getRelayLogs(id, 20) }); }
  async update(request: Request, id: string) { try { const v = validateBody(patch, await request.json()); if (isValidationFailure(v)) return Response.json({ error: v.error }, { status: 400 }); const b = v.data; if (b.enabled !== undefined) { const t = toggleRelayToken(id, b.enabled); return t ? Response.json(t) : Response.json({ error: "Token not found" }, { status: 404 }); } const t = updateRelayToken(id, b); return t ? Response.json(t) : Response.json({ error: "Token not found" }, { status: 404 }); } catch (e) { return Response.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 }); } }
  remove(_request: Request, id: string) { deleteRelayToken(id); return Response.json({ success: true }); }
}
