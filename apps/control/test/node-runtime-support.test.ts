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

test("parses versions and preserves the supported Node security floors", () => {
  assert.deepEqual(parseNodeVersion(" v22.22.2 "), {
    raw: "v22.22.2",
    normalized: "22.22.2",
    major: 22,
    minor: 22,
    patch: 2,
  });
  assert.equal(getNodeRuntimeSupport("22.22.1").reason, "below-security-floor");
  assert.equal(getNodeRuntimeSupport("22.22.1").minimumSecureVersion, "v22.22.2");
  assert.equal(getNodeRuntimeSupport("22.22.2").nodeCompatible, true);
  assert.equal(getNodeRuntimeSupport("24.0.0").nodeCompatible, true);
  assert.equal(getNodeRuntimeSupport("23.9.0").reason, "unsupported-major");
  assert.equal(getNodeRuntimeSupport("27.0.0").reason, "unreleased-major");
});

test("uses process.versions.node by default and preserves warnings", () => {
  assert.equal(getNodeRuntimeSupport().nodeVersion, `v${process.versions.node}`);
  assert.match(getNodeRuntimeWarning("22.0.0") ?? "", /below the patched minimum v22\.22\.2/);
  assert.match(getNodeRuntimeWarning("27.0.0") ?? "", /outside the supported LTS lines/);
  assert.equal(getNodeRuntimeWarning("24.0.0"), null);
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
    supportedRange: ">=22.22.2 <23 || >=24.0.0 <27 || Bun >=1.1.0",
    supportedDisplay: "Node.js 22.22.2+ (22.x LTS), 24.0.0+ (24.x LTS), 25.0.0+ (25.x), or 26.0.0+ (26.x), or Bun 1.1+",
    recommendedVersion: "v24.14.1",
    minimumSecureVersion: null,
  });
});
