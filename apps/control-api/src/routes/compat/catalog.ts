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
    "providers/test-batch",
    "cli/connect",
    "cli/whoami",
    "cli/tokens",
    "cli/tokens/[id]",
    "batches",
    "batches/[id]",
  ]);
  return coreRoutes.filter((route) => !migrated.has(route.segments.join("/")));
}
