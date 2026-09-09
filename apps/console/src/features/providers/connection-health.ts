import type { ProviderConnection } from "@/entities/api";

export type ConnectionHealth = "disabled" | "connected" | "warning" | "error";

export function getConnectionHealth(connection: ProviderConnection, now = Date.now()): ConnectionHealth {
  if (connection.isActive === false) return "disabled";

  const status = connection.testStatus ?? "unknown";
  if (status === "error" || status === "expired") return "error";
  if (status === "unavailable") {
    const cooldown = connection.rateLimitedUntil ? new Date(connection.rateLimitedUntil).getTime() : NaN;
    return Number.isFinite(cooldown) && cooldown > now ? "error" : "connected";
  }

  if (connection.lastErrorType || connection.errorCode || connection.lastError) return "warning";
  return status === "active" || status === "success" || status === "unknown" ? "connected" : "warning";
}

export function resolveOAuthRedirectUri(providerId: string, location: Pick<Location, "origin" | "port">): string {
  if (providerId === "codex" || providerId === "openai") {
    return "http://localhost:1455/auth/callback";
  }
  if (providerId === "xai-oauth") {
    return "http://127.0.0.1:56121/callback";
  }
  if (providerId === "grok-cli") {
    return "http://127.0.0.1:56122/callback";
  }
  if (providerId === "openference") {
    return "http://127.0.0.1:56123/callback";
  }
  if (providerId === "claude") {
    return "https://platform.claude.com/oauth/code/callback";
  }
  if (providerId === "agy" || providerId === "antigravity") {
    return `http://127.0.0.1:${location.port || "8787"}/callback`;
  }
  return `${location.origin}/callback`;
}

