import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VideoBridgeBrokerController } from "./video-bridge-broker.controller.js";
import { VideoBridgeBrokerService } from "./video-bridge-broker.service.js";

@Module({ imports: [CommonModule], controllers: [VideoBridgeBrokerController], providers: [VideoBridgeBrokerService] })
export class VideoBridgeBrokerModule {}
