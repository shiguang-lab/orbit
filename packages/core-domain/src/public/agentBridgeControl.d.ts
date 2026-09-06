export interface AgentBridgeConfig {
  version: 1;
  bypassPatterns: string[];
  customHosts: Array<{ host: string; kind: "llm" | "app" | "custom"; label?: string | null }>;
  agentMappings: Record<string, Array<{ source: string; target: string }>>;
}
export interface AgentBridgeImportResult {
  bypassPatterns: number;
  customHosts: number;
  agents: number;
}
export function exportConfig(): AgentBridgeConfig;
export function importConfig(config: AgentBridgeConfig): AgentBridgeImportResult;
export const AgentBridgeConfigSchema: { safeParse(input: unknown): { success: boolean; data?: AgentBridgeConfig; error?: { issues: Array<{ message: string }> } } };
export const AgentBridgeBypassUpsertSchema: { safeParse(input: unknown): { success: boolean; data?: { patterns: string[] }; error?: { flatten(): unknown } } };
export const AgentBridgeMappingPutSchema: { safeParse(input: unknown): { success: boolean; data?: { mappings: Array<{ source: string; target: string }> }; error?: { flatten(): unknown } } };
export const AgentBridgeStateRowSchema: { safeParse(input: unknown): { success: boolean } };
export const AgentBridgeMappingRowSchema: { safeParse(input: unknown): { success: boolean } };
export const AgentBridgeBypassRowSchema: { safeParse(input: unknown): { success: boolean } };
export const AgentBridgeServerActionSchema: { safeParse(input: unknown): { success: boolean } };
export const AgentBridgeDnsActionSchema: { safeParse(input: unknown): { success: boolean } };
export const AgentBridgeUpstreamCaPostSchema: { safeParse(input: unknown): { success: boolean } };

export interface AgentBridgeStateRow {
  agent_id: string;
  dns_enabled: boolean;
  cert_trusted: boolean;
  setup_completed: boolean;
  last_started_at: string | null;
  last_error: string | null;
}
export interface AgentBridgeMappingRow {
  agent_id: string;
  source_model: string;
  target_model: string;
  updated_at: string;
}
export interface AgentBridgeBypassRow { pattern: string; source: "default" | "user"; created_at: string }
export function getAllBypassPatterns(): AgentBridgeBypassRow[];
export function getUserBypassPatterns(): string[];
export function replaceUserBypassPatterns(patterns: string[]): void;
export function getAllAgentBridgeStates(): AgentBridgeStateRow[];
export function getAgentBridgeState(agentId: string): AgentBridgeStateRow | null;
export function upsertAgentBridgeState(row: Partial<AgentBridgeStateRow> & { agent_id: string }): void;
export function getMappingsForAgent(agentId: string): AgentBridgeMappingRow[];
export function setMappings(agentId: string, mappings: Array<{ source: string; target: string }>): void;
export function syncAgentBridgeMappingsToMitmAlias(agentId: string): void;

export interface MitmTarget { id: string; name: string; hosts: string[]; viability?: string; [key: string]: unknown }
export const ALL_TARGETS: MitmTarget[];
export function resolveTarget(id: string): MitmTarget | undefined;
export interface AgentDetection { installed: boolean; version?: string; path?: string; [key: string]: unknown }
export function detectAgent(id: string): AgentDetection;
export interface TrafficBuffer { list(filters?: Record<string, unknown>): any[]; clear(): void }
export const globalTrafficBuffer: TrafficBuffer;
export interface MitmStatus { running: boolean; dnsConfigured?: boolean; [key: string]: unknown }
export function getMitmStatus(agentId?: string): Promise<MitmStatus>;
export function getAllAgentsStatus(): Array<Record<string, unknown>>;
export function getCachedPassword(): string | null;
export function setCachedPassword(password: string | null | undefined): void;
export function checkCertInstalled(certPath: string): Promise<boolean>;
export function resolveMitmDataDir(): string;
export interface DiagnosticCheck { name: string; ok: boolean; hint: string | null }
export interface DiagnosticReport { healthy: boolean; checks: DiagnosticCheck[] }
export function summarizeDiagnostics(input: {
  serverRunning: boolean;
  serverReachable: boolean;
  certExists: boolean;
  certTrusted: boolean;
  dnsConfigured: boolean;
}): DiagnosticReport;
export function checkDNSEntryForAgent(agentId?: string): boolean;
export function isSudoPasswordRequired(): boolean;
export function generateCert(options?: { force?: boolean }): Promise<{ key: string; cert: string }>;
export interface CertInstallResult {
  installed: boolean;
  skipped?: boolean;
  reason?: string;
  message?: string;
  manualGuide?: unknown;
}
export function installCertResult(sudoPassword: string, certPath: string): Promise<CertInstallResult>;
export function uninstallCert(sudoPassword: string, certPath: string): Promise<void>;
export function normalizeMitmSudoPasswordInput(value?: string | null): string;
export function resolveMitmSudoPassword(bodyPassword?: string, cachedPassword?: string | null): string;
export function isMitmSudoPasswordRequired(sudoPassword: string): boolean;
