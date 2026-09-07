import { Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";
import { SettingsCleanupModule } from "./cleanup/settings-cleanup.module.js";
import { CommonModule } from "../common/common.module.js";

/** Control-plane module for operator-managed model runtime settings. */
@Module({
  imports: [CommonModule, SettingsCleanupModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
