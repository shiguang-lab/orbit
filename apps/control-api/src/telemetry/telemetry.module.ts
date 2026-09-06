import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [CommonModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
})
export class TelemetryModule {}
