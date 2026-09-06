export interface CliAgentInfo {
  id: string;
  name: string;
  binary: string;
  versionCommand: string;
  version: string | null;
  installed: boolean;
  providerAlias: string;
  spawnArgs: string[];
  protocol: "stdio" | "http";
  isCustom?: boolean;
}

export interface CustomAgentDef {
  id: string;
  name: string;
  binary: string;
  versionCommand: string;
  providerAlias: string;
  spawnArgs: string[];
  protocol: "stdio" | "http";
}

export declare function detectInstalledAgents(): CliAgentInfo[];
export declare function refreshAgentCache(): CliAgentInfo[];
export declare function resolveVersionProbe(binary: string, versionCommand: string, isCustom?: boolean): boolean;
export declare function setCustomAgents(agents: CustomAgentDef[]): void;
