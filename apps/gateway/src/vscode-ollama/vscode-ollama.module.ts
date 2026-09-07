import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeOllamaController } from "./vscode-ollama.controller.js";
import { VscodeOllamaService } from "./vscode-ollama.service.js";
@Module({ imports: [CommonModule], controllers: [VscodeOllamaController], providers: [VscodeOllamaService] })
export class VscodeOllamaModule {}
