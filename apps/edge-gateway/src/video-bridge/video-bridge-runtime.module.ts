import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { VideoBridgeRuntimeController } from "./video-bridge-runtime.controller.js";
import { VideoBridgeRuntimeService } from "./video-bridge-runtime.service.js";

@Module({
  imports: [CommonModule],
  controllers: [VideoBridgeRuntimeController],
  providers: [VideoBridgeRuntimeService],
})
export class VideoBridgeRuntimeModule {}
