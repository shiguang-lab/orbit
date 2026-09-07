import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody } from "@orbit/inference/utils/error";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import {
  assignmentsUpdateSchema,
  compressionComboCreateSchema,
  compressionComboUpdateSchema,
} from "./compression-combos.schemas.js";
import { CompressionCombosService } from "./compression-combos.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
  }
  const host = String(request.headers.host ?? "control-api");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

/** Control-plane HTTP surface for named compression pipelines. */
@Controller("api/context/combos")
export class CompressionCombosController {
  constructor(private readonly combos: CompressionCombosService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(this.combos.list()); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, error instanceof Error ? error.message : "Failed to list compression combos")); }
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(compressionComboCreateSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try { return reply.status(201).send(this.combos.create(validation.data)); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, error instanceof Error ? error.message : "Failed to create compression combo")); }
  }

  @Get("default")
  async default(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try { return reply.send(await this.combos.defaultPlan()); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, error instanceof Error ? error.message : "Failed to load default compression plan")); }
  }

  @Put("default")
  @Post("default")
  async deprecatedDefault(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.status(410).send(buildErrorBody(410, "The default compression pipeline is now derived from the engines map. Edit engines at /api/settings/compression."));
  }

  @Get(":id/assignments")
  async assignments(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    if (!this.combos.get(id)) return reply.status(404).send({ error: "Compression combo not found" });
    return reply.send({ assignments: this.combos.assignments(id) });
  }

  @Put(":id/assignments")
  async updateAssignments(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(assignmentsUpdateSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    if (!this.combos.updateAssignments(id, validation.data.routingComboIds)) return reply.status(404).send({ error: "Compression combo not found" });
    return reply.send({ assignments: this.combos.assignments(id) });
  }

  @Get(":id")
  async get(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    const combo = this.combos.get(id);
    return combo ? reply.send(combo) : reply.status(404).send({ error: "Compression combo not found" });
  }

  @Put(":id")
  async update(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(compressionComboUpdateSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const combo = this.combos.update(id, validation.data);
    return combo ? reply.send(combo) : reply.status(404).send({ error: "Compression combo not found" });
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return this.combos.remove(id)
      ? reply.send({ ok: true })
      : reply.status(404).send({ error: "Compression combo not found or cannot delete default combo" });
  }
}

