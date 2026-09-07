import { Module } from "@nestjs/common";
import { CacheSettingsController } from "./cache-settings.controller.js";
import { CacheSettingsService } from "./cache-settings.service.js";

@Module({
  controllers: [CacheSettingsController],
  providers: [CacheSettingsService],
})
export class CacheSettingsModule {}
