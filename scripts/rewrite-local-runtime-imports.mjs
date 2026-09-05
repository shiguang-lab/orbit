#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

const root = join(process.cwd(), "packages", "core-domain");
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:ts|tsx|js|mjs)$/.test(file)) files.push(file);
  }
}
walk(root);

function targetSpecifier(from, target) {
  const candidates = [target, `${target}.ts`, `${target}.tsx`, `${target}.js`, join(target, "index.ts")];
  const resolved = candidates.find((candidate) => { try { return statSync(candidate).isFile(); } catch { return false; } }) || target;
  let out = relative(dirname(from), resolved).split(sep).join("/");
  if (!out.startsWith(".")) out = `./${out}`;
  return out;
}

for (const file of files) {
  const original = readFileSync(file, "utf8");
  const updated = original.replace(/((?:from\s+|import\s*\(|export\s+from\s+|require\s*\()\s*["'])@\/([^"']+)(["'])/g, (_match, prefix, subpath, suffix) => `${prefix}${targetSpecifier(file, join(root, "src", subpath))}${suffix}`)
    .replace(/((?:from\s+|import\s*\(|export\s+from\s+|require\s*\()\s*["'])@shiguang-gateway\/open-sse\/([^"']+)(["'])/g, (_match, prefix, subpath, suffix) => `${prefix}${targetSpecifier(file, join(root, "../open-sse", subpath))}${suffix}`)
    .replace(/((?:from\s+|import\s*\(|export\s+from\s+|require\s*\()\s*["'])@shiguang-gateway\/open-sse(["'])/g, (_match, prefix, suffix) => `${prefix}${targetSpecifier(file, join(root, "../open-sse"))}${suffix}`);
  if (updated !== original) writeFileSync(file, updated);
}
console.log(`rewrote local runtime imports in ${files.length} files`);
