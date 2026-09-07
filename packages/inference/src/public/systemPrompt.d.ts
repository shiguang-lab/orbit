export interface SystemPromptConfig {
  enabled: boolean;
  prefixPrompt: string;
  suffixPrompt: string;
}
export function setSystemPromptConfig(config: Partial<SystemPromptConfig> & { prompt?: string }): void;
export function getSystemPromptConfig(): SystemPromptConfig;
