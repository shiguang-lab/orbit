export type TaskType =
  | "coding"
  | "creative"
  | "analysis"
  | "vision"
  | "summarization"
  | "background"
  | "chat";

export type TaskPatternOverrides = Partial<
  Record<TaskType, { patterns?: string[]; userPatterns?: string[] }>
>;

export interface TaskRoutingConfig {
  enabled: boolean;
  taskModelMap: Record<TaskType, string>;
  patternOverrides?: TaskPatternOverrides;
  detectionEnabled: boolean;
  stats: { detected: number; routed: number };
}

export function getTaskRoutingConfig(): TaskRoutingConfig;
export function setTaskRoutingConfig(config: Partial<TaskRoutingConfig>): void;
export function resetTaskRoutingStats(): void;
export function detectTaskType(body: unknown): TaskType;
export function getDefaultTaskModelMap(): Record<TaskType, string>;
export function getDefaultTaskPatterns(): Record<
  TaskType,
  { patterns: string[]; userPatterns?: string[] }
>;
export function hydrateTaskRoutingConfig(settings: unknown): boolean;
