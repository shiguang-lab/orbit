import { getAggregatedSnapshots } from "@shiguang-gateway/core-domain/usage/quota-snapshots";
import { getProviderConnectionById } from "@shiguang-gateway/core-domain/db/provider-connections";
import type {
  ConnectionMetaEntry,
  ProviderUtilizationResponse,
  UtilizationTimeRange,
} from "@shiguang-gateway/core-domain/usage/utilization";
import { BUCKET_SIZES } from "@shiguang-gateway/core-domain/usage/utilization";

const VALID_RANGES: UtilizationTimeRange[] = ["1h", "24h", "7d", "30d"];

function getRangeStartIso(range: UtilizationTimeRange): string {
  const start = new Date();
  if (range === "1h") start.setHours(start.getHours() - 1);
  if (range === "24h") start.setDate(start.getDate() - 1);
  if (range === "7d") start.setDate(start.getDate() - 7);
  if (range === "30d") start.setDate(start.getDate() - 30);
  return start.toISOString();
}

const asNullableString = (value: unknown): string | null => (typeof value === "string" ? value : null);

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const rangeParam = params.get("range");
    if (!rangeParam || !VALID_RANGES.includes(rangeParam as UtilizationTimeRange)) {
      return Response.json({ error: "Invalid range. Must be one of: 1h, 24h, 7d, 30d" }, { status: 400 });
    }
    const range = rangeParam as UtilizationTimeRange;
    const aggregateBy = params.get("aggregateBy") === "connection" ? "connection" : "provider";
    const data = getAggregatedSnapshots({
      provider: params.get("provider") || undefined,
      since: getRangeStartIso(range),
      bucketMinutes: BUCKET_SIZES[range],
      aggregateBy,
    });
    const providers = Array.from(new Set(data.map((point) => point.provider)));

    let connectionMeta: Record<string, ConnectionMetaEntry> | undefined;
    if (aggregateBy === "connection") {
      connectionMeta = {};
      const connectionIds = new Set(data.map((point) => point.provider.split(":").slice(1).join(":")).filter(Boolean));
      for (const id of connectionIds) {
        const connection = await getProviderConnectionById(id);
        connectionMeta[id] = {
          email: asNullableString(connection?.email),
          name: asNullableString(connection?.name),
          displayName: asNullableString(connection?.displayName),
        };
      }
    }
    const response: ProviderUtilizationResponse = {
      timeRange: range,
      bucketSizeMinutes: BUCKET_SIZES[range],
      providers,
      data,
      connectionMeta,
    };
    return Response.json(response);
  } catch (error) {
    console.error("Error fetching utilization data:", error);
    return Response.json({ error: "Failed to fetch utilization data" }, { status: 500 });
  }
}
