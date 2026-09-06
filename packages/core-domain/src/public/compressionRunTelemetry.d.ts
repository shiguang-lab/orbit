/** Public read-only control-plane contract for compression run telemetry. */
export interface CompressionRunTelemetrySummary {
  totalRuns: number;
  totalTokensSaved: number;
  runsWithStyles: number;
  bypassCount: number;
  totalOutputTokens: number;
  appliedStyleCounts: Record<string, number>;
}

export function getCompressionRunTelemetrySummary(): CompressionRunTelemetrySummary;
export { insertCompressionRunTelemetryRow } from "../lib/db/compressionRunTelemetry.js";
