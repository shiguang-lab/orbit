import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { getKimiWebBaseUrl } from "../config/kimiWebRuntime.js";
import { parseKimiJwt } from "../utils/kimiJwt.js";

export interface KimiRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAtSec?: number;
  error?: string;
}

export async function exchangeKimiRefreshToken(
  refreshToken: string,
  baseUrl?: string
): Promise<KimiRefreshResult> {
  const cleanRefresh = String(refreshToken ?? "").trim();
  if (!cleanRefresh) return { success: false, error: "No refresh_token provided" };

  const effectiveBaseUrl = (baseUrl || getKimiWebBaseUrl()).replace(/\/+$/, "");
  try {
    const response = await fetch(`${effectiveBaseUrl}/api/auth/token/refresh`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanRefresh}`,
        Accept: "application/json, text/plain, */*",
        Origin: effectiveBaseUrl,
        Referer: `${effectiveBaseUrl}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        success: false,
        error: `Kimi refresh returned HTTP ${response.status}: ${sanitizeErrorMessage(errorText)}`,
      };
    }
    const data = (await response.json()) as { access_token?: unknown; refresh_token?: unknown };
    if (typeof data.access_token !== "string" || !data.access_token) {
      return { success: false, error: "Invalid response from Kimi: missing access_token" };
    }
    const parsedJwt = parseKimiJwt(data.access_token);
    return {
      success: true,
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === "string" ? data.refresh_token : cleanRefresh,
      expiresAtSec: parsedJwt?.exp || Math.floor(Date.now() / 1000) + 900,
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error refreshing Kimi token: ${error instanceof Error ? error.message : "unknown"}`,
    };
  }
}
