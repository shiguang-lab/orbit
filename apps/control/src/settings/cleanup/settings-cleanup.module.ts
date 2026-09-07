import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { SettingsCleanupController } from "./settings-cleanup.controller.js";
import { SettingsCleanupService } from "./settings-cleanup.service.js";

/** Control-plane module for operator-triggered settings cleanup. */
@Module({
  imports: [CommonModule],
  controllers: [SettingsCleanupController],
  providers: [SettingsCleanupService],
})
export class SettingsCleanupModule {}
