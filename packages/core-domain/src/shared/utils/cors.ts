/** Legacy compatibility export; new consumers use @shiguang-gateway/contracts/cors. */
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
export { CORS_HEADERS };
export function handleCorsOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
