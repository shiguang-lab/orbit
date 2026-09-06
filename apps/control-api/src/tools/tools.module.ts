import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ToolsController } from "./tools.controller.js";
import { ToolsService } from "./tools.service.js";

@Module({ imports: [CommonModule], controllers: [ToolsController], providers: [ToolsService] })
export class ToolsModule {}
