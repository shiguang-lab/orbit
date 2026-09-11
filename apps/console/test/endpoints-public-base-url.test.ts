import assert from "node:assert/strict";
import test from "node:test";
import { normalizePublicBaseUrl, resolvePublicBaseUrl } from "../src/features/endpoints/public-base-url.ts";

test("public browser domain takes precedence over a tunnel IP and stale stored IP", () => {
  assert.equal(resolvePublicBaseUrl({ customUrl: "http://100.87.115.78:8787/v1", currentOrigin: "https://ai.shiguanglab.com", tunnelUrls: ["http://100.87.115.78:8787"] }), "https://ai.shiguanglab.com/v1");
  assert.equal(resolvePublicBaseUrl({ currentOrigin: "https://ai.shiguanglab.com", tunnelUrls: ["https://other.example.com"] }), "https://ai.shiguanglab.com/v1");
});

test("normalizes explicit domains without duplicating v1", () => {
  assert.equal(resolvePublicBaseUrl({ customUrl: "https://api.example.com/proxy/v1/", currentOrigin: "https://ai.shiguanglab.com" }), "https://api.example.com/proxy/v1");
  assert.equal(normalizePublicBaseUrl("https://api.example.com/"), "https://api.example.com/v1");
});

test("local and Tailnet access does not imply a public endpoint", () => {
  for (const currentOrigin of ["http://localhost:5173", "http://192.168.64.6:8787", "https://100.87.115.78", "http://[::1]", "https://machine.tail.ts.net"]) assert.equal(resolvePublicBaseUrl({ currentOrigin }), "");
  assert.equal(resolvePublicBaseUrl({ currentOrigin: "http://localhost:5173", tunnelUrls: ["http://100.87.115.78:8787", "https://tunnel.example.com/"] }), "https://tunnel.example.com/v1");
  for (const value of ["https://user:pass@example.com", "https://example.com?secret=1", "https://example.com/#fragment", "ftp://example.com"]) assert.equal(normalizePublicBaseUrl(value), "");
});
