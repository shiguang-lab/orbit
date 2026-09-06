export type TaskType = "code" | "math" | "reasoning" | "creative" | "medium" | "simple";
export type FitnessTier = "best-reasoning" | "cheapest" | "moderate";
export type PipelineStageName = "plan" | "execute" | "reflect" | "fix";

export interface PipelineStage {
  name: PipelineStageName;
  fitnessTier: FitnessTier;
  systemOverride?: string;
}

export interface PipelineConfig {
  stages: PipelineStage[];
  request: string;
  taskType?: TaskType;
}

export interface PipelineResult {
  text: string;
  stages: Array<{
    stage: PipelineStageName;
    text: string;
    provider?: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    skipped?: boolean;
    error?: string;
  }>;
  fallback: boolean;
  reflectVerdict: "pass" | "fail" | null;
}

export interface StageExecutorArgs {
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  fitnessTier?: FitnessTier;
}

export interface StageExecutorResult {
  text: string;
  response?: Response;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export type StageExecutor = (args: StageExecutorArgs) => Promise<StageExecutorResult>;

export function buildPipelineConfig(request: string, taskType: TaskType): PipelineConfig;
export function executePipeline(
  config: PipelineConfig,
  executor: StageExecutor,
): Promise<PipelineResult>;
