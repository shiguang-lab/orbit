import assert from "node:assert/strict";
import { test } from "node:test";
import {
  readCompressionRequestHeader,
  withCompressionHeaderEcho,
} from "../src/completions/compression-header-echo.js";

const RESPONSE_HEADER = "X-Orbit-Compression";

test("reads the compression request header and ignores absent or blank values", () => {
  assert.equal(readCompressionRequestHeader(new Request("http://localhost")), null);
  assert.equal(
    readCompressionRequestHeader(
      new Request("http://localhost", {
        headers: { "X-Orbit-Compression": "   " },
      })
    ),
    null
  );
  assert.equal(
    readCompressionRequestHeader(
      new Request("http://localhost", {
        headers: { "X-Orbit-Compression": " Engine:SMART " },
      })
    ),
    "Engine:SMART"
  );
});

test("echoes normalized engine modes while preserving response metadata", async () => {
  const original = new Response("payload", {
    status: 202,
    statusText: "Accepted",
    headers: { "X-Existing": "kept" },
  });

  const result = withCompressionHeaderEcho(original, " Engine:SMART ");

  assert.equal(result.status, 202);
  assert.equal(result.statusText, "Accepted");
  assert.equal(result.headers.get("X-Existing"), "kept");
  assert.equal(result.headers.get(RESPONSE_HEADER), "engine:smart; source=request-header");
  assert.equal(await result.text(), "payload");
});

test("preserves named mode casing and never overwrites richer pipeline metadata", () => {
  const named = withCompressionHeaderEcho(new Response(null), " MyCombo ");
  assert.equal(named.headers.get(RESPONSE_HEADER), "MyCombo; source=request-header");

  const existing = new Response(null, {
    headers: { [RESPONSE_HEADER]: "engine:smart; tokens=42; source=pipeline" },
  });
  assert.strictEqual(withCompressionHeaderEcho(existing, "off"), existing);
  assert.equal(
    existing.headers.get(RESPONSE_HEADER),
    "engine:smart; tokens=42; source=pipeline"
  );
});
