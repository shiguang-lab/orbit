import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { INTERNAL_SERVICE_AUTH_HEADER, getInternalServiceAuthHeaders, isInternalServiceRequest, isTrustedLoopbackInternalServiceRequest } from "../src/internal-service.js";

afterEach(() => {
  delete process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN;
  delete process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN_FILE;
});

test("requires a configured matching token", () => {
  assert.equal(isInternalServiceRequest(new Request("http://internal/")), false);
  process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = "shared-secret";
  assert.deepEqual(getInternalServiceAuthHeaders(), { [INTERNAL_SERVICE_AUTH_HEADER]: "shared-secret" });
  assert.equal(isInternalServiceRequest(new Request("http://internal/", { headers: { [INTERNAL_SERVICE_AUTH_HEADER]: "shared-secret" } })), true);
  assert.equal(isInternalServiceRequest(new Request("http://internal/", { headers: { [INTERNAL_SERVICE_AUTH_HEADER]: "wrong-secret" } })), false);
  process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN = "a";
  assert.equal(isInternalServiceRequest(new Request("http://internal/", { headers: { [INTERNAL_SERVICE_AUTH_HEADER]: "é" } })), false);
});

test("loads a token file and separately requires loopback locality", async () => {
  const dir = await mkdtemp(join(tmpdir(), "internal-service-auth-"));
  try {
    const tokenFile = join(dir, "token");
    await writeFile(tokenFile, "file-secret\n");
    process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN_FILE = tokenFile;
    const headers = { [INTERNAL_SERVICE_AUTH_HEADER]: "file-secret", "x-shiguangGateway-peer-locality": "loopback" };
    assert.equal(isTrustedLoopbackInternalServiceRequest(new Request("http://internal/", { headers })), true);
    headers["x-shiguangGateway-peer-locality"] = "private";
    assert.equal(isTrustedLoopbackInternalServiceRequest(new Request("http://internal/", { headers })), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
