import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VideoBridgeDrilldownController } from "./video-bridge-drilldown.controller.js";
import { VideoBridgeDrilldownService } from "./video-bridge-drilldown.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VideoBridgeDrilldownController],
  providers: [VideoBridgeDrilldownService],
})
export class VideoBridgeDrilldownModule {}
