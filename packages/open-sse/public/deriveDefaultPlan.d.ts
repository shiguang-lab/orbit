export type CompressionSource =
  | "request-header"
  | "routing-override"
  | "active-profile"
  | "auto-trigger"
  | "default"
  | "off";

export interface DerivedPlan {
  mode: string;
  stackedPipeline: Array<{ engine: string; intensity?: string }>;
  source?: CompressionSource;
}

export function deriveDefaultPlan(
  engines: Record<string, { enabled?: boolean; level?: string }>,
  masterEnabled: boolean,
): DerivedPlan;

