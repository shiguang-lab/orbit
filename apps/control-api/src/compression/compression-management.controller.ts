import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { CompressionManagementService } from "./compression-management.service.js";

const compareSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.union([z.string(), z.array(z.unknown())]) })).min(1),
  engineIds: z.array(z.string()).min(1).optional(),
});
const retrieveSchema = z.object({
  hash: z.string().min(6).max(64),
  mode: z.enum(["full", "head", "tail", "lines", "grep", "stats"]).optional(),
  n: z.number().int().positive().max(10000).optional(),
  start: z.number().int().positive().optional(),
  end: z.number().int().positive().optional(),
  pattern: z.string().max(512).optional(),
  unique: z.boolean().optional(),
});

@Controller("api/compression")
export class CompressionManagementController {
  constructor(private readonly compression: CompressionManagementService) {}

  @Get("engines")
  async engines(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send({ engines: this.compression.listEngines() });
    } catch {
      return reply.status(500).send({ error: "Failed to list engines" });
    }
  }

  @Get("language-packs")
  async languagePacks(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    return reply.send(this.compression.listLanguagePacks());
  }

  @Post("compare")
  async compare(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = compareSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    try {
      return reply.send(await this.compression.compare(parsed.data.messages, parsed.data.engineIds));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[/api/compression/compare]", message);
      return reply.status(500).send({ error: "Compare failed", details: this.compression.errorMessage(message) });
    }
  }

  @Post("retrieve")
  async retrieve(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const parsed = retrieveSchema.safeParse(body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid request", details: parsed.error.issues });
    try {
      return reply.send(this.compression.retrieve(parsed.data));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[/api/compression/retrieve]", message);
      return reply.status(500).send({ error: "Retrieve failed", details: this.compression.errorMessage(message) });
    }
  }

  private async authorize(request: FastifyRequest, reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }
}
