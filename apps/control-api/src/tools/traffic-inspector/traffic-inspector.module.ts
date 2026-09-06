import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { TrafficInspectorController } from "./traffic-inspector.controller.js";
import { TrafficInspectorService } from "./traffic-inspector.service.js";

@Module({ imports: [CommonModule], controllers: [TrafficInspectorController], providers: [TrafficInspectorService] })
export class TrafficInspectorModule {}
