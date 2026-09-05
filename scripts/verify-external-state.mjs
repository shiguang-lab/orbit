#!/usr/bin/env node

/** Verify allow-listed provider/CLI external state copied into the deployment home volume. */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const [manifestArg, targetHomeArg] = process.argv.slice(2);
const requireAll = process.argv.includes("--require-all");
if (!manifestArg || !targetHomeArg) {
  console.error("Usage: node scripts/verify-external-state.mjs <import-manifest> <target-home-dir>");
  process.exit(2);
}

const manifestPath = path.resolve(manifestArg);
const targetHome = path.resolve(targetHomeArg);
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const entries = Array.isArray(manifest.externalState) ? manifest.externalState : [];
const hashFile = async (file) => {
  const data = await fs.readFile(file);
  return { bytes: data.byteLength, sha256: createHash("sha256").update(data).digest("hex") };
};
const exists = async (file) => fs.access(file).then(() => true).catch(() => false);
const listFiles = async (root, current = root, output = []) => {
  for (const entry of await fs.readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    if (entry.isDirectory()) await listFiles(root, absolute, output);
    else if (entry.isFile()) output.push({ path: relative, ...(await hashFile(absolute)) });
    else throw new Error(`unsupported external-state entry: ${absolute}`);
  }
  return output.sort((a, b) => a.path.localeCompare(b.path));
};

const mismatches = [];
for (const entry of entries) {
  if (entry.status !== "copied") continue;
  const target = path.join(targetHome, entry.path);
  if (!(await exists(target))) {
    mismatches.push({ path: entry.path, reason: "missing-target" });
    continue;
  }
  const stat = await fs.stat(target);
  const expected = Array.isArray(entry.files) ? entry.files : [];
  const actual = stat.isDirectory()
    ? await listFiles(target)
    : [{ path: entry.path, ...(await hashFile(target)) }];
  if (expected.length !== actual.length) {
    mismatches.push({ path: entry.path, reason: "file-count", expected: expected.length, actual: actual.length });
    continue;
  }
  for (let i = 0; i < expected.length; i += 1) {
    const expectedFile = expected[i];
    const actualFile = actual[i];
    if (expectedFile.path !== actualFile.path || expectedFile.bytes !== actualFile.bytes || expectedFile.sha256 !== actualFile.sha256) {
      mismatches.push({ path: entry.path, reason: "hash", expected: expectedFile, actual: actualFile });
    }
  }
}

const missing = entries.filter((entry) => entry.status === "missing").map((entry) => entry.path);
if (requireAll) {
  for (const entry of entries) {
    if (entry.status === "missing") mismatches.push({ path: entry.path, reason: "missing-source-state", action: entry.action ?? "reauth-or-provide-source" });
  }
}

const report = {
  manifest: manifestPath,
  targetHome,
  copied: entries.filter((entry) => entry.status === "copied").map((entry) => entry.path),
  missing,
  mismatches,
};
report.status = mismatches.length === 0 ? "PASS" : "FAIL";
console.log(JSON.stringify(report, null, 2));
if (report.status !== "PASS") process.exitCode = 1;
