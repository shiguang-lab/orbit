export interface PublicComboStep {
  kind: "model" | "combo-ref";
  model?: string;
  comboName?: string;
  providerId?: string;
  accountPinned?: boolean;
}

export interface PublicComboCapabilities {
  multimodal: boolean;
  reasoning: boolean;
  caching: boolean;
}

export interface PublicCombo {
  name: string;
  strategy: string;
  description?: string;
  models: PublicComboStep[];
  capabilities?: PublicComboCapabilities;
}

export type ComboCapabilityResolver = (model: string) => {
  supportsVision: boolean | null;
  reasoning: boolean;
};

export interface ProjectComboOptions {
  includeCapabilities?: boolean;
  resolveCapabilities?: ComboCapabilityResolver;
}

export function projectComboStep(step: Record<string, unknown>): PublicComboStep | null;
export function computeComboCapabilities(
  combo: Record<string, unknown>,
  resolve?: ComboCapabilityResolver,
): PublicComboCapabilities;
export function projectCombo(
  combo: Record<string, unknown>,
  options?: ProjectComboOptions,
): PublicCombo | null;
