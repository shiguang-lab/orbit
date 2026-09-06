export type CliToolConfigStatus =
  | "configured"
  | "not_configured"
  | "not_installed"
  | "unknown"
  | "other";

export function checkToolConfigStatus(
  toolId: string,
  configPathOverride?: string,
): Promise<CliToolConfigStatus>;
