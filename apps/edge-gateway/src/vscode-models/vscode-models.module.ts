import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeModelsController, VscodeRawModelsController } from "./vscode-models.controller.js";
import { VscodeModelsService } from "./vscode-models.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VscodeModelsController, VscodeRawModelsController],
  providers: [VscodeModelsService],
})
export class VscodeModelsModule {}
