import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { TrafficInspectorController } from "./traffic-inspector.controller.js";

@Module({ imports: [CommonModule], controllers: [TrafficInspectorController] })
export class TrafficInspectorModule {}
