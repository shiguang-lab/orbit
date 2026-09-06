import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeCombosController } from "./vscode-combos.controller.js";
import { VscodeTokenCombosController } from "./vscode-token-combos.controller.js";
import { VscodeCombosService } from "./vscode-combos.service.js";

@Module({ imports: [CommonModule], controllers: [VscodeCombosController, VscodeTokenCombosController], providers: [VscodeCombosService] })
export class VscodeCombosModule {}
