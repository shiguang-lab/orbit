export function setCustomAliases(aliases: Record<string, string>): void;
export function getCustomAliases(): Record<string, string>;
export function getAllAliases(): Record<string, string>;
export function resolveModelAlias(modelId: string, provider?: string | null): string;
export function getDeprecationNotice(modelId: string): string | null;
export function isDeprecated(modelId: string): boolean;
export function addCustomAlias(from: string, to: string): void;
export function removeCustomAlias(from: string): boolean;
export function getBuiltInAliases(): Record<string, string>;
