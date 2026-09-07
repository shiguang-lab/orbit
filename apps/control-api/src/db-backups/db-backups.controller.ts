import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Delete, Get, Inject, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import fs from "fs";
import { DbBackupsService } from "./db-backups.service.js";
import { isAuthenticated, isAuthRequired } from "@orbit/core/control/authenticated";
import {
  dbBackupCleanupSchema,
  dbBackupRestoreSchema,
  validateBody,
  isValidationFailure,
} from "@orbit/core/db-backups/validation";

@Controller("api/db-backups")
export class DbBackupsController {
  constructor(@Inject(DbBackupsService) private readonly dbBackupsService: DbBackupsService) {}

  @Get()
  async getBackups(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const backups = await this.dbBackupsService.listBackups();
      return reply.send({ backups });
    } catch (error) {
      console.error("[API] Error listing DB backups:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Put()
  async createBackup(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const result = this.dbBackupsService.createManualBackup();
      if (!result) {
        return reply.send({ message: "No changes since last backup (throttled)" });
      }
      return reply.send({ created: true, ...result });
    } catch (error) {
      console.error("[API] Error creating manual backup:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Post()
  async restoreBackup(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const validation = validateBody(dbBackupRestoreSchema, body);
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const result = await this.dbBackupsService.restoreBackup(validation.data.backupId);
      return reply.send(result);
    } catch (error) {
      console.error("[API] Error restoring DB backup:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Patch()
  async patchBackups(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const validation = validateBody(dbBackupCleanupSchema, body ?? {});
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const saved = this.dbBackupsService.persistRetentionSettings(validation.data);
      return reply.send({ saved: true, ...saved });
    } catch (error) {
      console.error("[API] Error saving DB backup retention settings:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Delete()
  async deleteBackup(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const validation = validateBody(dbBackupCleanupSchema, body ?? {});
    if (isValidationFailure(validation)) {
      return reply.status(400).send({ error: validation.error });
    }

    try {
      const result = this.dbBackupsService.cleanupBackups(validation.data);
      return reply.send(result);
    } catch (error) {
      console.error("[API] Error cleaning DB backups:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Get("export")
  async exportBackup(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    if (await isAuthRequired(rawReq)) {
      if (!(await isAuthenticated(rawReq))) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    try {
      const { tmpPath, exportFilename, fileSize } = await this.dbBackupsService.exportDbFile();
      const readStream = fs.createReadStream(tmpPath);
      readStream.on("close", () => {
        fs.unlink(tmpPath, () => {});
      });

      return reply
        .header("Content-Type", "application/octet-stream")
        .header("Content-Disposition", `attachment; filename="${exportFilename}"`)
        .header("Content-Length", String(fileSize))
        .header("Cache-Control", "no-cache, no-store")
        .send(readStream);
    } catch (error) {
      console.error("[API] Error exporting database:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({ error: message });
    }
  }

  @Get("exportAll")
  async exportAllBackups(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    if (!(await isAuthenticated(rawReq))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    try {
      const { archiveBuffer, filename } = await this.dbBackupsService.exportAllArchive();
      return reply
        .header("Content-Type", "application/gzip")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .header("Content-Length", String(archiveBuffer.length))
        .send(archiveBuffer);
    } catch (error: unknown) {
      console.error("[ExportAll] Error:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(500).send({
        error: "Failed to create full export",
        details: message,
      });
    }
  }

  @Post("import")
  async importBackup(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const rawReq = toWebRequest(req);
    if (await isAuthRequired(rawReq)) {
      if (!(await isAuthenticated(rawReq))) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }

    try {
      let fileBuffer: Buffer | null = null;
      let fileName = "import.sqlite";

      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("multipart/form-data")) {
        // Handle multipart if available via fastify/web request
        const formData = await rawReq.formData();
        if (formData) {
          const file = formData.get("file") as File | null;
          if (!file) {
            return reply.status(400).send({ error: "No file provided. Upload a .sqlite file." });
          }
          fileName = file.name;
          fileBuffer = Buffer.from(await file.arrayBuffer());
        }
      }

      if (!fileBuffer) {
        if (req.body && Buffer.isBuffer(req.body)) {
          fileBuffer = req.body;
        } else if (req.body && typeof req.body === "object") {
          fileBuffer = Buffer.from(JSON.stringify(req.body));
        } else {
          // fallback to raw body reading
          const chunks: Buffer[] = [];
          for await (const chunk of req.raw) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          fileBuffer = Buffer.concat(chunks);
        }
        const queryFilename = (req.query as Record<string, string>)?.filename;
        if (queryFilename) fileName = queryFilename;
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return reply.status(400).send({ error: "No file content provided." });
      }

      const result = await this.dbBackupsService.importDb(fileBuffer, fileName);
      return reply.send(result);
    } catch (error) {
      console.error("[API] Error importing database:", error);
      const message = error instanceof Error ? error.message : String(error);
      return reply.status(400).send({ error: message });
    }
  }
}
