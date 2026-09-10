import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const HUB_RE =
  /(setupPolyfill|tsconfig|package\.json|package-lock\.json|\.env|vitest\.config|stryker\.conf)/;
const TEST_RE = /^(apps|packages)\/[^/]+\/(test|tests|src\/__tests__)\/.*\.test\.(ts|tsx|js|mjs)$/;

export function selectImpacted({ changed, map }) {
  const out = new Set();
  for (const f of changed) {
    if (HUB_RE.test(f)) return ["__RUN_ALL__"];
    if (TEST_RE.test(f)) {
      out.add(f);
      continue;
    }
    // Orbit's impact map indexes source owned by workspace apps and packages.
    const isSource = f.startsWith("apps/") || f.startsWith("packages/");
    if (!isSource) continue;
    const hits = map.sources[f];
    if (!hits) return ["__RUN_ALL__"];
    hits.forEach((t) => out.add(t));
  }
  return [...out].sort();
}

// `--stdin`: read the changed-file list from stdin (one path per line) instead of
// diffing git. Used by scripts/quality/test-scoped.sh so `--staged` selects from the
// index — the git-diff path here only knows about commits, never the working tree.
export function changedFilesFromStdin(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function changedFiles() {
  if (process.argv.includes("--stdin")) return changedFilesFromStdin(fs.readFileSync(0, "utf8"));
  const baseRef = process.env.GITHUB_BASE_REF;
  const baseTarget = process.env.GITHUB_BASE_SHA || (baseRef ? `origin/${baseRef}` : "HEAD~1");
  const stdout = execFileSync(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", `${baseTarget}...HEAD`],
    { cwd: ROOT, encoding: "utf8" }
  );
  return stdout
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mapPath = path.join(ROOT, "config/quality/test-impact-map.json");
  let map;
  try {
    map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch {
    console.log("__RUN_ALL__");
    process.exit(0);
  }
  const sel = selectImpacted({ changed: changedFiles(), map });
  process.stdout.write(sel.join("\n") + "\n");
}
