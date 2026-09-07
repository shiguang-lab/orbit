import { Body, Controller, Get, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { QuotaSettingsService } from "./quota.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
  }
  const host = String(request.headers.host ?? "control");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

async function authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  const authError = await requireManagementAuth(toWebRequest(request));
  if (!authError) return true;
  reply.status(authError.status).send(await authError.json());
  return false;
}

@Controller("api/settings/quota-store")
export class QuotaSettingsController {
  constructor(private readonly quota: QuotaSettingsService) {}

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await authorize(request, reply))) return;
    try { return reply.send(await this.quota.get()); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Put()
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await authorize(request, reply))) return;
    try {
      const result = await this.quota.update(body, toWebRequest(request));
      if ("status" in result) return reply.status(result.status).send(buildErrorBody(result.status, result.error));
      return reply.send(result);
    } catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }
}
