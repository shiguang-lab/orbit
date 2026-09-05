/**
 * OAuth CLI Configuration
 *
 * Provides server credentials for OAuth CLI services to communicate
 * with the running ShiguangGateway server when saving tokens.
 */

import { getRuntimePorts } from "../../runtime/ports.ts";

interface ServerCredentials {
  server: string;
  token: string;
  userId: string;
}

function getDefaultApiServer() {
  const { dashboardPort } = getRuntimePorts();
  return `http://localhost:${dashboardPort}`;
}

/**
 * Get server credentials from environment variables.
 * Used by OAuth CLI services to save tokens to the running server.
 */
export function getServerCredentials(): ServerCredentials {
  return {
    server: process.env.SHIGUANG_GATEWAY_SERVER || process.env.SERVER_URL || getDefaultApiServer(),
    token: process.env.SHIGUANG_GATEWAY_TOKEN || process.env.CLI_TOKEN || "",
    userId: process.env.SHIGUANG_GATEWAY_USER_ID || process.env.CLI_USER_ID || "cli",
  };
}
