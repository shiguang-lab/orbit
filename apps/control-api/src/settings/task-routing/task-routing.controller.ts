import { Body, Controller, Get, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation/helpers";
import {
  taskRoutingActionSchema,
  updateTaskRoutingSchema,
} from "@shiguang-gateway/core-domain/shared/validation/schemas";
import { buildErrorBody, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { TaskRoutingService } from "./task-routing.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) {
      headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
    }
  }
  const host = String(request.headers.host ?? "control-api");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

/** HTTP transport for the operator-managed task-aware routing configuration. */
@Controller("api/settings/task-routing")
export class TaskRoutingController {
  constructor(private readonly taskRouting: TaskRoutingService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.taskRouting.getConfig());
    } catch (error) {
      return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error)));
    }
  }

  @Put()
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateTaskRoutingSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      return reply.send({ success: true, ...(await this.taskRouting.updateConfig(validation.data)) });
    } catch (error) {
      return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error)));
    }
  }

  @Post()
  async action(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(taskRoutingActionSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      if (validation.data.action === "reset-stats") {
        return reply.send({ success: true, stats: this.taskRouting.resetStats() });
      }
      return reply.send(this.taskRouting.detect(validation.data.body ?? {}));
    } catch (error) {
      return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error)));
    }
  }
}
