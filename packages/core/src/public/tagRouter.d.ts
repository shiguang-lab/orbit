export type RoutingTagMatchMode = "any" | "all";

export function getConnectionRoutingTags(providerSpecificData: unknown): string[];
export function matchesRoutingTags(
  connectionTags: string[],
  requestTags: string[],
  matchMode?: RoutingTagMatchMode,
): boolean;
export function resolveRequestRoutingTags(
  body: Record<string, unknown> | null | undefined,
): { tags: string[]; matchMode: RoutingTagMatchMode };
