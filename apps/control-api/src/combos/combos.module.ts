import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ModelComboMappingsController } from "./model-combo-mappings.controller.js";
import { ModelComboMappingsService } from "./model-combo-mappings.service.js";
import { CombosManagementController } from "./combos-management.controller.js";
import { CombosManagementService } from "./combos-management.service.js";
import { CompressionCombosController } from "./compression-combos.controller.js";
import { CompressionCombosService } from "./compression-combos.service.js";

@Module({
  imports: [CommonModule],
  controllers: [ModelComboMappingsController, CombosManagementController, CompressionCombosController],
  providers: [ModelComboMappingsService, CombosManagementService, CompressionCombosService],
})
export class CombosModule {}
