import { Module } from "@nestjs/common";
import { CompressionRulesController, SettingsCompressionController } from "./compression.controller.js";
import { CompressionRulesAliasController } from "./compression-rules-alias.controller.js";
import { CavemanConfigController } from "./caveman-config.controller.js";
import { CompressionSettingsService } from "./compression.service.js";
import { RtkController } from "./rtk.controller.js";

/** Control-plane module for operator-managed compression configuration and diagnostics. */
@Module({
  controllers: [
    SettingsCompressionController,
    CompressionRulesController,
    CompressionRulesAliasController,
    CavemanConfigController,
    RtkController,
  ],
  providers: [CompressionSettingsService],
})
export class CompressionModule {}
