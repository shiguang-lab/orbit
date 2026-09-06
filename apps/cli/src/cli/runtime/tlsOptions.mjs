import fs from "node:fs";

/**
 * Resolve the opt-in TLS certificate pair. Invalid configuration fails open to
 * the existing HTTP listener after emitting a warning.
 */
export function resolveTlsOptions(
  env = process.env,
  { readFileSync = fs.readFileSync, warn = (message) => console.warn(message) } = {}
) {
  const certPath =
    typeof env?.SHIGUANG_GATEWAY_TLS_CERT === "string"
      ? env.SHIGUANG_GATEWAY_TLS_CERT.trim()
      : "";
  const keyPath =
    typeof env?.SHIGUANG_GATEWAY_TLS_KEY === "string" ? env.SHIGUANG_GATEWAY_TLS_KEY.trim() : "";

  if (!certPath && !keyPath) return null;

  if (!certPath || !keyPath) {
    warn(
      `[shiguang-gateway][tls] HTTPS not enabled: both SHIGUANG_GATEWAY_TLS_CERT and ` +
        `SHIGUANG_GATEWAY_TLS_KEY are required (only ${certPath ? "cert" : "key"} provided). ` +
        `Serving HTTP.`
    );
    return null;
  }

  try {
    const cert = readFileSync(certPath);
    const key = readFileSync(keyPath);
    return { cert, key, certPath, keyPath };
  } catch (error) {
    warn(
      `[shiguang-gateway][tls] HTTPS not enabled: could not read TLS cert/key ` +
        `(${error?.code || error?.message || String(error)}). Serving HTTP.`
    );
    return null;
  }
}
