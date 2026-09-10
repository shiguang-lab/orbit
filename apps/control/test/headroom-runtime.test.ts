import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHeadroomStatus,
  isLoopbackHeadroomUrl,
  parsePortFromHeadroomUrl,
  resolveHeadroomUrl,
} from "../src/headroom/runtime/detect.ts";

test("control-owned Headroom runtime accepts only loopback lifecycle URLs", () => {
  assert.equal(isLoopbackHeadroomUrl("http://127.0.0.1:8787"), true);
  assert.equal(isLoopbackHeadroomUrl("https://headroom.example.com"), false);
  assert.equal(parsePortFromHeadroomUrl("http://localhost:8787"), 8787);
  assert.deepEqual(buildHeadroomStatus({
    url: "http://localhost:8787",
    binaryPath: "/usr/local/bin/headroom",
    python: "python3.12",
    proxyReachable: false,
  }), {
    installed: true,
    path: "/usr/local/bin/headroom",
    running: false,
    python: "python3.12",
    localUrl: true,
    canStart: true,
  });
});

test("Headroom URL precedence is persisted setting, environment, then localhost", () => {
  assert.equal(
    resolveHeadroomUrl("  http://headroom.internal:9090  ", {
      HEADROOM_URL: "http://env.internal:8787",
    }),
    "http://headroom.internal:9090"
  );
  assert.equal(
    resolveHeadroomUrl("", { HEADROOM_URL: "  http://env.internal:8787  " }),
    "http://env.internal:8787"
  );
  assert.equal(resolveHeadroomUrl(undefined, {}), "http://localhost:8787");
});
