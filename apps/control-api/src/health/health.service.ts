import { Injectable } from "@nestjs/common";
import { pingDb } from "@orbit/core/db/ping";
import {
  getDegradationReport,
  getDegradationSummary,
  hasAnyDegradation,
} from "./degradation.js";

@Injectable()
export class HealthService {
  getLiveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  ping() {
    const startedAt = Date.now();
    const alive = pingDb();
    if (!alive) {
      return { success: false, status: "error", error: "db_query_failed" };
    }
    return {
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    };
  }

  getDegradation(summaryOnly: boolean = false) {
    if (summaryOnly) {
      return {
        summary: getDegradationSummary(),
        isDegraded: hasAnyDegradation(),
      };
    }
    return {
      active: hasAnyDegradation(),
      summary: getDegradationSummary(),
      features: getDegradationReport(),
    };
  }
}
