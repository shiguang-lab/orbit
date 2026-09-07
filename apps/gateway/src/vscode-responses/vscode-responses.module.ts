import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VscodeResponsesController } from "./vscode-responses.controller.js";
import { VscodeResponsesService } from "./vscode-responses.service.js";

@Module({ imports: [CommonModule], controllers: [VscodeResponsesController], providers: [VscodeResponsesService] })
export class VscodeResponsesModule {}
