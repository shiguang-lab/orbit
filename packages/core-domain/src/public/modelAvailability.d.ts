export interface AvailabilityReportItem {
  provider: string; model: string; connectionId: string; reason: string;
  remainingMs: number; failureCount: number;
}
export function getAvailabilityReport(): AvailabilityReportItem[];
export function clearModelUnavailability(provider: string, model: string): boolean;
export function resetAllAvailability(): void;
