/** CORS preflight response shared by the OpenAI-compatible audio endpoints. */
export function audioOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-api-key, anthropic-version, x-shiguangGateway-connection, X-ShiguangGateway-Lease-Owner, X-ShiguangGateway-Lease-Generation, x-internal-test, accept",
    },
  });
}

