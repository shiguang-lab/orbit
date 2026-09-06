import { Module } from "@nestjs/common";
import { MemoryController } from "./memory.controller.js";
import { MemorySettingsController } from "./memory-settings.controller.js";
import { MemoryService } from "./memory.service.js";

@Module({
  controllers: [MemoryController, MemorySettingsController],
  providers: [MemoryService],
})
export class MemoryModule {}
