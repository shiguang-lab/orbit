import { existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompatRouteDefinition } from "@shiguang-gateway/web-route-compat";

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.name === "route.ts") out.push(file);
  }
  return out;
}

function collectApiRoutes(root: string): CompatRouteDefinition[] {
  const apiRoot = join(root, "api");
  if (!existsSync(apiRoot)) return [];
  return walk(apiRoot).map((file) => {
    const segments = relative(apiRoot, file).split("/");
    segments.pop();
    return { file, segments, root: false, score: segments.reduce((n, s) => n + (s.startsWith("[") ? 0 : 2), 0) };
  });
}

/** Control catalog: only management routes that have not yet moved into control-api. */
export function controlRouteCatalog(): CompatRouteDefinition[] {
  const coreRoot = fileURLToPath(new URL("../../../../../packages/core-domain/src/app/", import.meta.url));
  const appRoot = fileURLToPath(new URL("../", import.meta.url));
  const coreRoutes = collectApiRoutes(coreRoot);
  const appRoutes = collectApiRoutes(appRoot);
  const migrated = new Set([
    ...appRoutes.map((route) => route.segments.join("/")),
    // Implemented as a Nest controller in control-api (not a legacy route.ts).
    "cli-tools/all-statuses",
    "cli-tools/detect",
    "cli-tools/config",
    "cli-tools/apply",
    "cli-tools/backups",
    "cli-tools/keys",
    "cli-tools/logs",
    "cli-tools/runtime/[toolId]",
    "cli-tools/guide-settings/[toolId]",
    "cli-tools/antigravity-mitm",
    "cli-tools/antigravity-mitm/alias",
    "cli-tools/openclaw/auto-order",
    "cli-tools/claude-settings",
    "cli-tools/cline-settings",
    "cli-tools/codewhale-settings",
    "cli-tools/crush-settings",
    "cli-tools/droid-settings",
    "cli-tools/grok-build-settings",
    "cli-tools/hermes-agent-settings",
    "cli-tools/jcode-settings",
    "cli-tools/kilo-settings",
    "cli-tools/letta-settings",
    "cli-tools/omp-settings",
    "cli-tools/openclaw-settings",
    "cli-tools/qwen-settings",
    "cli-tools/smelt-settings",
    "providers/test-batch",
    "cli/connect",
    "cli/whoami",
    "cli/tokens",
    "cli/tokens/[id]",
    "batches",
    "batches/[id]",
    "agent-skills",
    "agent-skills/coverage",
    "agent-skills/generate",
    "agent-skills/[id]",
    "agent-skills/[id]/raw",
    "conversations",
    "conversations/[id]/tree",
    "db/health",
    "admin/concurrency",
    "conductor/ask",
    "conductor/fleet",
    "chaos/config",
    "chaos/run",
    "usage/analytics",
    "usage/requests-by-provider-date",
    "usage/token-limits",
    "usage/[connectionId]",
    "usage/combo-health",
    "usage/quota",
    "usage/provider-limits",
    "usage/combo-trace/[id]",
    "usage/om-usage",
  ]);
  return coreRoutes.filter((route) => !migrated.has(route.segments.join("/")));
}
