export interface DegradationSummary { [key: string]: unknown; }
export interface DegradationReport { [key: string]: unknown; }
export function getDegradationReport(): DegradationReport;
export function getDegradationSummary(): DegradationSummary;
export function hasAnyDegradation(): boolean;
