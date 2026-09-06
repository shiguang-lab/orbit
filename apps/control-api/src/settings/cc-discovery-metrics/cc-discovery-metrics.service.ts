import { Injectable } from "@nestjs/common";
import { getCcDiscoveryMetrics } from "@shiguang-gateway/core-domain/db/cc-discovery-metrics";

/** Read-only use case for Claude Code discovery-alias usage counters. */
@Injectable()
export class CcDiscoveryMetricsService {
  getMetrics() {
    return getCcDiscoveryMetrics();
  }
}
