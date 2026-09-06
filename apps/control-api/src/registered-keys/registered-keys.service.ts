import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import {
  checkQuota,
  getAccountKeyLimit,
  getRegisteredKey,
  issueRegisteredKey,
  listRegisteredKeys,
  revokeRegisteredKey,
  setAccountKeyLimit,
} from "@shiguang-gateway/core-domain/control/registered-keys";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";

const issueKeySchema = z.object({
  name: z.string().min(1).max(120),
  provider: z.string().max(80).optional().default(""),
  accountId: z.string().max(120).optional().default(""),
  idempotencyKey: z.string().max(256).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  dailyBudget: z.number().int().positive().optional(),
  hourlyBudget: z.number().int().positive().optional(),
});

const limitsSchema = z.object({
  maxActiveKeys: z.number().int().positive().nullable().optional(),
  dailyIssueLimit: z.number().int().positive().nullable().optional(),
  hourlyIssueLimit: z.number().int().positive().nullable().optional(),
});

function authRequired() { return Response.json({ error: { message: "Authentication required" } }, { status: 401 }); }
function invalidJson() { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }

@Injectable()
export class RegisteredKeysService {
  private async auth(request: Request) { return (await isAuthenticated(request)) ? null : authRequired(); }

  async list(request: Request): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    const params = new URL(request.url).searchParams;
    try {
      const keys = listRegisteredKeys({ provider: params.get("provider") ?? undefined, accountId: params.get("accountId") ?? undefined });
      return Response.json({ keys, total: keys.length });
    } catch { return Response.json({ error: "Failed to list registered keys" }, { status: 500 }); }
  }

  async issue(request: Request): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    let body: unknown; try { body = await request.json(); } catch { return invalidJson(); }
    const validation = validateBody(issueKeySchema, body);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    const { provider, accountId } = validation.data;
    try {
      const quota = checkQuota(provider, accountId);
      if (!quota.allowed) return Response.json({ error: quota.errorMessage, errorCode: quota.errorCode }, { status: 429 });
      const result = issueRegisteredKey(validation.data);
      if ("idempotencyConflict" in result) return Response.json({ error: "Idempotency key already used", errorCode: "IDEMPOTENCY_CONFLICT", existing: result.existing }, { status: 409 });
      const { rawKey, ...meta } = result;
      return Response.json({ key: rawKey, keyId: meta.id, keyPrefix: meta.keyPrefix, name: meta.name, provider: meta.provider, accountId: meta.accountId, expiresAt: meta.expiresAt, createdAt: meta.createdAt, warning: "Store this key securely — it will not be shown again." }, { status: 201 });
    } catch { return Response.json({ error: "Failed to issue key" }, { status: 500 }); }
  }

  async get(request: Request, id: string): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    const key = getRegisteredKey(id); return key ? Response.json({ key }) : Response.json({ error: "Key not found" }, { status: 404 });
  }

  async revoke(request: Request, id: string): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    if (!revokeRegisteredKey(id)) return Response.json({ error: "Key not found or already revoked" }, { status: 404 });
    return Response.json({ success: true, id, revokedAt: new Date().toISOString() });
  }

  async checkQuota(request: Request): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    const params = new URL(request.url).searchParams;
    const provider = params.get("provider") ?? ""; const accountId = params.get("accountId") ?? "";
    try {
      const result = checkQuota(provider, accountId);
      return Response.json({ allowed: result.allowed, ...(result.errorCode ? { errorCode: result.errorCode, reason: result.errorMessage } : {}), provider: provider || null, accountId: accountId || null, checkedAt: new Date().toISOString() });
    } catch { return Response.json({ error: "Quota check failed" }, { status: 500 }); }
  }

  async getLimits(request: Request, id: string): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    return Response.json({ accountId: id, limits: getAccountKeyLimit(id) ?? null });
  }

  async setLimits(request: Request, id: string): Promise<Response> {
    const error = await this.auth(request); if (error) return error;
    let body: unknown; try { body = await request.json(); } catch { return invalidJson(); }
    const validation = validateBody(limitsSchema, body);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    setAccountKeyLimit(id, validation.data);
    return Response.json({ accountId: id, limits: getAccountKeyLimit(id) });
  }
}
