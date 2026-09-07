import {
  syncCliproxyScope,
  removeCliproxyScope,
  cliproxyScopeId,
  cliproxyScopePrefix,
} from "./cliproxyScopes.ts";
import { randomUUID } from "node:crypto";
import { getDbInstance } from "./core.ts";

export interface ServiceNode {
  id: string;
  scopeId: string;
  scopePrefix: string;
  name: string;
  endpoint: string;
  report: Record<string, unknown> | null;
  lastSeenAt: string | null;
  createdAt: string;
  online: boolean;
}
interface Row {
  id: string;
  name: string;
  endpoint: string;
  latest_report: string | null;
  last_seen_at: string | null;
  created_at: string;
}
function view(row: Row): ServiceNode {
  return {
    id: row.id,
    scopeId: cliproxyScopeId(row.id),
    scopePrefix: cliproxyScopePrefix(row.id),
    name: row.name,
    endpoint: row.endpoint,
    report: row.latest_report ? JSON.parse(row.latest_report) : null,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    online:
      !!row.last_seen_at && Date.now() - Date.parse(row.last_seen_at) < 60_000,
  };
}
function row(id: string): Row | undefined {
  return getDbInstance()
    .prepare("SELECT * FROM service_nodes WHERE id = ?")
    .get(id) as Row | undefined;
}
export function listServiceNodes(): ServiceNode[] {
  return (
    getDbInstance()
      .prepare("SELECT * FROM service_nodes ORDER BY created_at")
      .all() as Row[]
  ).map(view);
}
export function createServiceNode(input: {
  name: string;
  endpoint: string;
  id?: string;
}) {
  const id = input.id || randomUUID();
  getDbInstance()
    .prepare(
      "INSERT INTO service_nodes (id, name, endpoint, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(id, input.name, input.endpoint, new Date().toISOString());
  return { node: view(row(id)!) };
}
export function getServiceNodeConnection(
  id: string,
): { endpoint: string } | null {
  const found = row(id);
  if (!found) return null;
  return { endpoint: found.endpoint };
}
export function acceptServiceNodeReport(
  id: string,
  report: Record<string, unknown>,
): boolean {
  const found = row(id);
  if (!found) return false;
  if (report.nodeId !== id) return false;
  storeServiceNodeReport(id, report);
  return true;
}
export function storeServiceNodeReport(
  id: string,
  report: Record<string, unknown>,
): void {
  const found = row(id);
  if (!found) return;
  getDbInstance().transaction(() => {
    getDbInstance()
      .prepare(
        "UPDATE service_nodes SET latest_report = ?, last_seen_at = ? WHERE id = ?",
      )
      .run(JSON.stringify(report), new Date().toISOString(), id);
    const previous = found.latest_report
      ? JSON.parse(found.latest_report)
      : null;
    const routingState = (value: Record<string, unknown> | null) =>
      JSON.stringify(
        (
          (value?.instances ?? []) as {
            id: string;
            healthy: boolean;
            providerExpose?: boolean;
            credentials?: unknown;
          }[]
        ).map((instance) => ({
          id: instance.id,
          healthy: instance.healthy,
          providerExpose: instance.providerExpose,
          credentials: instance.credentials,
        })),
      );
    if (!previous || routingState(previous) !== routingState(report))
      syncCliproxyScope(found, report);
  })();
}
export function deleteServiceNode(id: string): boolean {
  return getDbInstance().transaction(() => {
    removeCliproxyScope(id);
    return (
      getDbInstance().prepare("DELETE FROM service_nodes WHERE id = ?").run(id)
        .changes > 0
    );
  })();
}

export function resolveCliproxyCredentialTarget(
  managerId: string,
  processId: string,
  credentialId: string,
): string {
  const found = row(managerId);
  if (!found || !view(found).online)
    throw new Error("CLIProxyAPI instance is offline or removed");
  const report = view(found).report as {
    instances?: {
      id: string;
      healthy: boolean;
      providerExpose?: boolean;
      credentials?: { id: string; routable: boolean; disabled: boolean }[];
    }[];
  } | null;
  const process = report?.instances?.find((item) => item.id === processId);
  const credential = process?.credentials?.find(
    (item) => item.id === credentialId,
  );
  if (
    !process?.healthy ||
    process.providerExpose === false ||
    !credential?.routable ||
    credential.disabled
  )
    throw new Error("CLIProxyAPI credential is unavailable");
  return `${found.endpoint}/v1/instances/${encodeURIComponent(processId)}/credentials/${encodeURIComponent(credentialId)}/inference`;
}
