import { Module } from "@nestjs/common";
import { CompressionManagementController } from "./compression-management.controller.js";
import { CompressionManagementService } from "./compression-management.service.js";
import { CompressionLegacyController } from "./compression-legacy.controller.js";

@Module({
  controllers: [CompressionManagementController, CompressionLegacyController],
  providers: [CompressionManagementService],
})
export class CompressionManagementModule {}
