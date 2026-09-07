import { getDbInstance } from "@orbit/core/db/connection";

export interface PersistedIpFilterConfig {
  enabled: boolean;
  mode: string;
  blacklist: string[];
  whitelist: string[];
}

const DEFAULT_CONFIG: PersistedIpFilterConfig = {
  enabled: false,
  mode: "blacklist",
  blacklist: [],
  whitelist: [],
};

export function readIpFilterConfig(): PersistedIpFilterConfig {
  const row = getDbInstance()
    .prepare("SELECT value FROM key_value WHERE namespace = 'ipFilter' AND key = 'config'")
    .get() as { value?: string } | undefined;
  if (!row?.value) return { ...DEFAULT_CONFIG };
  try {
    const value = JSON.parse(row.value) as Partial<PersistedIpFilterConfig>;
    return {
      enabled: value.enabled === true,
      mode: typeof value.mode === "string" ? value.mode : DEFAULT_CONFIG.mode,
      blacklist: Array.isArray(value.blacklist) ? value.blacklist.filter((entry): entry is string => typeof entry === "string") : [],
      whitelist: Array.isArray(value.whitelist) ? value.whitelist.filter((entry): entry is string => typeof entry === "string") : [],
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeIpFilterConfig(config: PersistedIpFilterConfig): void {
  getDbInstance()
    .prepare("INSERT OR REPLACE INTO key_value (namespace, key, value) VALUES ('ipFilter', 'config', ?)")
    .run(JSON.stringify(config));
}
