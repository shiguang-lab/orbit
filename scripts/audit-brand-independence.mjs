#!/usr/bin/env node
/**
 * Fails when the deployable source tree still exposes the retired project
 * identifier. Keep the token assembled so this audit can itself be copied into
 * a clean-room distribution without reintroducing the retired name.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import assert from "node:assert/strict";

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

// The deployed SSO contract is independent of the product's display branding.
// Only these documents and regression fixtures may spell its exact values.
const ssoDocuments = new Set([
  "deploy/NAS-DEPLOY.md", "deploy/gateway-caddyfile.md",
  "deploy/SSO-INTEGRATION.md", "deploy/auth-service-config.md",
]);
const ssoTests = new Set([
  "apps/control-api/test/auth-session.test.ts",
  "packages/auth/test/configured-entitlement.test.ts",
  "apps/realtime/test/live-server-sso.test.ts",
]);
function containsRetiredIdentifier(rel, text) {
  if (new RegExp(retiredToken, "i").test(rel)) return true;
  let inspected = text;
  if (ssoDocuments.has(rel)) {
    inspected = inspected.replace(new RegExp(
      "`(?:" + retiredToken + "(?:-api|:access)?|SG_IDENTITY_AUDIENCE=" + retiredToken +
      "-api|SG_IDENTITY_ENTITLEMENT=" + retiredToken + ":access)`", "g"
    ), "");
    inspected = inspected.replace(new RegExp(
      "^\\s*header_up X-SG-(?:Product-ID " + retiredToken + "|Audience " + retiredToken +
      "-api|Required-Entitlements " + retiredToken + ":access)\\s*$", "gm"
    ), "");
    inspected = inspected.replace(new RegExp(
      "^\\s*SG_IDENTITY_(?:AUDIENCE=" + retiredToken + "-api|ENTITLEMENT=" +
      retiredToken + ":access)\\s*$", "gm"
    ), "");
  } else if (ssoTests.has(rel)) {
    inspected = inspected.replace(new RegExp('"' + retiredToken + '(?:-api|:access)"', "g"), "");
  }
  return new RegExp(retiredToken, "i").test(inspected);
}

function selfTest() {
  const audience = `${retiredToken}-api`;
  const entitlement = `${retiredToken}:access`;
  for (const rel of ssoDocuments) {
    assert.equal(containsRetiredIdentifier(rel, `Product \`${retiredToken}\`, audience \`${audience}\`, entitlement \`${entitlement}\``), false);
    assert.equal(containsRetiredIdentifier(rel, `\`SG_IDENTITY_AUDIENCE=${audience}\` \`SG_IDENTITY_ENTITLEMENT=${entitlement}\``), false);
    assert.equal(containsRetiredIdentifier(rel, `SG_IDENTITY_AUDIENCE=${audience}\nSG_IDENTITY_ENTITLEMENT=${entitlement}`), false);
    assert.equal(containsRetiredIdentifier(rel, `header_up X-SG-Product-ID ${retiredToken}\nheader_up X-SG-Audience ${audience}\nheader_up X-SG-Required-Entitlements ${entitlement}`), false);
    assert.equal(containsRetiredIdentifier(rel, `Welcome to ${retiredToken}`), true);
    assert.equal(containsRetiredIdentifier(rel, `\`${retiredToken}-runtime\``), true);
    assert.equal(containsRetiredIdentifier(rel, `\`${retiredToken}:admin\``), true);
    assert.equal(containsRetiredIdentifier(rel, `header_up X-SG-Audience ${retiredToken}-other`), true);
  }
  for (const rel of ssoTests) {
    assert.equal(containsRetiredIdentifier(rel, `session(["${entitlement}"], "${audience}")`), false);
    assert.equal(containsRetiredIdentifier(rel, `"${retiredToken}:admin"`), true);
    assert.equal(containsRetiredIdentifier(rel, `Welcome to ${retiredToken}`), true);
  }
  assert.equal(containsRetiredIdentifier("apps/realtime/test/other.test.ts", `"${audience}"`), true);
  assert.equal(containsRetiredIdentifier("packages/auth/src/session.ts", `"${audience}"`), true);
  assert.equal(containsRetiredIdentifier("deploy/other.md", `\`${entitlement}\``), true);
  assert.equal(containsRetiredIdentifier(`apps/${retiredToken}/index.ts`, ""), true);
  assert.equal(containsRetiredIdentifier("apps/admin/index.ts", "ShiguangGateway"), false);
  console.log("brand SSO exception self-test: PASS");
}

if (process.argv.includes("--self-test")) selfTest();

function walk(path) {
  if (!existsSync(path)) return;
  const info = statSync(path);
  if (info.isFile()) {
    const rel = relative(root, path);
    try {
      const bytes = readFileSync(path);
      if (bytes.includes(0)) return;
      const text = bytes.toString("utf8");
      if (containsRetiredIdentifier(rel, text)) {
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
