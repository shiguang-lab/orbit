import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import {
  createReasoningRoutingRuleSchema,
  simulateReasoningRoutingSchema,
  updateReasoningRoutingRuleSchema,
} from "@orbit/core/control/reasoning-routing";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { ReasoningRoutingService } from "./reasoning-routing.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) {
      headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
    }
  }
  const host = String(request.headers.host ?? "control");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

/** HTTP transport for the operator-managed reasoning routing policy surface. */
@Controller("api/settings/reasoning-routing-rules")
export class ReasoningRoutingController {
  constructor(private readonly reasoningRouting: ReasoningRoutingService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send({ rules: await this.reasoningRouting.list() });
    } catch (error) {
      return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error)));
    }
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = validateBody(createReasoningRoutingRuleSchema, body);
    if (isValidationFailure(parsed)) return reply.status(400).send({ error: parsed.error });
    try {
      const rule = await this.reasoningRouting.create(parsed.data);
      return reply.status(201).send({ rule });
    } catch (error) {
      return reply.status(400).send(buildErrorBody(400, sanitizeErrorMessage(error)));
    }
  }

  @Get(":id")
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(request, reply))) return;
    const rule = await this.reasoningRouting.get(id);
    return rule
      ? reply.send({ rule })
      : reply.status(404).send(buildErrorBody(404, "Rule not found"));
  }

  @Patch(":id")
  async update(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const existing = await this.reasoningRouting.get(id);
    if (!existing) return reply.status(404).send(buildErrorBody(404, "Rule not found"));
    const parsed = validateBody(updateReasoningRoutingRuleSchema, body);
    if (isValidationFailure(parsed)) return reply.status(400).send({ error: parsed.error });
    const validated = createReasoningRoutingRuleSchema.safeParse({ ...existing, ...parsed.data });
    if (!validated.success) {
      return reply.status(400).send(buildErrorBody(400, "Reasoning routing rule validation failed"));
    }
    try {
      const rule = await this.reasoningRouting.update(id, validated.data);
      return rule
        ? reply.send({ rule })
        : reply.status(404).send(buildErrorBody(404, "Rule not found"));
    } catch (error) {
      return reply.status(400).send(buildErrorBody(400, sanitizeErrorMessage(error)));
    }
  }

  @Delete(":id")
  async remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(request, reply))) return;
    return (await this.reasoningRouting.remove(id))
      ? reply.send({ success: true })
      : reply.status(404).send(buildErrorBody(404, "Rule not found"));
  }

  @Post("simulate")
  async simulate(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = validateBody(simulateReasoningRoutingSchema, body);
    if (isValidationFailure(parsed)) return reply.status(400).send({ error: parsed.error });
    const result = await this.reasoningRouting.simulate(toWebRequest(request), parsed.data);
    if ("notFound" in result && result.notFound) {
      return reply.status(404).send(buildErrorBody(404, "API key not found"));
    }
    return reply.send(result);
  }
}
