export function checkToolConfigStatus(
  toolId: string,
  configPathOverride?: string,
): Promise<"configured" | "not_configured" | "not_installed" | "unknown" | "other">;
