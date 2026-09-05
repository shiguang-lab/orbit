import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";

export const batchRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // Tasks list
  app.get("/batch/tasks", async (request, reply) => {
    try {
      const { getAllBatches } = await import("@/lib/db/batches");
      const batches = getAllBatches();
      const tasks = (batches || []).map((b: any) => ({
        id: b.id,
        name: b.metadata?.name || `批量推理作业 (${b.model || b.endpoint})`,
        targetModel: b.model || "openai/text-embedding-3-small",
        status: b.status,
        inputFileId: b.inputFileId,
        outputFileId: b.outputFileId,
        errorFileId: b.errorFileId,
        totalRequests: b.requestCountsTotal || 0,
        completedRequests: b.requestCountsCompleted || 0,
        failedRequests: b.requestCountsFailed || 0,
        discountPct: 50,
        createdAt: new Date(b.createdAt * 1000).toISOString(),
        completedAt: b.completedAt ? new Date(b.completedAt * 1000).toISOString() : null,
      }));
      return reply.send({ tasks });
    } catch {
      return reply.send({ tasks: [] });
    }
  });

  // Create task
  app.post("/batch/tasks", async (request, reply) => {
    const { name, targetModel, inputFileId } = (request.body as any) || {};
    if (!targetModel || !inputFileId) {
      return reply.status(400).send({ error: "Missing targetModel or inputFileId" });
    }

    try {
      const { insertBatch } = await import("@/lib/db/batches");
      const now = Math.floor(Date.now() / 1000);
      const batchId = `batch_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

      const newBatch: any = {
        id: batchId,
        endpoint: "/v1/chat/completions",
        completionWindow: "24h",
        status: "in_progress",
        inputFileId,
        outputFileId: null,
        errorFileId: null,
        createdAt: now,
        expiresAt: now + 86400,
        requestCountsTotal: 100,
        requestCountsCompleted: 0,
        requestCountsFailed: 0,
        model: targetModel,
        metadata: { name },
      };

      insertBatch(newBatch);

      return reply.send({
        id: batchId,
        name: name || `批量推理作业 (${targetModel})`,
        targetModel,
        status: "in_progress",
        inputFileId,
        outputFileId: null,
        errorFileId: null,
        totalRequests: 100,
        completedRequests: 0,
        failedRequests: 0,
        discountPct: 50,
        createdAt: new Date(now * 1000).toISOString(),
        completedAt: null,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to create batch" });
    }
  });

  // Cancel task
  app.post("/batch/tasks/:id/cancel", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const { cancelBatch, getBatchById } = await import("@/lib/db/batches");
      cancelBatch(id);
      const updated = getBatchById(id);
      return reply.send(updated);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to cancel batch" });
    }
  });

  // Files list
  app.get("/batch/files", async (request, reply) => {
    try {
      const { getAllFiles } = await import("@/lib/db/files");
      const files = getAllFiles();
      const list = (files || []).map((f: any) => ({
        id: f.id,
        filename: f.filename,
        bytes: f.bytes || 0,
        lineCount: f.metadata?.lineCount || 100,
        purpose: f.purpose || "batch",
        status: f.status || "uploaded",
        createdAt: new Date(f.createdAt * 1000).toISOString(),
      }));
      return reply.send({ files: list });
    } catch {
      return reply.send({ files: [] });
    }
  });

  // Upload file
  app.post("/batch/files", async (request, reply) => {
    const { filename = "batch_input.jsonl", lineCount = 100, bytes = 102400 } = (request.body as any) || {};
    try {
      const { insertFile } = await import("@/lib/db/files");
      const now = Math.floor(Date.now() / 1000);
      const fileId = `file-${randomUUID().slice(0, 8)}`;

      const newFile: any = {
        id: fileId,
        filename,
        bytes: Number(bytes) || 102400,
        purpose: "batch",
        status: "uploaded",
        createdAt: now,
        metadata: { lineCount: Number(lineCount) || 100 },
      };

      insertFile(newFile);

      return reply.send({
        id: fileId,
        filename,
        bytes: newFile.bytes,
        lineCount: Number(lineCount) || 100,
        purpose: "batch",
        status: "uploaded",
        createdAt: new Date(now * 1000).toISOString(),
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to upload file" });
    }
  });

  // Delete file
  app.delete("/batch/files/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const { deleteFile } = await import("@/lib/db/files");
      deleteFile(id);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message || "Failed to delete file" });
    }
  });
};
