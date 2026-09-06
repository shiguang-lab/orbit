import { Module } from "@nestjs/common";
import { CompressionManagementController } from "./compression-management.controller.js";
import { CompressionManagementService } from "./compression-management.service.js";

@Module({
  controllers: [CompressionManagementController],
  providers: [CompressionManagementService],
})
export class CompressionManagementModule {}
