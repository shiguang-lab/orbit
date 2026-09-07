import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { FilesService } from "./files.service.js";

@Controller("api/files")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    try {
      const rawLimit = new URL(request.raw.url ?? "", "http://localhost").searchParams.get("limit");
      const limit = Number.parseInt(rawLimit || "100", 10);
      return reply.send({ files: this.files.list(limit) });
    } catch (error) {
      console.log("Error fetching files:", error);
      return reply.status(500).send({ error: "Failed to fetch files" });
    }
  }

  @Get(":id/content")
  async content(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (authError) return reply.status(authError.status).send(await authError.json());
    const result = this.files.content(id);
    if (result.status !== 200) return reply.status(result.status).send(result.body);
    return reply
      .status(200)
      .header("Content-Type", result.file.mimeType || "application/octet-stream")
      .header("Content-Disposition", `attachment; filename="${result.file.filename || id}"`)
      .send(result.content);
  }
}
