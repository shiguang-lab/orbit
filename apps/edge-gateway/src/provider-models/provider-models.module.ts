import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ProviderModelsController } from "./provider-models.controller.js";
import { ProviderModelsService } from "./provider-models.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ProviderModelsController],
  providers: [ProviderModelsService],
})
export class ProviderModelsModule {}
