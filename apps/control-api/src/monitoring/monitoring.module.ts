import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { MonitoringHealthController } from "./monitoring-health.controller.js";
import { MonitoringHealthService } from "./monitoring-health.service.js";
import { LocalProviderHealthService } from "./local-provider-health.service.js";

@Module({
  imports: [CommonModule],
  controllers: [MonitoringHealthController],
  providers: [MonitoringHealthService, LocalProviderHealthService],
})
export class MonitoringModule {}
