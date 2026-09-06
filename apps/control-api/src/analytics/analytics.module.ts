import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller.js";
import { ContextAnalyticsController } from "./context-analytics.controller.js";
import { AnalyticsService } from "./analytics.service.js";
import { SearchAnalyticsService } from "./search-analytics.service.js";
import { SearchAnalyticsController } from "./search-analytics.controller.js";

@Module({
  controllers: [AnalyticsController, SearchAnalyticsController, ContextAnalyticsController],
  providers: [AnalyticsService, SearchAnalyticsService],
})
export class AnalyticsModule {}
