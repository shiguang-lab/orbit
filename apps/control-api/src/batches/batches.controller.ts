import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Param, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { BatchesService } from "./batches.service.js";

@Controller("api/batches")
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Query("limit") limit?: string) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const parsedLimit = Number.parseInt(limit || "100", 10);
      return reply.send({ batches: this.batches.list(parsedLimit) });
    } catch (error) {
      console.log("Error fetching batches:", error);
      return reply.status(500).send({ error: "Failed to fetch batches" });
    }
  }

  @Get(":id")
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());

    try {
      const batch = this.batches.get(id);
      if (!batch) return reply.status(404).send({ error: "Batch not found" });
      return reply.send({ batch });
    } catch (error) {
      console.log("Error fetching batch:", error);
      return reply.status(500).send({ error: "Failed to fetch batch" });
    }
  }
}
