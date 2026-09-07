import { CORS_HEADERS, handleCorsOptions } from "../common/cors.js";

const OLLAMA_COMPAT_VERSION = "0.6.4";

/** CORS preflight for the VSCode/Ollama compatibility version endpoint. */
export function OPTIONS(): Response {
  return handleCorsOptions();
}

/** GET /v1/vscode/:token/api/version. */
export function GET(): Response {
  return Response.json(
    { version: OLLAMA_COMPAT_VERSION },
    { headers: { ...CORS_HEADERS } },
  );
}
