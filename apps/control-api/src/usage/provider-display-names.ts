import { getProviderById } from "@orbit/providers/catalog";
import { getProviderNodes } from "@orbit/core/db/provider-nodes";

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function getProviderDisplayName(
  provider: unknown,
  providerDisplayNames: Map<string, string>,
): string {
  const rawProvider = toStringValue(provider, "unknown");
  return (
    providerDisplayNames.get(rawProvider) ||
    toStringValue(getProviderById(rawProvider)?.name) ||
    rawProvider
  );
}

async function getProviderDisplayNames(): Promise<Map<string, string>> {
  const displayNames = new Map<string, string>();
  const providerNodes = (await getProviderNodes()) as Array<{
    id?: unknown;
    name?: unknown;
    prefix?: unknown;
  }>;

  for (const node of providerNodes) {
    const id = toStringValue(node.id);
    if (!id) continue;
    displayNames.set(id, toStringValue(node.name) || toStringValue(node.prefix) || id);
  }

  return displayNames;
}

export interface ByProviderRow {
  provider: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  successRatePct: number | string;
  cost: number;
}

/** Build the control API's provider analytics projection with operator-facing names. */
export async function buildByProviderRows(
  providerRows: Array<Record<string, unknown>>,
  providerCostByProvider: Map<string, number>,
): Promise<ByProviderRow[]> {
  const providerDisplayNames = await getProviderDisplayNames();
  return buildByProviderRowsFromDisplayNames(
    providerRows,
    providerCostByProvider,
    providerDisplayNames,
  );
}

export function buildByProviderRowsFromDisplayNames(
  providerRows: Array<Record<string, unknown>>,
  providerCostByProvider: Map<string, number>,
  providerDisplayNames: Map<string, string>,
): ByProviderRow[] {
  return providerRows.map((row) => ({
    provider: getProviderDisplayName(row.provider, providerDisplayNames),
    requests: Number(row.requests),
    promptTokens: Number(row.promptTokens),
    completionTokens: Number(row.completionTokens),
    totalTokens: Number(row.totalTokens),
    avgLatencyMs: Math.round(Number(row.avgLatencyMs)),
    successRatePct:
      Number(row.requests) > 0
        ? Number((Number(row.successfulRequests) / Number(row.requests)) * 100).toFixed(2)
        : 0,
    cost: roundCost(providerCostByProvider.get(toStringValue(row.provider)) || 0),
  }));
}
