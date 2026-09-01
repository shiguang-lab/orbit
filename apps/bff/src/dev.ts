/**
 * Local development entrypoint.
 *
 * The Vite admin and BFF must share the broker settings; otherwise the admin
 * session succeeds in Vite while management requests receive 401 from the BFF.
 */
try {
  process.loadEnvFile(new URL("../../admin/.env.local", import.meta.url));
} catch (error) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code !== "ENOENT") throw error;
}

process.env.NODE_ENV ??= "development";
// Local development should work out of the box. Real SSO broker mode is
// opt-in; when it is not requested, use the BFF's loopback-only dev identity.
if (process.env.SG_LOCAL_BROKER_ENABLED !== "true" && !process.env.SG_DEV_IDENTITY) {
  process.env.SG_DEV_IDENTITY = "1";
}

await import("./index.js");
