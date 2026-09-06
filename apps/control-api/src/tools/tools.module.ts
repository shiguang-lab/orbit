import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ToolsController } from "./tools.controller.js";
import { ToolsService } from "./tools.service.js";
import { TrafficInspectorModule } from "./traffic-inspector/traffic-inspector.module.js";

@Module({ imports: [CommonModule, TrafficInspectorModule], controllers: [ToolsController], providers: [ToolsService] })
export class ToolsModule {}
