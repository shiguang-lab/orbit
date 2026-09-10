import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  getNodeRuntimeSupport,
  getNodeRuntimeWarning,
  parseNodeVersion,
} from "../src/settings/security/node-runtime-support.js";

afterEach(() => {
  delete (process.versions as NodeJS.ProcessVersions & { bun?: string }).bun;
});

test("parses versions and preserves the supported Node LTS floor", () => {
  assert.deepEqual(parseNodeVersion(" v24.20.0 "), {
    raw: "v24.20.0",
    normalized: "24.20.0",
    major: 24,
    minor: 20,
    patch: 0,
  });
  assert.equal(getNodeRuntimeSupport("24.19.0").reason, "below-security-floor");
  assert.equal(getNodeRuntimeSupport("24.19.0").minimumSecureVersion, "v24.20.0");
  assert.equal(getNodeRuntimeSupport("24.20.0").nodeCompatible, true);
  assert.equal(getNodeRuntimeSupport("22.22.3").reason, "unsupported-major");
  assert.equal(getNodeRuntimeSupport("23.9.0").reason, "unsupported-major");
  assert.equal(getNodeRuntimeSupport("26.0.0").reason, "unreleased-major");
});

test("uses process.versions.node by default and preserves warnings", () => {
  assert.equal(getNodeRuntimeSupport().nodeVersion, `v${process.versions.node}`);
  assert.match(getNodeRuntimeWarning("24.19.0") ?? "", /below the patched minimum v24\.20\.0/);
  assert.match(getNodeRuntimeWarning("26.0.0") ?? "", /outside the supported LTS line/);
  assert.equal(getNodeRuntimeWarning("24.20.0"), null);
});

test("detects Bun through process.versions before applying Node floors", () => {
  Object.defineProperty(process.versions, "bun", {
    value: "1.2.3",
    configurable: true,
  });
  assert.deepEqual(getNodeRuntimeSupport("20.0.0"), {
    nodeVersion: "bun-1.2.3 (Node.js API 20.0.0)",
    nodeCompatible: true,
    reason: "supported-bun",
    supportedRange: ">=24.20.0 <25 || Bun >=1.1.0",
    supportedDisplay: "Node.js 24.20.0+ (24.x LTS), or Bun 1.1+",
    recommendedVersion: "v24.20.0",
    minimumSecureVersion: null,
  });
});
