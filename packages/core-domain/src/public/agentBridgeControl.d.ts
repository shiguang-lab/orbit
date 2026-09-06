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
export interface AgentBridgeStore {
  getAllAgentBridgeStates(): AgentBridgeStateRow[];
  getUserBypassPatterns(): string[];
  getAllBypassPatterns(): AgentBridgeBypassRow[];
  getAgentBridgeState(agentId: string): AgentBridgeStateRow | null;
  upsertAgentBridgeState(row: Partial<AgentBridgeStateRow> & { agent_id: string }): void;
  getMappingsForAgent(agentId: string): AgentBridgeMappingRow[];
  setMappings(agentId: string, mappings: Array<{ source: string; target: string }>): void;
  syncAgentBridgeMappingsToMitmAlias(agentId: string): void;
}
export function configureAgentBridgeStore(store: AgentBridgeStore): void;
export function getAgentBridgeStore(): AgentBridgeStore;

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
export function repairMitm(sudoPassword: string): Promise<{ repaired: string[] }>;
export function startMitm(apiKey: string, sudoPassword: string, options?: { port?: number }): Promise<Record<string, unknown>>;
export function stopMitm(sudoPassword: string): Promise<Record<string, unknown>>;
export function addDNSEntry(sudoPassword: string, agentId?: string): Promise<void>;
export function removeDNSEntry(sudoPassword: string, agentId?: string): Promise<void>;
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
export function configureUpstreamCa(pemPath?: string): void;
export interface CaptureManagerStatus {
  running: boolean;
  available: boolean;
  startedAt?: string;
  interceptCount?: number;
  onPort?: number;
}
export interface StartCaptureModeOptions {
  cfg: Record<string, number>;
  installCa: (caPem: string) => Promise<void>;
  uninstallCa: () => Promise<void>;
}
export function startCaptureMode(options: StartCaptureModeOptions): Promise<CaptureManagerStatus>;
export function stopCaptureMode(): Promise<CaptureManagerStatus>;
export function getCaptureStatus(): CaptureManagerStatus;
export function installTproxyCa(caPem: string, sudoPassword?: string): Promise<void>;
export function uninstallTproxyCa(sudoPassword?: string): Promise<void>;
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
