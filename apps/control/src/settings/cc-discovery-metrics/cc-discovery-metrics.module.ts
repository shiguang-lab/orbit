import { Module } from "@nestjs/common";
import { CcDiscoveryMetricsController } from "./cc-discovery-metrics.controller.js";
import { CcDiscoveryMetricsService } from "./cc-discovery-metrics.service.js";

/** Control-plane module for Claude Code discovery-alias usage metrics. */
@Module({
  controllers: [CcDiscoveryMetricsController],
  providers: [CcDiscoveryMetricsService],
})
export class CcDiscoveryMetricsModule {}
