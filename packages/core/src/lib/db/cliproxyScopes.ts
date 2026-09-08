import { createHash } from "node:crypto";
import { getDbInstance } from "./core.ts";
import { invalidateDbCache, invalidateModelCatalogCache } from "./readCache.ts";
import { normalizeSyncedAvailableModels } from "./models/synced.ts";

export function cliproxyScopeId(instanceId: string): string {
  return `openai-compatible-cliproxy-${instanceId}`;
}
export function cliproxyScopePrefix(instanceId: string): string {
  return `cpa-${instanceId}`;
}
interface CatalogCredential {
  id: string;
  instanceId: string;
  name: string;
  email?: string;
  provider: string;
  disabled: boolean;
  routable: boolean;
  models: string[];
}
interface CatalogProcess {
  id: string;
  healthy: boolean;
  providerExpose?: boolean;
  credentials?: CatalogCredential[] | null;
}

// Called in the service-node report transaction. One provider node per manager,
// one secret-free connection per credential, and a deduplicated model catalog.
export function syncCliproxyScope(
  node: { id: string; name: string; endpoint: string },
  report: Record<string, unknown>,
): void {
  const db = getDbInstance();
  const provider = cliproxyScopeId(node.id);
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO provider_nodes (id,type,name,prefix,api_type,base_url,created_at,updated_at)
    VALUES (?, 'openai-compatible', ?, ?, 'chat', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, prefix=excluded.prefix, base_url=excluded.base_url, updated_at=excluded.updated_at`,
  ).run(
    provider,
    `CLIProxyAPI · ${node.name}`,
    cliproxyScopePrefix(node.id),
    node.endpoint,
    now,
    now,
  );
  const previous = db
    .prepare("SELECT id FROM provider_connections WHERE provider = ?")
    .all(provider) as { id: string }[];
  const seen = new Set<string>();
  const processes = Array.isArray(report.instances)
    ? (report.instances as CatalogProcess[])
    : [];
  for (const process of processes) {
    for (const credential of process.credentials ?? []) {
      if (credential.instanceId !== process.id) continue;
      const id = `cpa-${createHash("sha256")
        .update(JSON.stringify([node.id, process.id, credential.id]))
        .digest("hex")
        .slice(0, 32)}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const active =
        process.healthy &&
        process.providerExpose !== false &&
        credential.routable &&
        !credential.disabled;
      const baseUrl = `${node.endpoint}/v1/instances/${encodeURIComponent(process.id)}/credentials/${encodeURIComponent(credential.id)}/inference/v1`;
      const accountName =
        credential.email && credential.email.trim()
          ? credential.email.trim()
          : credential.name;
      const metadata = JSON.stringify({
        cliproxyManagerId: node.id,
        cliproxyProcessId: process.id,
        cliproxyCredentialId: credential.id,
        credentialName: credential.name,
        accountEmail: credential.email || null,
        upstreamProvider: credential.provider,
        baseUrl,
        apiType: "chat",
        managedBy: "cliproxy-manager",
      });
      db.prepare(
        `INSERT INTO provider_connections
        (id,provider,auth_type,name,is_active,provider_specific_data,proxy_enabled,quota_visible,created_at,updated_at)
        VALUES (?, ?, 'none', ?, ?, ?, 0, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, is_active=excluded.is_active,
          provider_specific_data=excluded.provider_specific_data, updated_at=excluded.updated_at`,
      ).run(id, provider, accountName, active ? 1 : 0, metadata, now, now);
      const models = normalizeSyncedAvailableModels(
        credential.models.map((model) => ({
          id: model,
          name: model,
          source: "imported",
          apiFormat: "openai",
          supportedEndpoints: ["chat", "responses"],
        })),
      );
      db.prepare(
        "INSERT OR REPLACE INTO key_value (namespace,key,value) VALUES ('syncedAvailableModels',?,?)",
      ).run(`${provider}:${id}`, JSON.stringify(active ? models : []));
    }
  }
  for (const old of previous) {
    if (seen.has(old.id)) continue;
    // Keep the identity so saved combos never turn a deleted credential into
    // unrestricted selection. It may recover on the next valid report.
    db.prepare(
      "UPDATE provider_connections SET is_active = 0, updated_at = ? WHERE id = ?",
    ).run(now, old.id);
    db.prepare(
      "DELETE FROM key_value WHERE namespace = 'syncedAvailableModels' AND key = ?",
    ).run(`${provider}:${old.id}`);
  }
  invalidateDbCache("nodes");
  invalidateDbCache("connections");
  invalidateModelCatalogCache();
}

export function removeCliproxyScope(instanceId: string): void {
  const db = getDbInstance();
  const provider = cliproxyScopeId(instanceId);
  db.prepare(
    "DELETE FROM key_value WHERE namespace = 'syncedAvailableModels' AND substr(key,1,?) = ?",
  ).run(provider.length + 1, `${provider}:`);
  db.prepare("DELETE FROM provider_connections WHERE provider = ?").run(
    provider,
  );
  db.prepare("DELETE FROM provider_nodes WHERE id = ?").run(provider);
  invalidateDbCache("nodes");
  invalidateDbCache("connections");
  invalidateModelCatalogCache();
}
