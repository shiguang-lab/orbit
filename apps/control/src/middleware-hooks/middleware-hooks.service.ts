import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import {
  MiddlewareHooksRepository,
  type MiddlewareHookConfig,
} from "./middleware-hooks.repository.js";

const scopeSchema = z.union([
  z.object({ type: z.literal("global") }),
  z.object({ type: z.literal("combo"), comboId: z.string().trim().min(1) }),
]);
const createSchema = z.object({
  name: z.string().trim().min(1).regex(/^[a-zA-Z0-9_-]+$/),
  description: z.string().optional().default(""),
  priority: z.number().int().optional().default(200),
  scope: scopeSchema.optional().default({ type: "global" }),
  code: z.string().trim().min(1),
});
const updateSchema = z.object({
  description: z.string().optional(), priority: z.number().int().optional(),
  scope: scopeSchema.optional(), enabled: z.boolean().optional(), code: z.string().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one update field is required");

function toResponse(value: unknown, status?: number) {
  return Response.json(value, status === undefined ? undefined : { status });
}

@Injectable()
export class MiddlewareHooksService {
  constructor(private readonly repository: MiddlewareHooksRepository) {}

  private async auth(request: Request) {
    return requireManagementAuth(request);
  }

  async list(request: Request): Promise<Response> {
    const authError = await this.auth(request); if (authError) return authError;
    const params = new URL(request.url).searchParams;
    const name = params.get("name");
    const includeLogs = params.get("logs") === "true";
    const limit = Number.parseInt(params.get("logLimit") || "10", 10);
    if (name) {
      const hook = this.repository.find(name);
      if (!hook) return toResponse({ error: "Hook not found" }, 404);
      return toResponse({ hook, ...(includeLogs ? { logs: this.repository.logs(name, limit) } : {}) });
    }
    const hooks = this.repository.list();
    return toResponse({ hooks, registryStats: { dbCount: hooks.length } });
  }

  async create(request: Request): Promise<Response> {
    const authError = await this.auth(request); if (authError) return authError;
    let raw: unknown; try { raw = await request.json(); } catch { return toResponse({ error: "Invalid JSON body" }, 400); }
    const validation = validateBody(createSchema, raw);
    if (isValidationFailure(validation)) return toResponse({ error: validation.error }, 400);
    if (this.repository.find(validation.data.name)) return toResponse({ error: `Hook "${validation.data.name}" already exists` }, 409);
    const now = new Date().toISOString();
    const config: MiddlewareHookConfig = { ...validation.data, enabled: true, createdAt: now, updatedAt: now, runCount: 0 };
    try {
      return toResponse({ hook: this.repository.create(config) }, 201);
    } catch (error) {
      return toResponse({ error: sanitizeErrorMessage(error) || "Failed to create hook" }, 500);
    }
  }

  async get(request: Request, name: string): Promise<Response> {
    const authError = await this.auth(request); if (authError) return authError;
    const hook = this.repository.find(name);
    if (!hook) return toResponse({ error: "Hook not found" }, 404);
    const params = new URL(request.url).searchParams;
    return toResponse({ hook, ...(params.get("logs") === "true" ? { logs: this.repository.logs(name, Number.parseInt(params.get("logLimit") || "20", 10)) } : {}) });
  }

  async update(request: Request, name: string): Promise<Response> {
    const authError = await this.auth(request); if (authError) return authError;
    let raw: unknown; try { raw = await request.json(); } catch { return toResponse({ error: "Invalid JSON body" }, 400); }
    const validation = validateBody(updateSchema, raw);
    if (isValidationFailure(validation)) return toResponse({ error: validation.error }, 400);
    if (!this.repository.find(name)) return toResponse({ error: "Hook not found" }, 404);
    try {
      const saved = this.repository.update(name, validation.data);
      if (!saved) return toResponse({ error: "Failed to update hook" }, 500);
      return toResponse({ hook: saved });
    } catch (error) {
      return toResponse({ error: sanitizeErrorMessage(error) || "Failed to update hook" }, 500);
    }
  }

  async remove(request: Request, name: string): Promise<Response> {
    const authError = await this.auth(request); if (authError) return authError;
    if (!this.repository.find(name)) return toResponse({ error: "Hook not found" }, 404);
    if (!this.repository.remove(name)) return toResponse({ error: "Failed to delete hook" }, 500);
    return toResponse({ success: true, message: `Hook "${name}" deleted` });
  }
}
