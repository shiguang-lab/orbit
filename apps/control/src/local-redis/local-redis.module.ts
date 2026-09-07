import { Module } from "@nestjs/common";
import { LocalRedisController } from "./local-redis.controller.js";
import { LocalRedisService } from "./local-redis.service.js";

@Module({ controllers: [LocalRedisController], providers: [LocalRedisService] })
export class LocalRedisModule {}
