import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MonitoringHealthController } from "./monitoring-health.controller.js";
import { MonitoringHealthService } from "./monitoring-health.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MonitoringHealthController],
  providers: [MonitoringHealthService],
})
export class MonitoringModule {}
