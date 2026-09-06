import { Module } from "@nestjs/common";
import { CompressionRulesController, SettingsCompressionController } from "./compression.controller.js";
import { CompressionRulesAliasController } from "./compression-rules-alias.controller.js";
import { CompressionSettingsService } from "./compression.service.js";

/** Control-plane module for operator-managed compression configuration and diagnostics. */
@Module({
  controllers: [SettingsCompressionController, CompressionRulesController, CompressionRulesAliasController],
  providers: [CompressionSettingsService],
})
export class CompressionModule {}
