import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fs from "node:fs";
import path from "node:path";

export const mediaRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  app.get("/media/cache/stats", async (request, reply) => {
    try {
      const { getCacheStats } = await import("@/lib/semanticCache");
      const semantic = getCacheStats();

      // Check media cache directory if exists
      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      const mediaCacheDir = path.join(homeDir, ".shiguangGateway", "media_cache");
      let totalBytes = 0;
      let totalFiles = 0;

      if (fs.existsSync(mediaCacheDir)) {
        const files = fs.readdirSync(mediaCacheDir);
        totalFiles = files.length;
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(mediaCacheDir, file));
            totalBytes += stat.size;
          } catch {}
        }
      }

      return reply.send({
        totalBytes,
        totalFiles,
        semanticEntries: semantic?.size || 0,
        byModality: {
          image: { files: totalFiles, bytes: totalBytes },
          video: { files: 0, bytes: 0 },
          music: { files: 0, bytes: 0 },
          speech: { files: 0, bytes: 0 },
          transcription: { files: 0, bytes: 0 },
        },
      });
    } catch {
      return reply.send({
        totalBytes: 0,
        totalFiles: 0,
        semanticEntries: 0,
        byModality: {
          image: { files: 0, bytes: 0 },
          video: { files: 0, bytes: 0 },
          music: { files: 0, bytes: 0 },
          speech: { files: 0, bytes: 0 },
          transcription: { files: 0, bytes: 0 },
        },
      });
    }
  });

  app.post("/media/cache/purge", async (request, reply) => {
    const { modality = "all" } = (request.body as any) || {};
    try {
      const { clearCache } = await import("@/lib/semanticCache");
      clearCache();

      const homeDir = process.env.HOME || process.env.USERPROFILE || "";
      const mediaCacheDir = path.join(homeDir, ".shiguangGateway", "media_cache");
      let freedBytes = 0;

      if (fs.existsSync(mediaCacheDir)) {
        const files = fs.readdirSync(mediaCacheDir);
        for (const file of files) {
          try {
            const filePath = path.join(mediaCacheDir, file);
            const stat = fs.statSync(filePath);
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
          } catch {}
        }
      }

      return reply.send({
        success: true,
        purgedModality: modality,
        freedBytes,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message || "Failed to purge cache" });
    }
  });
};
