import { Injectable } from "@nestjs/common";
import {
  getAutoRoutingTotalCount,
  getAutoRoutingVariantBreakdown,
  getAutoRoutingTopProviders,
} from "@shiguang-gateway/core-domain/analytics/auto-routing-db";
import { getCompressionAnalyticsSummary } from "@shiguang-gateway/core-domain/db/compression-analytics";
import { getDiversityReport } from "@shiguang-gateway/core-domain/analytics/diversity";

@Injectable()
export class AnalyticsService {
  getAutoRoutingAnalytics() {
    try {
      const totalRequests = getAutoRoutingTotalCount();
      const variantRows = getAutoRoutingVariantBreakdown();
      const variantBreakdown: Record<string, number> = {};
      variantRows.forEach((row) => {
        variantBreakdown[row.variant] = row.count;
      });
      const topProviders = getAutoRoutingTopProviders();

      return {
        totalRequests: totalRequests.count,
        variantBreakdown,
        topProviders,
      };
    } catch (error) {
      console.error("Auto-routing analytics error:", error);
      return {
        totalRequests: 0,
        variantBreakdown: {},
        topProviders: [],
      };
    }
  }

  getCompressionAnalytics(sinceParam?: string) {
    const validSince = ["24h", "7d", "30d", "all"].includes(sinceParam ?? "")
      ? sinceParam
      : "24h";
    return getCompressionAnalyticsSummary(validSince === "all" ? undefined : validSince);
  }

  getDiversityAnalytics() {
    return getDiversityReport();
  }
}
