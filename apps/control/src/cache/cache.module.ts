import { Module } from "@nestjs/common";
import { CacheController } from "./cache.controller.js";
import { CacheService } from "./cache.service.js";
import { MediaCacheController } from "./media-cache.controller.js";

@Module({
  controllers: [CacheController, MediaCacheController],
  providers: [CacheService],
})
export class CacheModule {}
