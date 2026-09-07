import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { AcpService } from "./acp.service.js";

const customAgentBodySchema = z.object({
  action: z.string().optional(),
  id: z.string().optional(),
  name: z.string().optional(),
  binary: z.string().optional(),
  versionCommand: z.string().optional(),
  providerAlias: z.string().optional(),
  spawnArgs: z.array(z.string()).optional(),
  protocol: z.enum(["stdio", "http"]).optional(),
});

@Controller("api/acp/agents")
export class AcpController {
  constructor(private readonly acp: AcpService) {}

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) return reply.status(401).send({ error: "Unauthorized" });
    try {
      return reply.send(await this.acp.list());
    } catch (error) {
      console.error("Error detecting agents:", error);
      return reply.status(500).send({ error: "Failed to detect agents" });
    }
  }

  @Post()
  async post(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await isAuthenticated(toWebRequest(request)))) return reply.status(401).send({ error: "Unauthorized" });
    const validation = validateBody(customAgentBodySchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      if (validation.data.action === "refresh") return reply.send(this.acp.refresh());
      const result = await this.acp.add(validation.data);
      return reply.status(result.status).send(result.body);
    } catch (error) {
      console.error("Error adding custom agent:", error);
      return reply.status(500).send({ error: "Failed to add agent" });
    }
  }

  @Delete()
  async delete(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(toWebRequest(request)))) return reply.status(401).send({ error: "Unauthorized" });
    try {
      const agentId = typeof request.query === "object" && request.query !== null && "id" in request.query
        ? String((request.query as { id?: unknown }).id ?? "") || null
        : null;
      const result = await this.acp.remove(agentId);
      return reply.status(result.status).send(result.body);
    } catch (error) {
      console.error("Error removing custom agent:", error);
      return reply.status(500).send({ error: "Failed to remove agent" });
    }
  }
}
