import { Injectable } from "@nestjs/common";
import {
  clearNotionToken,
  getNotionConfig,
  setNotionToken,
} from "@shiguang-gateway/core-domain/control/notion-db";
import { createNotionClient } from "@shiguang-gateway/core-domain/integrations/notion-client";

@Injectable()
export class NotionSettingsService {
  getSettings() {
    const config = getNotionConfig();
    return { connected: config.connected, hasToken: config.token !== null };
  }

  async connect(token: string) {
    setNotionToken(token);
    try {
      const result = await createNotionClient(token).searchPagesAndDatabases("test", undefined, 1);
      if (result && typeof result === "object" && "object" in result && (result as Record<string, unknown>).object === "error") {
        clearNotionToken();
        return { status: 400, body: { error: "Token validation failed: invalid token", connected: false } };
      }
      return { status: 200, body: { connected: true, message: "Notion integration token saved and validated" } };
    } catch (error) {
      clearNotionToken();
      return { status: 400, body: { error, connected: false } };
    }
  }

  disconnect() {
    clearNotionToken();
    return { connected: false, message: "Notion integration disconnected" };
  }
}
