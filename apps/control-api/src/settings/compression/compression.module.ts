import { Module } from "@nestjs/common";
import { CompressionRulesController, SettingsCompressionController } from "./compression.controller.js";
import { CompressionRulesAliasController } from "./compression-rules-alias.controller.js";
import { CavemanConfigController } from "./caveman-config.controller.js";
import { CompressionSettingsService } from "./compression.service.js";

/** Control-plane module for operator-managed compression configuration and diagnostics. */
@Module({
  controllers: [
    SettingsCompressionController,
    CompressionRulesController,
    CompressionRulesAliasController,
    CavemanConfigController,
  ],
  providers: [CompressionSettingsService],
})
export class CompressionModule {}
