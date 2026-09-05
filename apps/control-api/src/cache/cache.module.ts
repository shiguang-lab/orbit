import { Module } from "@nestjs/common";
import { CacheController } from "./cache.controller.js";
import { CacheService } from "./cache.service.js";

@Module({
  controllers: [CacheController],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
