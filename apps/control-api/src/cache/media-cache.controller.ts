import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { CacheService } from "./cache.service.js";

@Controller("api/media/cache")
export class MediaCacheController {
  constructor(@Inject(CacheService) private readonly cacheService: CacheService) {}

  @Get("stats")
  async getStats(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await isAuthenticated(toWebRequest(req)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      return reply.send(await this.cacheService.getMediaStats());
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }

  @Post("purge")
  async purge(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await isAuthenticated(toWebRequest(req)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const modality = typeof body.modality === "string" ? body.modality : "all";
      return reply.send(await this.cacheService.purgeMedia(modality));
    } catch (error) {
      return reply.status(500).send({ error: sanitizeErrorMessage(error) });
    }
  }
}
