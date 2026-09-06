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
  setOperatorProviderErrorRules(value: Record<string, OperatorProviderErrorRule[]> | null): Promise<void> | void;
}

export declare function registerProviderRuntimeSettingsPort(
  runtime: ProviderRuntimeSettingsPort,
): void;
