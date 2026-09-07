import { Module } from "@nestjs/common";
import { SettingsConfigController } from "./settings-config.controller.js";
import { SettingsConfigService } from "./settings-config.service.js";

/** Control-plane configuration import/export and catalog sync endpoints. */
@Module({
  controllers: [SettingsConfigController],
  providers: [SettingsConfigService],
})
export class SettingsConfigModule {}
