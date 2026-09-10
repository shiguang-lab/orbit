type LeastUsedConnection = {
  backoffLevel?: number | null;
  lastUsedAt?: string | null;
  priority?: number | null;
};

export function compareLeastUsedConnections(
  a: LeastUsedConnection,
  b: LeastUsedConnection
): number {
  const backoffDifference = (a.backoffLevel || 0) - (b.backoffLevel || 0);
  if (backoffDifference !== 0) return backoffDifference;
  if (!a.lastUsedAt && !b.lastUsedAt) return (a.priority || 999) - (b.priority || 999);
  if (!a.lastUsedAt) return -1;
  if (!b.lastUsedAt) return 1;
  return new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime();
}
