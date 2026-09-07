export interface SkillExecutionRecord {
  id: string;
  skillId: string;
  apiKeyId: string;
  sessionId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: string;
  errorMessage: string | null;
  durationMs: number;
  createdAt: Date;
}

export interface SkillExecutorContract {
  execute(
    skillName: string,
    input: Record<string, unknown>,
    context: { apiKeyId: string; sessionId?: string },
  ): Promise<SkillExecutionRecord>;
  listExecutions(apiKeyId?: string, limit?: number, offset?: number): SkillExecutionRecord[];
  countExecutions(apiKeyId?: string): number;
}

export const skillExecutor: SkillExecutorContract;
