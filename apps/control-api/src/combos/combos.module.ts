import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ModelComboMappingsController } from "./model-combo-mappings.controller.js";
import { ModelComboMappingsService } from "./model-combo-mappings.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ModelComboMappingsController],
  providers: [ModelComboMappingsService],
})
export class CombosModule {}
