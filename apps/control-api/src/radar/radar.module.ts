import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RadarController } from "./radar.controller.js";
import { RadarService } from "./radar.service.js";
@Module({ imports: [CommonModule], controllers: [RadarController], providers: [RadarService] })
export class RadarModule {}
