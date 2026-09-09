// @ts-nocheck
import os from "os";
import path from "path";

import { createProviderConnection } from "@orbit/core/control/oauth-persistence";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { listServiceNodes } from "@orbit/core/control/service-nodes";
import {
  parseCliProxyAuthRecord,
  scanCliProxyAuthDir,
  toConnectionPayload,
  type ParsedCliProxyAuth,
} from "@orbit/core/control/oauth-runtime/utils/cliProxyAuthImport";

/**
 * #1934: import OAuth credentials saved by CLIProxyAPI (~/.cli-proxy-api/ or remote service nodes)
 * so users don't have to re-login every account individually.
 *
 *   GET  → preview the importable accounts (provider/email/type only — never tokens).
 *   POST → import them as Orbit connections (upsert via createProviderConnection).
 */

function cliProxyConfigDir(): string {
  return process.env.CLIPROXYAPI_CONFIG_DIR || path.join(os.homedir(), ".cli-proxy-api");
}

async function requireImportAuth(request: Request) {
  // GHSA-mg76: importing a provider connection is a state-mutating admin action;
  // require management scope (or a dashboard session), not any valid client key.
  return requireManagementAuth(request, { invalidApiKeyStatus: 401 });
}

async function scanServiceNodes(
  now: number
): Promise<{ candidates: ParsedCliProxyAuth[]; scanned: number; skipped: number }> {
  let nodes: any[] = [];
  try {
    nodes = listServiceNodes();
  } catch {
    return { candidates: [], scanned: 0, skipped: 0 };
  }
  const candidates: ParsedCliProxyAuth[] = [];
  let scanned = 0;
  let skipped = 0;

  for (const node of nodes) {
    if (!node.endpoint) continue;
    const instanceIds: string[] = [];
    if (Array.isArray(node.report?.instances)) {
      for (const inst of node.report.instances) {
        if (inst && typeof inst.id === "string") instanceIds.push(inst.id);
      }
    }
    if (instanceIds.length === 0) {
      instanceIds.push(node.id);
    }
    for (const instanceId of instanceIds) {
      try {
        const res = await fetch(
          `${node.endpoint}/v1/instances/${encodeURIComponent(instanceId)}/management/auth-files`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) continue;
        const data = (await res.json()) as { files?: Array<{ name?: string }> };
        const files = Array.isArray(data.files) ? data.files : [];
        scanned += files.length;
        for (const file of files) {
          if (!file.name) {
            skipped++;
            continue;
          }
          try {
            const fileRes = await fetch(
              `${node.endpoint}/v1/instances/${encodeURIComponent(instanceId)}/management/auth-files/download?name=${encodeURIComponent(file.name)}`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (!fileRes.ok) {
              skipped++;
              continue;
            }
            const fileJson = await fileRes.json();
            const parsed = parseCliProxyAuthRecord(fileJson, now);
            if (parsed) {
              candidates.push(parsed);
            } else {
              skipped++;
            }
          } catch {
            skipped++;
          }
        }
      } catch {
        // Node may be offline or unreachable
      }
    }
  }

  return { candidates, scanned, skipped };
}

async function getAllCandidates(now: number) {
  const local = await scanCliProxyAuthDir(cliProxyConfigDir(), now);
  const remote = await scanServiceNodes(now);

  const seen = new Set<string>();
  const candidates: ParsedCliProxyAuth[] = [];

  for (const c of [...local.candidates, ...remote.candidates]) {
    const key = `${c.provider}:${c.email || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push(c);
    }
  }

  return {
    candidates,
    scanned: local.scanned + remote.scanned,
    skipped: local.skipped + remote.skipped,
    dir: cliProxyConfigDir(),
  };
}

export async function GET(request: Request) {
  const authResponse = await requireImportAuth(request);
  if (authResponse) return authResponse;
  try {
    const { candidates, skipped, scanned, dir } = await getAllCandidates(Date.now());
    // Sanitize: never return access/refresh tokens to the client.
    const accounts = candidates.map((c) => ({
      provider: c.provider,
      type: c.type,
      email: c.email,
    }));
    return Response.json({ dir, scanned, skipped, accounts });
  } catch (error) {
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResponse = await requireImportAuth(request);
  if (authResponse) return authResponse;
  try {
    const { candidates, skipped, scanned } = await getAllCandidates(Date.now());
    let imported = 0;
    const results: Array<{ provider: string; email: string | null; ok: boolean; error?: string }> =
      [];
    for (const candidate of candidates) {
      try {
        await createProviderConnection(toConnectionPayload(candidate));
        imported++;
        results.push({ provider: candidate.provider, email: candidate.email, ok: true });
      } catch (err) {
        results.push({
          provider: candidate.provider,
          email: candidate.email,
          ok: false,
          error: sanitizeErrorMessage(err instanceof Error ? err.message : String(err)),
        });
      }
    }
    return Response.json({ scanned, skipped, imported, results });
  } catch (error) {
    return Response.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

