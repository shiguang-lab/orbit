/** Legacy compatibility export; new consumers use @orbit/contracts/cors. */
import { CORS_HEADERS } from "@orbit/contracts/cors";
export { CORS_HEADERS };
export function handleCorsOptions(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
