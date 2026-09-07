import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeModelsController } from "./vscode-models.controller.js";
import { VscodeCatalogController } from "./vscode-catalog.controller.js";
import { VscodeRawModelsController } from "./vscode-raw-models.controller.js";
import { VscodeModelsService } from "./vscode-models.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VscodeCatalogController, VscodeModelsController, VscodeRawModelsController],
  providers: [VscodeModelsService],
})
export class VscodeModelsModule {}
