interface ComboModelStep {
  [key: string]: unknown;
  id: string;
  kind: "model";
  model: string;
  providerId?: string | null;
  connectionId?: string | null;
  allowedConnectionIds?: string[] | null;
  weight: number;
  label?: string;
  prompt?: string | null;
  tags?: string[];
  fallbackOnlyOnQuotaExhaustion?: boolean;
}

interface ComboRefStep {
  [key: string]: unknown;
  id: string;
  kind: "combo-ref";
  comboName: string;
  weight: number;
  label?: string;
  fallbackOnlyOnQuotaExhaustion?: boolean;
}

interface ComboProviderWildcardStep {
  [key: string]: unknown;
  id: string;
  kind: "provider-wildcard";
  providerId: string;
  modelPattern: string;
  connectionId?: string | null;
  allowedConnectionIds?: string[] | null;
  weight: number;
  label?: string;
}

type ComboStep = ComboModelStep | ComboRefStep | ComboProviderWildcardStep;
interface NormalizeComboStepOptions {
  comboName?: string | null;
  index?: number;
  allCombos?: unknown;
}

export function getComboStepWeight(value: unknown): number;
export function getComboModelString(value: unknown): string | null;
export function getComboModelProvider(value: unknown): string | null;
export function getComboStepTarget(
  value: unknown,
  options?: NormalizeComboStepOptions,
): string | null;
export function normalizeComboStep(
  value: unknown,
  options?: NormalizeComboStepOptions,
): ComboStep | null;
export function normalizeComboModels(
  models: unknown,
  options?: Omit<NormalizeComboStepOptions, "index">,
): ComboStep[];
