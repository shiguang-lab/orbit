import assert from "node:assert/strict";
import test from "node:test";

process.env.STORAGE_ENCRYPTION_KEY = "log-export-test-key-that-is-long-enough";
const secrets = await import("../src/lib/logExport/secrets.js");

test("log export destination secrets encrypt, decrypt and redact through the registry", () => {
  const config = { projectId: "demo", serviceAccountJson: "secret-json" };
  const encrypted = secrets.encryptDestinationConfig("bigquery", config);
  assert.match(String(encrypted.serviceAccountJson), /^enc:v1:/);
  assert.equal(secrets.decryptDestinationConfig("bigquery", encrypted).serviceAccountJson, "secret-json");
  assert.deepEqual(secrets.redactDestinationConfig("bigquery", encrypted), {
    projectId: "demo",
    serviceAccountJson: secrets.SECRET_PLACEHOLDER,
  });
  assert.equal(secrets.requiresEncryptionKey("bigquery", config), false);
});

test("placeholder edits preserve the stored ciphertext", () => {
  const stored = { projectId: "old", serviceAccountJson: "enc:v1:stored" };
  assert.deepEqual(
    secrets.mergeDestinationConfig("bigquery", stored, {
      projectId: "new",
      serviceAccountJson: secrets.SECRET_PLACEHOLDER,
    }),
    { projectId: "new", serviceAccountJson: "enc:v1:stored" }
  );
});
