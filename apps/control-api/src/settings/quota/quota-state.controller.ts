import { Body, Controller, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { CORS_HEADERS } from "@orbit/core/shared/cors";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { z } from "zod";
import { QuotaStateService } from "./quota.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
  }
  const host = String(request.headers.host ?? "control-api");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

async function authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const authError = await requireManagementAuth(toWebRequest(request));
  if (!authError) return true;
  reply.status(authError.status).send(await authError.json());
  return false;
}

const QuotaStateActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset_expired") }),
  z.object({ action: z.literal("clear_connection"), connectionId: z.string().min(1), model: z.string().min(1) }),
]);

@Controller("api/settings/quota/state")
export class QuotaStateController {
  constructor(private readonly quota: QuotaStateService) {}

  @Options()
  options(@Res() reply: FastifyReply) { return reply.status(204).headers(CORS_HEADERS).send(); }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await authorize(request, reply))) return;
    try { return reply.headers(CORS_HEADERS).send(this.quota.get()); }
    catch (error) { return reply.status(500).headers(CORS_HEADERS).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Post()
  async post(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await authorize(request, reply))) return;
    const parsed = QuotaStateActionSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, parsed.error.message));
    try {
      const result = parsed.data.action === "reset_expired"
        ? this.quota.resetExpired()
        : this.quota.clearConnection(parsed.data.connectionId, parsed.data.model);
      return reply.headers(CORS_HEADERS).send(result);
    } catch (error) { return reply.status(500).headers(CORS_HEADERS).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }
}
