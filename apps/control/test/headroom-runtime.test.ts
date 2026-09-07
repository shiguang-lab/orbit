import assert from "node:assert/strict";
import test from "node:test";

import {
  buildHeadroomStatus,
  isLoopbackHeadroomUrl,
  parsePortFromHeadroomUrl,
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
