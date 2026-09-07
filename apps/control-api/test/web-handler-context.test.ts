import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(appRoot, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [absolutePath] : [];
  });
}

test("control handlers use synchronous route params throughout", () => {
  const violations: string[] = [];
  for (const file of sourceFiles(sourceRoot)) {
    const source = readFileSync(file, "utf8");
    const relativePath = path.relative(appRoot, file);
    if (/params\s*:\s*Promise</.test(source)) violations.push(`${relativePath}: Promise route context`);
    if (/await\s+(?:params|context\.params|props\.params)\b/.test(source)) {
      violations.push(`${relativePath}: awaited route params`);
    }
    if (/params\s*:\s*Promise\.resolve\s*\(/.test(source)) {
      violations.push(`${relativePath}: Promise-wrapped params call`);
    }
    if (/params\s*:\s*\{[^}]+\}\s+as\s+any/.test(source)) {
      violations.push(`${relativePath}: untyped params call`);
    }
  }

  assert.deepEqual(violations, []);
});
