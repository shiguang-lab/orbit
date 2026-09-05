/** Transport-neutral CORS headers shared by HTTP applications and handlers. */
export const CORS_HEADERS: Readonly<Record<string, string>> = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, anthropic-version, x-shiguangGateway-connection, X-ShiguangGateway-Lease-Owner, X-ShiguangGateway-Lease-Generation, x-internal-test, accept",
};
