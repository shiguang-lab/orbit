export interface ModelParamFilter {
  block?: string[];
  allow?: string[];
}

export interface ProviderParamFilter {
  block: string[];
  allow: string[];
  models?: Record<string, ModelParamFilter>;
  autoLearn?: boolean;
}

export function getParamFilterConfig(provider: string): ProviderParamFilter | null;
export function setParamFilterConfig(provider: string, config: ProviderParamFilter): void;
export function deleteParamFilterConfig(provider: string): void;
export { addParamToBlocklist, isAutoLearnGloballyEnabled } from "../lib/db/paramFilters.js";
