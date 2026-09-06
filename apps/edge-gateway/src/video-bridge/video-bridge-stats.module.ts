import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VideoBridgeStatsController } from "./video-bridge-stats.controller.js";
import { VideoBridgeStatsService } from "./video-bridge-stats.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VideoBridgeStatsController],
  providers: [VideoBridgeStatsService],
})
export class VideoBridgeStatsModule {}
