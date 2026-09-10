import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { LogExportService } from "./log-export.service.js";
import { createLogExportDestinationSchema, updateLogExportDestinationSchema } from "./log-export.schemas.js";

@Controller("api/log-export")
export class LogExportController {
  constructor(private readonly service: LogExportService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply) {
    const error = await requireManagementAuth(toWebRequest(request));
    if (!error) return true;
    reply.status(error.status).send(await error.json());
    return false;
  }
  private failure(reply: FastifyReply, error: unknown, status = 400) {
    return reply.status(status).send({ error: sanitizeErrorMessage(error) });
  }

  @Get("types")
  async types(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(req, reply))) return;
    return reply.send({ types: this.service.types() });
  }
  @Get("destinations")
  async list(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(req, reply))) return;
    return reply.send({ destinations: this.service.list() });
  }
  @Get("status")
  async status(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(req, reply))) return;
    return reply.send(this.service.status());
  }
  @Post("destinations")
  async create(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(req, reply))) return;
    const parsed = createLogExportDestinationSchema.safeParse(body);
    if (!parsed.success) return this.failure(reply, parsed.error);
    try { return reply.status(201).send({ destination: this.service.create(parsed.data) }); }
    catch (error) { return this.failure(reply, error); }
  }
  @Patch("destinations/:id")
  async update(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string, @Body() body: unknown) {
    if (!(await this.authorize(req, reply))) return;
    const parsed = updateLogExportDestinationSchema.safeParse(body);
    if (!parsed.success) return this.failure(reply, parsed.error);
    try {
      const destination = this.service.update(id, parsed.data);
      return destination ? reply.send({ destination }) : reply.status(404).send({ error: "Destination not found" });
    } catch (error) { return this.failure(reply, error); }
  }
  @Delete("destinations/:id")
  async remove(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(req, reply))) return;
    return this.service.delete(id) ? reply.status(204).send() : reply.status(404).send({ error: "Destination not found" });
  }
  @Post("destinations/:id/test")
  async test(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(req, reply))) return;
    try { const result = await this.service.test(id); return result ? reply.send(result) : reply.status(404).send({ error: "Destination not found" }); }
    catch (error) { return this.failure(reply, error); }
  }
  @Post("destinations/:id/run")
  async run(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(req, reply))) return;
    const result = await this.service.run(id);
    return result ? reply.send(result) : reply.status(404).send({ error: "Destination not found" });
  }
  @Post("destinations/:id/reset")
  async reset(@Req() req: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    if (!(await this.authorize(req, reply))) return;
    return this.service.reset(id) ? reply.send({ reset: true }) : reply.status(404).send({ error: "Destination not found" });
  }
}
