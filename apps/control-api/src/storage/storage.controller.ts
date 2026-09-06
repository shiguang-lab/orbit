import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { StorageService } from "./storage.service.js";

@Controller("api/storage")
export class StorageController {
  constructor(@Inject(StorageService) private readonly service: StorageService) {}

  @Get("health")
  health(@Res() reply: FastifyReply) {
    const result = this.service.getHealth();
    return reply.status(result.status).send(result.body);
  }
}
