import type { OperatorProviderErrorRule } from "@shiguang-gateway/contracts/runtime-settings";

export interface ProviderRuntimeSettingsPort {
  applyPayloadRules(value: unknown): Promise<void> | void;
  applyModelAliases(value: Record<string, string>): Promise<void> | void;
  applyBackgroundDegradation(value: Record<string, unknown> | null): Promise<void> | void;
  applyCliCompatProviders(value: string[]): Promise<void> | void;
  applyUsageTokenBuffer(value: number | null): Promise<void> | void;
  applyThoughtSignatureMode(value: string): Promise<void> | void;
  applySystemTransforms(value: unknown): Promise<void> | void;
  setCustomBannedSignals(value: string[]): Promise<void> | void;
  setOperatorProviderErrorRules(
    value: Record<string, OperatorProviderErrorRule[]> | null,
  ): Promise<void> | void;
}

const missing = (name: keyof ProviderRuntimeSettingsPort): never => {
  throw new Error(`Provider runtime settings port '${name}' was used before registration`);
};
let port: ProviderRuntimeSettingsPort = {
  applyPayloadRules: () => missing("applyPayloadRules"),
  applyModelAliases: () => missing("applyModelAliases"),
  applyBackgroundDegradation: () => missing("applyBackgroundDegradation"),
  applyCliCompatProviders: () => missing("applyCliCompatProviders"),
  applyUsageTokenBuffer: () => missing("applyUsageTokenBuffer"),
  applyThoughtSignatureMode: () => missing("applyThoughtSignatureMode"),
  applySystemTransforms: () => missing("applySystemTransforms"),
  setCustomBannedSignals: () => missing("setCustomBannedSignals"),
  setOperatorProviderErrorRules: () => missing("setOperatorProviderErrorRules"),
};

export function registerProviderRuntimeSettingsPort(next: ProviderRuntimeSettingsPort): void {
  port = next;
}

export const applyProviderPayloadRules = (value: unknown): Promise<void> =>
  Promise.resolve(port.applyPayloadRules(value));
export const applyProviderModelAliases = (value: Record<string, string>): Promise<void> =>
  Promise.resolve(port.applyModelAliases(value));
export const applyProviderBackgroundDegradation = (
  value: Record<string, unknown> | null,
): Promise<void> => Promise.resolve(port.applyBackgroundDegradation(value));
export const applyProviderCliCompatProviders = (value: string[]): Promise<void> =>
  Promise.resolve(port.applyCliCompatProviders(value));
export const applyProviderUsageTokenBuffer = (value: number | null): Promise<void> =>
  Promise.resolve(port.applyUsageTokenBuffer(value));
export const applyProviderThoughtSignatureMode = (value: string): Promise<void> =>
  Promise.resolve(port.applyThoughtSignatureMode(value));
export const applyProviderSystemTransforms = (value: unknown): Promise<void> =>
  Promise.resolve(port.applySystemTransforms(value));
export const applyProviderBannedSignals = (value: string[]): Promise<void> =>
  Promise.resolve(port.setCustomBannedSignals(value));
export const applyProviderErrorRules = (
  value: Record<string, OperatorProviderErrorRule[]> | null,
): Promise<void> => Promise.resolve(port.setOperatorProviderErrorRules(value));
