#!/usr/bin/env node

/** Verify that every official dashboard page has a local React Router entry. */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const referenceRoot = resolve(process.env.SHIGUANG_GATEWAY_REFERENCE_DIR || join(root, "..", "Orbit"));
const dashboardRoot = join(referenceRoot, "src", "app", "(dashboard)", "dashboard");
const routerFile = join(root, "apps", "console", "src", "app", "router.tsx");

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (entry.name === "page.tsx") out.push(file);
  }
  return out;
}

const official = walk(dashboardRoot)
  .map((file) => relative(dashboardRoot, file).replace(/\\/g, "/").replace(/\/page\.tsx$/, ""))
  .filter((path) => path !== "page.tsx")
  .map((path) => `dashboard/${path.replace(/\[([^\]]+)\]/g, ":$1")}`);
const router = readFileSync(routerFile, "utf8");
const local = [...router.matchAll(/path:\s*"([^"]+)"/g)].map((match) => match[1]);
const missing = official.filter((path) => !local.includes(path));
const report = { referenceRoot, officialPageCount: official.length, localRouteCount: local.length, missing, status: missing.length === 0 ? "PASS" : "FAIL" };
console.log(JSON.stringify(report, null, 2));
if (process.argv.includes("--strict") && report.status !== "PASS") process.exitCode = 1;
