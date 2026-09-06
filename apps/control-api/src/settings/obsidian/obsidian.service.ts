import { Injectable } from "@nestjs/common";
import {
  clearObsidianToken,
  getObsidianBaseUrl,
  getObsidianConfig,
  setObsidianBaseUrl,
  setObsidianToken,
} from "@shiguang-gateway/core-domain/db/obsidian-config";
import { createObsidianClient } from "@shiguang-gateway/core-domain/integrations/obsidian-client";
import {
  disableObsidianVaultSync,
  enableObsidianVaultSync,
  getObsidianSyncStatus,
} from "@shiguang-gateway/core-domain/control/obsidian-sync";

@Injectable()
export class ObsidianSettingsService {
  getSettings() {
    const config = getObsidianConfig();
    return { connected: config.connected, hasToken: config.token !== null, baseUrl: config.baseUrl, vaultPath: config.vaultPath };
  }

  async connect(token: string, baseUrl?: string) {
    const urlToUse = baseUrl ?? getObsidianBaseUrl();
    if (urlToUse && /:27124(?:\/|$)/.test(urlToUse)) {
      return { status: 400, body: { error: "URL uses port 27124, which is the MCP endpoint (HTTPS, self-signed cert). The Obsidian Local REST API uses plain HTTP on port 27123. Please use http://<ip>:27123 instead.", connected: false } };
    }
    try {
      const result = await createObsidianClient(token, urlToUse).checkStatus() as Record<string, unknown>;
      if (result?.authenticated === false) return { status: 400, body: { error: "Token validation failed: invalid token", connected: false } };
      setObsidianToken(token);
      if (baseUrl) setObsidianBaseUrl(baseUrl);
      return { status: 200, body: { connected: true, message: "Obsidian API token saved and validated" } };
    } catch (error) {
      return { status: 400, body: { error, connected: false } };
    }
  }

  disconnect() { clearObsidianToken(); return { connected: false, message: "Obsidian integration disconnected" }; }

  getWebdavStatus() { return getObsidianSyncStatus(); }
  enableWebdav(vaultPath: string) { return enableObsidianVaultSync(vaultPath); }
  disableWebdav() { return disableObsidianVaultSync(); }
}
