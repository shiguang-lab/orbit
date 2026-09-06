import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ModelsController } from "./models.controller.js";
import { ModelsService } from "./models.service.js";
import { ModelsAliasController } from "./alias/models-alias.controller.js";
import { ModelsCatalogController } from "./catalog/models-catalog.controller.js";
import { ModelsOpenRouterCatalogController } from "./openrouter-catalog/models-openrouter-catalog.controller.js";

@Module({
  imports: [CommonModule],
  controllers: [ModelsController, ModelsAliasController, ModelsCatalogController, ModelsOpenRouterCatalogController],
  providers: [ModelsService],
})
export class ModelsModule {}
