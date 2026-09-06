import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller.js";
import { ContextAnalyticsController } from "./context-analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";

@Module({
  controllers: [AnalyticsController, ContextAnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
