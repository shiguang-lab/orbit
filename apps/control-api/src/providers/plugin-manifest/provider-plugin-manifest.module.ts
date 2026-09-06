import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { ProviderPluginManifestController } from "./provider-plugin-manifest.controller.js";
import { ProviderPluginManifestService } from "./provider-plugin-manifest.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderPluginManifestController],
  providers: [ProviderPluginManifestService],
})
export class ProviderPluginManifestModule {}
