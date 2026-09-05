#!/usr/bin/env node
/**
 * Fails when the deployable source tree still exposes the retired project
 * identifier. Keep the token assembled so this audit can itself be copied into
 * a clean-room distribution without reintroducing the retired name.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const retiredToken = ["omni", "route"].join("");
const roots = ["apps", "packages", "scripts", "deploy"];
const rootFiles = [
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
  "package.json",
  "pnpm-workspace.yaml",
  ".github/workflows/docker-publish.yml",
];
const ignored = new Set(["node_modules", "dist", ".turbo", ".git"]);
const failures = [];

function walk(path) {
  if (!existsSync(path)) return;
  const info = statSync(path);
  if (info.isFile()) {
    const rel = relative(root, path);
    try {
      const bytes = readFileSync(path);
      if (bytes.includes(0)) return;
      const text = bytes.toString("utf8");
      if (new RegExp(retiredToken, "i").test(rel) || new RegExp(retiredToken, "i").test(text)) {
        failures.push(rel);
      }
    } catch {
      // Ignore binary/unreadable files; this audit covers text deployment assets.
    }
    return;
  }
  for (const entry of readdirSync(path)) {
    if (ignored.has(entry)) continue;
    walk(join(path, entry));
  }
}

for (const path of roots.map((value) => join(root, value))) walk(path);
for (const path of rootFiles.map((value) => join(root, value))) walk(path);

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", retiredToken, files: failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ status: "PASS", scannedRoots: [...roots, ...rootFiles] }, null, 2));
