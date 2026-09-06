export const ThinkingMode: {
  readonly AUTO: "auto";
  readonly PASSTHROUGH: "passthrough";
  readonly CUSTOM: "custom";
  readonly ADAPTIVE: "adaptive";
};
export type ThinkingModeValue = (typeof ThinkingMode)[keyof typeof ThinkingMode];
export interface ThinkingBudgetConfig {
  mode: ThinkingModeValue;
  customBudget: number;
  effortLevel: string;
  baseBudget?: number;
  complexityMultiplier?: number;
}
export function setThinkingBudgetConfig(config: Partial<ThinkingBudgetConfig>): void;
export function getThinkingBudgetConfig(): ThinkingBudgetConfig;
