/**
 * GET  /api/system/env/repair  — Returns OAuth env repair status
 * POST  /api/system/env/repair  — Backups .env and adds missing OAuth defaults into .env
 *
 * Security: Requires admin authentication (same as other management routes).
 * Safety: Only fills missing OAuth defaults from .env.example.
 */
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { getEnvSyncPlan, syncEnv } from "@shiguang-gateway/core-domain/control/env-repair";

async function loadSyncHelpers() {
  return { getEnvSyncPlan, syncEnv };
}

function createEnvBackup() {
  const envPath = join(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(process.cwd(), `.env.backup-${timestamp}`);
  copyFileSync(envPath, backupPath);
  return backupPath;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getEnvSyncPlan } = await loadSyncHelpers();
    // Pass an explicit rootDir so the helper never derives the root from a
    // webpack-frozen `import.meta.url` (build-machine path) — that froze the
    // path and 500'd this route on packaged installs (#5006). cwd matches the
    // `.env` target used by createEnvBackup() above.
    const plan = getEnvSyncPlan({ scope: "oauth", rootDir: process.cwd() });

    return Response.json({
      available: plan.available,
      created: plan.created,
      added: plan.added,
      missingCount: plan.missingEntries.length,
      missingKeys: plan.missingEntries.map((entry: { key: string }) => entry.key),
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error)?.message || "Failed to inspect env defaults" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncEnv, getEnvSyncPlan } = await loadSyncHelpers();
    const backupPath = createEnvBackup();
    // Explicit rootDir (cwd) — see GET above (#5006).
    const result = syncEnv({ scope: "oauth", quiet: true, rootDir: process.cwd() });
    const plan = getEnvSyncPlan({ scope: "oauth", rootDir: process.cwd() });

    return Response.json({
      success: true,
      backupPath,
      created: result.created,
      added: result.added,
      missingCount: plan.missingEntries.length,
      missingKeys: plan.missingEntries.map((entry: { key: string }) => entry.key),
    });
  } catch (error) {
    return Response.json(
      { error: (error as Error)?.message || "Failed to repair env defaults" },
      { status: 500 }
    );
  }
}
