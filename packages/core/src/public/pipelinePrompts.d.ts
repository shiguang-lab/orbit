export type StageName = "plan" | "execute" | "reflect" | "fix";

export interface StagePrompt {
  system: string;
  user: string;
}

export function renderPrompt(stage: StageName, variables: Record<string, string>): StagePrompt;
