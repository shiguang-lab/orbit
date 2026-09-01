import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Divider,
  Empty,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Segmented,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { providersApi, settingsApi, type ProviderCatalogEntry, type ProviderConnection } from "@/entities/api";
import { useI18n } from "@/i18n";
import AntigravityColorIcon from "@lobehub/icons/es/Antigravity/components/Color";
import AwsColorIcon from "@lobehub/icons/es/Aws/components/Color";
import ClineMonoIcon from "@lobehub/icons/es/Cline/components/Mono";
import QoderColorIcon from "@lobehub/icons/es/Qoder/components/Color";
import TencentColorIcon from "@lobehub/icons/es/Tencent/components/Color";

const useStyles = createStyles(({ token }) => ({
  // Orbit's dashboard is fluid (capped only by the shell at very wide
  // viewports). A local max-width here made the detail page visibly narrower
  // than the Providers list and the official page.
  page: {
    width: "100%",
    maxWidth: "none",
    margin: 0,
    paddingBottom: 24,
    "& .ant-tag": { display: "inline-flex", alignItems: "center" },
    "& .ant-tag > .material-symbols-outlined": { flex: "none" },
    "& .ant-tag > .material-symbols-outlined + span": { marginInlineStart: 4 },
  },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 8 },
  title: { margin: 0, letterSpacing: "-0.02em" },
  titleLink: { color: "inherit", display: "inline-flex", alignItems: "center", gap: 6 },
  headerIcon: { width: 48, height: 48, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "none", position: "relative" },
  headerIconImage: { width: 42, height: 42, objectFit: "contain" as const, position: "relative" as const, zIndex: 1 },
  headerBody: { minWidth: 0, flex: 1 },
  headerMeta: { display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 8, marginTop: 2 },
  muted: { color: token.colorTextSecondary },
  section: { marginBottom: 0 },
  protocol: { borderLeft: `3px solid ${token.colorPrimary}` },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  connectionRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, width: "100%", minWidth: 0 },
  connectionToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", flexWrap: "wrap" as const, marginBottom: 16 },
  connectionToolbarFilters: { display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 12, minWidth: 0 },
  bulkActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" as const, gap: 8, marginInlineStart: "auto" },
  bulkActionButton: { minHeight: 32, paddingInline: 12, fontWeight: 500 },
  cardTitleRow: { display: "inline-flex", alignItems: "center", gap: 8 },
  providerProxyButton: { minHeight: 28, paddingInline: 10, fontSize: 13, fontWeight: 500 },
  headerActionButton: { height: 32 },
  connectionIdentity: { width: 220, minWidth: 220 },
  connectionNameRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, lineHeight: "22px" },
  connectionNameIcon: { flex: "none" },
  connectionDivider: { height: 32, marginInline: 0, borderInlineStartColor: token.colorBorderSecondary },
  connectionFeatures: { flex: "1 1 280px", minWidth: 240 },
  connectionActions: { flex: "0 1 auto", marginInlineStart: "auto", justifyContent: "flex-end" },
  actionButton: { minHeight: 28, paddingInline: 10, fontSize: 13, fontWeight: 500 },
  statusTag: { minHeight: 28, marginInlineEnd: 0, paddingInline: 10, justifyContent: "center", borderColor: "currentColor", fontSize: 13, fontWeight: 500 },
}));

type DetailKind = "compatible" | "search" | "webfetch" | "upstream-proxy" | "no-auth" | "oauth" | "web-cookie" | "ide" | "standard";

type HeaderProviderIcon = ComponentType<{ size?: number | string; style?: React.CSSProperties; "aria-label"?: string }>;
const HEADER_ICON_ALIASES: Record<string, string> = {
  "amazon-q": "aws",
  antigravity: "antigravity",
  agy: "antigravity",
  "antigravity-cli": "antigravity",
  clinepass: "cline",
  "codebuddy-cn": "tencent",
  qoder: "qoder",
};
const HEADER_LOBE_ICONS: Record<string, HeaderProviderIcon> = {
  antigravity: AntigravityColorIcon,
  aws: AwsColorIcon,
  cline: ClineMonoIcon,
  qoder: QoderColorIcon,
  tencent: TencentColorIcon,
};
const DEVICE_CODE_PROVIDERS = new Set(["github", "kiro", "amazon-q", "kimi-coding", "kilocode", "codebuddy-cn", "ghe-copilot", "grok-cli"]);
const ROUTING_STRATEGIES = ["fill-first", "round-robin", "priority", "p2c", "random", "least-used"];

function resolveProvider(catalog: { categories?: Array<{ key: string; providers: ProviderCatalogEntry[] }> } | undefined, id: string) {
  for (const category of catalog?.categories ?? []) {
    const found = category.providers.find((provider) => provider.id === id);
    if (found) return { ...found, category: category.key };
  }
  return null;
}

function classify(providerId: string, info: (ProviderCatalogEntry & { category: string }) | null): DetailKind {
  if (providerId.startsWith("openai-compatible-") || providerId.startsWith("anthropic-compatible-")) return "compatible";
  const serviceKinds = info?.serviceKinds ?? [];
  if (serviceKinds.includes("webFetch") && !serviceKinds.some((item) => ["llm", "image", "video", "audio", "embedding", "rerank"].includes(item))) return "webfetch";
  if (serviceKinds.includes("webSearch") && !serviceKinds.some((item) => ["llm", "image", "video", "audio", "embedding", "rerank"].includes(item))) return "search";
  if (info?.category === "upstream-proxy") return "upstream-proxy";
  if (info?.category === "no-auth") return "no-auth";
  if (info?.category === "oauth") return info.isIde ? "ide" : "oauth";
  if (info?.category === "web-cookie") return "web-cookie";
  if (info?.category === "search") return (info.serviceKinds ?? []).includes("webFetch") ? "webfetch" : "search";
  if (info?.isIde) return "ide";
  return "standard";
}

function connectionStatus(connection: ProviderConnection, t: (key: string) => string, className?: string) {
  if (connection.isActive === false) return <Tag className={className}>{t("providers.statusDisabled")}</Tag>;
  if (connection.testStatus === "error" || connection.lastError) return <Tag className={className} color="error">{t("providers.statusError")}</Tag>;
  if (connection.testStatus === "active" || connection.testStatus === "success") return <Tag className={className} color="success">{t("providers.statusConnected")}</Tag>;
  return <Tag className={className} color="processing">{t("providers.statusUntested")}</Tag>;
}

function maskAccountName(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw || !raw.includes("@")) return raw;
  const at = raw.lastIndexOf("@");
  const user = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  if (user.length <= 3) return raw;
  const maskedUser = `${user.slice(0, 3)}${"*".repeat(user.length - 3)}`;
  const maskedDomain = domain.length <= 3 ? domain : `${"*".repeat(domain.length - 3)}${domain.slice(-3)}`;
  return `${maskedUser}@${maskedDomain}`;
}

type ProviderModelRow = Record<string, unknown> & { id?: unknown; name?: unknown; source?: unknown };

function mergeProviderModelRows(
  registryModels: ProviderModelRow[],
  syncedModels: ProviderModelRow[],
  metadata: { models?: ProviderModelRow[]; customModels?: ProviderModelRow[]; source?: string },
): ProviderModelRow[] {
  const merged = new Map<string, ProviderModelRow>();
  for (const model of registryModels) {
    const id = String(model.id ?? "").trim();
    if (id) merged.set(id, { ...model, id, name: model.name || id, source: "system" });
  }
  for (const model of syncedModels) {
    const id = String(model.id ?? "").trim();
    if (id && !merged.has(id)) merged.set(id, { ...model, id, name: model.name || id, source: "imported" });
  }

  // Orbit's /provider-models route returns user-managed rows in `models`.
  // The local engine adapter instead labels its `models` projection as synced
  // or catalog data, so only its explicit customModels belong in this layer.
  const metadataModels = metadata.source === "synced" || metadata.source === "catalog" ? [] : metadata.models ?? [];
  for (const model of [...metadataModels, ...(metadata.customModels ?? [])]) {
    const id = String(model.id ?? "").trim();
    if (!id) continue;
    const source = model.source === "imported" ? "imported" : "custom";
    merged.set(id, { ...model, id, name: model.name || id, source });
  }
  return [...merged.values()];
}

export default function ProviderDetailPage() {
  const { styles } = useStyles();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id: providerId = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modelId, setModelId] = useState("");
  const [modelName, setModelName] = useState("");
  const [playgroundUrl, setPlaygroundUrl] = useState("https://example.com");
  const [playgroundFormat, setPlaygroundFormat] = useState("markdown");
  const [playgroundDepth, setPlaygroundDepth] = useState("0");
  const [playgroundResult, setPlaygroundResult] = useState<string | null>(null);
  const [filtersText, setFiltersText] = useState("");
  const [interceptionText, setInterceptionText] = useState("");
  const [chatModel, setChatModel] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatOutput, setChatOutput] = useState<string | null>(null);
  const [oauthOpen, setOauthOpen] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState("");
  const [oauthSession, setOauthSession] = useState<{ redirectUri: string; codeVerifier?: string } | null>(null);
  const [oauthDevice, setOauthDevice] = useState<{ deviceCode: string; verificationUrl: string; codeVerifier?: string; interval: number } | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "active" | "error" | "disabled" | "banned" | "exhausted">("all");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [modelFilter, setModelFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [routingStrategy, setRoutingStrategy] = useState("");
  const [stickyLimit, setStickyLimit] = useState(3);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [noAuthEnabled, setNoAuthEnabled] = useState(true);
  const [noAuthBusy, setNoAuthBusy] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [connectionName, setConnectionName] = useState("");
  const [connectionApiKey, setConnectionApiKey] = useState("");
  const [connectionBaseUrl, setConnectionBaseUrl] = useState("");
  const [connectionPriority, setConnectionPriority] = useState(1);
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [proxyTarget, setProxyTarget] = useState<{ scope: "account" | "provider"; id: string; label: string } | null>(null);
  const [proxyOptions, setProxyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [proxySelection, setProxySelection] = useState<string>("");
  const [proxyBusy, setProxyBusy] = useState(false);

  const catalogQuery = useQuery({ queryKey: ["providers", "catalog"], queryFn: providersApi.catalog, staleTime: 300_000 });
  const providerQuery = useQuery({ queryKey: ["providers", "detail", providerId], queryFn: () => providersApi.list({ provider: providerId }), enabled: Boolean(providerId) });
  const connectionIds = (providerQuery.data?.connections ?? []).map((connection) => connection.id).sort();
  const modelsQuery = useQuery({
    queryKey: ["providers", "provider-models", providerId, connectionIds],
    queryFn: async () => {
      const [metadata, registry, synced] = await Promise.all([
        providersApi.providerModels(providerId).catch(() => ({ models: [], customModels: [], hiddenModelsByProvider: {} })),
        providersApi.catalogModels(providerId),
        providersApi.syncedModels(providerId).catch(() => ({ models: [] })),
      ]);
      return {
        ...metadata,
        models: mergeProviderModelRows(registry.models, synced.models, metadata),
        customModels: [],
        source: "merged",
      };
    },
    enabled: Boolean(providerId) && providerQuery.isSuccess,
  });
  const filtersQuery = useQuery({ queryKey: ["providers", providerId, "param-filters"], queryFn: () => providersApi.paramFilters(providerId), enabled: Boolean(providerId) });
  const interceptionQuery = useQuery({ queryKey: ["providers", providerId, "interception-rules"], queryFn: () => providersApi.interceptionRules(providerId), enabled: Boolean(providerId) });
  const nodesQuery = useQuery({ queryKey: ["provider-nodes"], queryFn: providersApi.listNodes, staleTime: 30_000 });

  const info = useMemo(() => resolveProvider(catalogQuery.data, providerId), [catalogQuery.data, providerId]);
  const kind = classify(providerId, info);
  const connections = providerQuery.data?.connections ?? [];
  const settingsQuery = useQuery({ queryKey: ["settings", "provider-routing"], queryFn: settingsApi.get, staleTime: 30_000, enabled: connections.length > 1 || kind === "no-auth" });
  const proxyConfigQuery = useQuery({ queryKey: ["settings", "proxy"], queryFn: () => settingsApi.proxyConfig(), staleTime: 30_000, enabled: Boolean(providerId) });
  const node = nodesQuery.data?.nodes.find((item) => item.id === providerId);
  const providerProxy = (proxyConfigQuery.data as Record<string, unknown> | undefined)?.providers as Record<string, { host?: string; name?: string }> | undefined;
  const providerProxyHost = providerProxy?.[providerId]?.host;
  const headerIconId = (HEADER_ICON_ALIASES[providerId.toLowerCase()] ?? info?.icon ?? providerId).toLowerCase();
  const HeaderIcon = HEADER_LOBE_ICONS[headerIconId];
  const visibleConnections = useMemo(() => {
    const query = accountSearch.trim().toLocaleLowerCase();
    return connections.filter((connection) => {
      const matchesQuery = !query || [connection.name, connection.id, connection.authType].some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
      const isError = connection.testStatus === "error" || Boolean(connection.lastError);
      const matchesHealth = healthFilter === "all" || (healthFilter === "active" && connection.isActive !== false && !isError) || (healthFilter === "error" && isError) || (healthFilter === "disabled" && connection.isActive === false) || (healthFilter === "banned" && connection.testStatus === "banned") || (healthFilter === "exhausted" && connection.testStatus === "credits_exhausted");
      return matchesQuery && matchesHealth;
    });
  }, [accountSearch, connections, healthFilter]);
  const hiddenModelsByProvider = modelsQuery.data?.hiddenModelsByProvider as Record<string, string[]> | undefined;
  const hiddenModelIds = useMemo(() => new Set(hiddenModelsByProvider?.[providerId] ?? []), [hiddenModelsByProvider, providerId]);
  useEffect(() => {
    const overrides = settingsQuery.data?.providerStrategies as Record<string, { fallbackStrategy?: string; stickyRoundRobinLimit?: number }> | undefined;
    const override = overrides?.[providerId];
    setRoutingStrategy(override?.fallbackStrategy ?? "");
    setStickyLimit(Math.min(10, Math.max(1, Number(override?.stickyRoundRobinLimit ?? 3))));
  }, [providerId, settingsQuery.data]);
  useEffect(() => {
    const blocked = settingsQuery.data?.blockedProviders;
    setNoAuthEnabled(!(Array.isArray(blocked) && blocked.includes(providerId)));
  }, [providerId, settingsQuery.data]);

  const startOAuth = useCallback(async () => {
    setOauthBusy(true);
    setOauthError(null);
    setOauthCallbackUrl("");
    setOauthDevice(null);
    try {
      const port = window.location.port || "20128";
      if (DEVICE_CODE_PROVIDERS.has(providerId)) {
        const response = await fetch(`/api/oauth/${encodeURIComponent(providerId)}/device-code`);
        const payload = await response.json().catch(() => ({})) as { device_code?: string; verification_uri?: string; verification_uri_complete?: string; codeVerifier?: string; interval?: number; error?: string };
        if (!response.ok || !payload.device_code) throw new Error(payload.error || "无法启动设备授权流程");
        const verificationUrl = payload.verification_uri_complete || payload.verification_uri;
        if (!verificationUrl) throw new Error("授权服务没有返回验证地址");
        setOauthSession({ redirectUri: "", codeVerifier: payload.codeVerifier });
        setOauthDevice({ deviceCode: payload.device_code, verificationUrl, codeVerifier: payload.codeVerifier, interval: Math.max(3, payload.interval || 5) });
        setOauthOpen(true);
        window.open(verificationUrl, "omniroute-oauth", "width=600,height=720");
        return;
      }
      const isGoogleLoopback = providerId === "agy" || providerId === "antigravity";
      const redirectUri = isGoogleLoopback
        ? `http://127.0.0.1:${port}/callback`
        : `${window.location.origin}/callback`;
      const response = await fetch(`/api/oauth/${encodeURIComponent(providerId)}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const payload = await response.json().catch(() => ({})) as { authUrl?: string; redirectUri?: string; codeVerifier?: string; error?: string };
      if (!response.ok || !payload.authUrl) throw new Error(payload.error || "无法启动授权流程");
      setOauthSession({ redirectUri: payload.redirectUri || redirectUri, codeVerifier: payload.codeVerifier });
      setOauthOpen(true);
      window.open(payload.authUrl, "omniroute-oauth", "width=600,height=720");
    } catch (error) {
      const message = error instanceof Error ? error.message : "无法启动授权流程";
      setOauthError(message);
      messageApi.error(message);
    } finally {
      setOauthBusy(false);
    }
  }, [messageApi, providerId]);

  const completeOAuth = useCallback(async (callbackValue = oauthCallbackUrl) => {
    const raw = callbackValue.trim();
    if (!raw || !oauthSession) return;
    setOauthBusy(true);
    setOauthError(null);
    try {
      let code = raw;
      let state: string | undefined;
      try {
        const parsed = new URL(raw);
        code = parsed.searchParams.get("code") || raw;
        state = parsed.searchParams.get("state") || undefined;
      } catch {
        // Accept a pasted authorization code as well as the full callback URL.
      }
      if (!code) throw new Error("回调地址中没有授权码");
      const response = await fetch(`/api/oauth/${encodeURIComponent(providerId)}/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state, redirectUri: oauthSession.redirectUri, codeVerifier: oauthSession.codeVerifier }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : payload.error?.message || "授权交换失败");
      await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      setOauthOpen(false);
      setOauthSession(null);
      messageApi.success("授权连接已添加");
    } catch (error) {
      setOauthError(error instanceof Error ? error.message : "授权交换失败");
    } finally {
      setOauthBusy(false);
    }
  }, [messageApi, oauthCallbackUrl, oauthSession, providerId, queryClient]);

  useEffect(() => {
    if (!oauthOpen || !oauthSession) return;
    const handleCallback = (value: unknown) => {
      const data = value && typeof value === "object" ? value as { code?: string; fullUrl?: string; error?: string } : {};
      if (data.error) {
        setOauthError(data.error);
        return;
      }
      const callback = data.fullUrl || data.code;
      if (callback) void completeOAuth(callback);
    };
    const handleMessage = (event: MessageEvent) => {
      const eventUrl = (() => { try { return new URL(event.origin); } catch { return null; } })();
      const samePortLoopback = Boolean(eventUrl && /^(localhost|127\.0\.0\.1)$/.test(eventUrl.hostname) && eventUrl.port === window.location.port);
      if (event.origin !== window.location.origin && !samePortLoopback) return;
      if (event.data?.type === "oauth_callback") handleCallback(event.data.data);
    };
    window.addEventListener("message", handleMessage);
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("oauth_callback");
      channel.onmessage = (event) => handleCallback(event.data);
    } catch { /* BroadcastChannel is optional. */ }
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "oauth_callback" || !event.newValue) return;
      try { handleCallback(JSON.parse(event.newValue)); localStorage.removeItem("oauth_callback"); } catch { /* Ignore malformed relay data. */ }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
      channel?.close();
    };
  }, [completeOAuth, oauthOpen, oauthSession]);

  useEffect(() => {
    if (!oauthOpen || !oauthDevice) return;
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/oauth/${encodeURIComponent(providerId)}/poll`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceCode: oauthDevice.deviceCode, codeVerifier: oauthDevice.codeVerifier }),
        });
        const payload = await response.json().catch(() => ({})) as { success?: boolean; pending?: boolean; error?: string; errorDescription?: string };
        if (!active) return;
        if (payload.success) {
          await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
          await queryClient.invalidateQueries({ queryKey: ["providers"] });
          setOauthDevice(null);
          setOauthSession(null);
          setOauthOpen(false);
          messageApi.success("授权连接已添加");
        } else if (!payload.pending && payload.error && payload.error !== "authorization_pending" && payload.error !== "slow_down") {
          setOauthError(payload.errorDescription || payload.error);
          setOauthDevice(null);
        }
      } catch (error) {
        if (active) setOauthError(error instanceof Error ? error.message : "设备授权轮询失败");
      }
    };
    const timer = window.setInterval(() => void poll(), oauthDevice.interval * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [messageApi, oauthDevice, oauthOpen, providerId, queryClient]);

  const openAddConnection = useCallback(() => {
    if (kind === "oauth" || kind === "ide" || kind === "web-cookie") {
      void startOAuth();
      return;
    }
    setConnectionName(`${info?.name ?? providerId} Primary`);
    setConnectionApiKey("");
    setConnectionBaseUrl(node?.baseUrl ?? info?.baseUrl ?? "");
    setConnectionPriority(1);
    setAddConnectionOpen(true);
  }, [info?.baseUrl, info?.name, kind, node?.baseUrl, providerId, startOAuth]);

  const createConnectionMutation = useMutation({
    mutationFn: () => providersApi.create({
      provider: providerId,
      name: connectionName.trim() || `${info?.name ?? providerId} Primary`,
      apiKey: connectionApiKey.trim() || undefined,
      baseUrl: connectionBaseUrl.trim() || undefined,
      authType: kind === "compatible" ? "compatible" : "apikey",
      priority: connectionPriority,
      isActive: false,
      testStatus: "unknown",
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      setAddConnectionOpen(false);
      messageApi.success("连接已添加，请测试通过后启用");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "连接添加失败"),
  });

  const testMutation = useMutation({
    mutationFn: (connectionId: string) => providersApi.test(connectionId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      messageApi[result.valid ? "success" : "error"](result.valid ? "连接测试通过" : result.error || "连接测试失败");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "测试失败"),
  });
  const batchTestMutation = useMutation({
    mutationFn: (connectionIds?: string[]) => providersApi.testBatch("selected", providerId, connectionIds),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      messageApi[result.summary.failed > 0 ? "warning" : "success"](`测试完成：${result.summary.passed}/${result.summary.total} 个连接可用`);
      setSelectedConnectionIds([]);
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "批量测试失败"),
  });
  const batchStatusMutation = useMutation({
    mutationFn: (isActive: boolean) => providersApi.batchUpdate(selectedConnectionIds, isActive),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); setSelectedConnectionIds([]); messageApi.success("连接状态已更新"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "批量更新失败"),
  });
  const batchDeleteMutation = useMutation({
    mutationFn: () => providersApi.batchRemove(selectedConnectionIds),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); void queryClient.invalidateQueries({ queryKey: ["providers"] }); setSelectedConnectionIds([]); messageApi.success("连接已删除"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "批量删除失败"),
  });
  const syncModelsMutation = useMutation({
    mutationFn: () => {
      const connectionId = connections.find((connection) => connection.isActive !== false)?.id ?? connections[0]?.id;
      if (!connectionId) throw new Error("请先添加连接");
      return providersApi.syncModels(connectionId);
    },
    onSuccess: (result) => { void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] }); messageApi.success(`模型同步完成（${String(result.availableModelsCount ?? result.syncedModels ?? 0)} 个）`); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "模型同步失败"),
  });
  const visibilityMutation = useMutation({
    mutationFn: ({ modelId, isHidden }: { modelId: string; isHidden: boolean }) => providersApi.setModelVisibility(providerId, [modelId], isHidden),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] }); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "模型可见性更新失败"),
  });
  const saveRouting = useCallback(async (strategy: string, nextStickyLimit: number) => {
    setRoutingBusy(true);
    try {
      const current = await settingsApi.get();
      const providerStrategies = { ...((current.providerStrategies ?? {}) as Record<string, unknown>) };
      if (!strategy) delete providerStrategies[providerId];
      else providerStrategies[providerId] = { fallbackStrategy: strategy, ...(strategy === "round-robin" ? { stickyRoundRobinLimit: Math.min(10, Math.max(1, nextStickyLimit)) } : {}) };
      await settingsApi.patch({ providerStrategies });
      await queryClient.invalidateQueries({ queryKey: ["settings", "provider-routing"] });
      messageApi.success("账号路由策略已保存");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "账号路由策略保存失败");
    } finally {
      setRoutingBusy(false);
    }
  }, [messageApi, providerId, queryClient]);
  const toggleNoAuth = useCallback(async (enabled: boolean) => {
    const previous = noAuthEnabled;
    setNoAuthEnabled(enabled);
    setNoAuthBusy(true);
    try {
      const current = await settingsApi.get();
      const blocked = new Set(Array.isArray(current.blockedProviders) ? current.blockedProviders.filter((value): value is string => typeof value === "string") : []);
      if (enabled) blocked.delete(providerId); else blocked.add(providerId);
      await settingsApi.patch({ blockedProviders: [...blocked] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "provider-routing"] });
      messageApi.success(enabled ? "提供者已启用" : "提供者已停用");
    } catch (error) {
      setNoAuthEnabled(previous);
      messageApi.error(error instanceof Error ? error.message : "提供者状态保存失败");
    } finally {
      setNoAuthBusy(false);
    }
  }, [messageApi, noAuthEnabled, providerId, queryClient]);
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => providersApi.update(id, { isActive }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); void queryClient.invalidateQueries({ queryKey: ["providers"] }); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "状态更新失败"),
  });
  const featureMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => providersApi.update(id, patch),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); void queryClient.invalidateQueries({ queryKey: ["providers"] }); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "连接设置更新失败"),
  });
  const rateLimitMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => providersApi.setRateLimitProtection(id, enabled),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "限流保护更新失败"),
  });
  const refreshTokenMutation = useMutation({
    mutationFn: (row: ProviderConnection) => row.provider === "cursor" ? providersApi.refreshCursor(row.id) : providersApi.refresh(row.id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); messageApi.success("令牌已刷新"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "令牌刷新失败"),
  });
  const distributeProxyMutation = useMutation({
    mutationFn: async () => {
      const proxyData = await settingsApi.proxies();
      const activeProxies = (proxyData.items ?? []).filter((item) => item.status === "active");
      if (activeProxies.length === 0) throw new Error("没有可用代理，请先在系统代理设置中添加代理");
      const ordered = [...connections].sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0));
      for (let index = 0; index < ordered.length; index += 1) {
        const row = ordered[index];
        await settingsApi.assignProxy("account", row.id, activeProxies[index % activeProxies.length].id);
        await providersApi.update(row.id, { proxyEnabled: true, perKeyProxyEnabled: true });
      }
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); await queryClient.invalidateQueries({ queryKey: ["settings", "proxy"] }); messageApi.success("代理已分配到所有连接"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "代理分配失败"),
  });
  const openProxyConfig = useCallback(async (row: ProviderConnection) => {
    setProxyTarget({ scope: "account", id: row.id, label: maskAccountName(row.name) });
    setProxyBusy(true);
    try {
      const [list, current] = await Promise.all([settingsApi.proxies(), settingsApi.resolveProxy(row.id)]);
      setProxyOptions((list.items ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name || item.host || item.id })));
      setProxySelection(current.proxy?.id ?? "");
      setProxyModalOpen(true);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "代理配置读取失败");
    } finally {
      setProxyBusy(false);
    }
  }, [messageApi]);
  const openProviderProxyConfig = useCallback(async () => {
    setProxyTarget({ scope: "provider", id: providerId, label: info?.name ?? providerId });
    setProxyBusy(true);
    try {
      const [list, assignments] = await Promise.all([
        settingsApi.proxies(),
        settingsApi.proxyAssignments("provider", providerId),
      ]);
      setProxyOptions((list.items ?? []).filter((item) => item.status === "active").map((item) => ({ value: item.id, label: item.name || item.host || item.id })));
      setProxySelection(assignments.items?.[0]?.proxyId ?? "");
      setProxyModalOpen(true);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Provider 代理配置读取失败");
    } finally {
      setProxyBusy(false);
    }
  }, [info?.name, messageApi, providerId]);
  const saveProxyConfig = useCallback(async () => {
    if (!proxyTarget) return;
    setProxyBusy(true);
    try {
      await settingsApi.assignProxy(proxyTarget.scope, proxyTarget.id, proxySelection || null);
      if (proxyTarget.scope === "account") {
        await providersApi.update(proxyTarget.id, { proxyEnabled: Boolean(proxySelection), perKeyProxyEnabled: Boolean(proxySelection) });
        await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      }
      await queryClient.invalidateQueries({ queryKey: ["settings", "proxy"] });
      setProxyModalOpen(false);
      messageApi.success(proxySelection ? "代理已绑定" : "代理已解除");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "代理配置保存失败");
    } finally {
      setProxyBusy(false);
    }
  }, [messageApi, providerId, proxySelection, proxyTarget, queryClient]);
  const toggleConnectionAutoSync = useCallback((row: ProviderConnection) => {
    const providerSpecificData = (row.providerSpecificData && typeof row.providerSpecificData === "object" ? row.providerSpecificData : {}) as Record<string, unknown>;
    featureMutation.mutate({ id: row.id, patch: { providerSpecificData: { ...providerSpecificData, autoSync: !Boolean(providerSpecificData.autoSync) } } });
  }, [featureMutation]);
  const deleteMutation = useMutation({
    mutationFn: (id: string) => providersApi.remove(id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] }); void queryClient.invalidateQueries({ queryKey: ["providers"] }); messageApi.success("连接已删除"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "删除失败"),
  });
  const modelMutation = useMutation({
    mutationFn: async ({ action, id, name }: { action: "add" | "remove"; id: string; name?: string }) => {
      const connectionId = connections[0]?.id;
      if (!connectionId) throw new Error("请先添加连接后再管理模型");
      if (action === "add") return providersApi.addModel(connectionId, id, name);
      await providersApi.removeModel(connectionId, id);
      return { model: {} };
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] }); setModelId(""); setModelName(""); messageApi.success("模型配置已更新"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "模型操作失败"),
  });
  const saveConfigMutation = useMutation({
    mutationFn: ({ type, text }: { type: "filters" | "interception"; text: string }) => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("配置必须是有效 JSON"); }
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("配置必须是 JSON 对象");
      return type === "filters" ? providersApi.updateParamFilters(providerId, parsed as Record<string, unknown>) : providersApi.updateInterceptionRules(providerId, parsed as Record<string, unknown>);
    },
    onSuccess: (_value, variables) => { void queryClient.invalidateQueries({ queryKey: ["providers", providerId, variables.type === "filters" ? "param-filters" : "interception-rules"] }); messageApi.success("配置已保存"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "配置保存失败"),
  });
  const playgroundMutation = useMutation({
    mutationFn: () => providersApi.webFetch({ url: playgroundUrl, provider: providerId, format: playgroundFormat, depth: Number(playgroundDepth) }),
    onSuccess: (result) => setPlaygroundResult(JSON.stringify(result, null, 2)),
    onError: (error) => setPlaygroundResult(error instanceof Error ? error.message : "网页抓取失败"),
  });
  const chatMutation = useMutation({
    mutationFn: () => {
      if (!chatModel || !chatInput.trim()) throw new Error("请选择模型并输入消息");
      const qualifiedModel = chatModel.includes("/") ? chatModel : `${providerId}/${chatModel}`;
      return providersApi.chat({ model: qualifiedModel, messages: [{ role: "user", content: chatInput.trim() }] });
    },
    onSuccess: (result) => {
      const choices = Array.isArray(result.choices) ? result.choices : [];
      const first = choices[0] as Record<string, unknown> | undefined;
      const message = first?.message as Record<string, unknown> | undefined;
      setChatOutput(typeof message?.content === "string" ? message.content : JSON.stringify(result, null, 2));
      setChatInput("");
    },
    onError: (error) => setChatOutput(error instanceof Error ? error.message : "请求失败"),
  });

  const filtersValue = filtersQuery.data ? JSON.stringify(filtersQuery.data, null, 2) : filtersText;
  const interceptionValue = interceptionQuery.data ? JSON.stringify(interceptionQuery.data, null, 2) : interceptionText;
  if (providerQuery.isLoading || catalogQuery.isLoading) return <PageSkeleton />;
  if (providerQuery.isError || catalogQuery.isError) return <Alert type="error" showIcon title="Provider 数据加载失败" description={(providerQuery.error ?? catalogQuery.error) instanceof Error ? (providerQuery.error ?? catalogQuery.error)?.message : "无法读取 Provider 数据"} action={<Button onClick={() => { void providerQuery.refetch(); void catalogQuery.refetch(); }}>重试</Button>} />;
  if (!info && connections.length === 0) return <Alert type="warning" title="未找到提供者" description={<Button type="link" onClick={() => navigate("/dashboard/providers")}>返回 Providers</Button>} />;

  const modelRows: Array<Record<string, unknown> & { _key: string; _custom: boolean }> = [...(modelsQuery.data?.models ?? []), ...(modelsQuery.data?.customModels ?? [])].map((item, index) => ({ ...item, _key: `${String(item.id ?? index)}-${index}`, _custom: Boolean((item as Record<string, unknown>)._custom || (item as Record<string, unknown>).source === "custom") }));
  const visibleModelRows = modelRows.filter((row) => {
    const query = modelFilter.trim().toLocaleLowerCase();
    const isHidden = hiddenModelIds.has(String(row.id));
    const matchesVisibility = visibilityFilter === "all" || (visibilityFilter === "hidden" ? isHidden : !isHidden);
    return matchesVisibility && (!query || `${String(row.id ?? "")} ${String(row.name ?? "")}`.toLocaleLowerCase().includes(query));
  });

  return (
    <div className={styles.page}>
      {contextHolder}
      <Space orientation="vertical" size={32} style={{ width: "100%" }}>
        <div>
          <Button type="link" icon={<MaterialIcon name="arrow_back" />} onClick={() => navigate("/dashboard/providers")} style={{ paddingInline: 0, marginBottom: 16 }}>{t("providers.back")}</Button>
          <div className={styles.header}>
          <div
            className={styles.headerIcon}
            style={{ background: `${info?.color ?? "#1677ff"}18` }}
            aria-hidden="true"
          >
            {HeaderIcon ? createElement(HeaderIcon, { size: 32, style: { color: info?.color ?? "#1677ff", position: "relative", zIndex: 1 }, "aria-label": info?.name ?? providerId }) : <img
              className={styles.headerIconImage}
              src={`/providers/${headerIconId}.svg`}
              alt=""
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />}
            <span style={{ position: "absolute", color: info?.color ?? "#1677ff", fontWeight: 600, fontSize: 14 }}>
              {info?.textIcon ?? providerId.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className={styles.headerBody}>
            <Typography.Title level={2} className={styles.title} style={{ color: info?.color ?? undefined }}>
              {info?.website ? (
                <a href={info.website} target="_blank" rel="noreferrer" className={styles.titleLink}>
                  <span>{info?.name ?? providerId}</span><MaterialIcon name="open_in_new" size={16} />
                </a>
              ) : (info?.name ?? providerId)}
            </Typography.Title>
            <div className={styles.headerMeta}>
              <Typography.Text className={styles.muted}>{t("providers.connectionsCount", { count: connections.length })}</Typography.Text>
              {info?.notice?.apiKeyUrl && <a href={info.notice.apiKeyUrl} target="_blank" rel="noreferrer">{t("providers.getApiKey")}</a>}
            </div>
          </div>
          </div>
        </div>

        {kind === "compatible" && <Card className={styles.protocol} title={providerId.startsWith("anthropic-compatible-") ? "Anthropic 兼容端点" : "OpenAI 兼容端点"} extra={<Tag color="orange">兼容协议</Tag>}>
          <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="端点名称">{node?.name ?? info?.name ?? providerId}</Descriptions.Item>
            <Descriptions.Item label="API 类型">{node?.apiType ?? "OpenAI Chat Completions"}</Descriptions.Item>
            <Descriptions.Item label="Base URL">{node?.baseUrl ?? info?.baseUrl ?? "未配置"}</Descriptions.Item>
            <Descriptions.Item label="模型路径">{node?.modelsPath ?? "/v1/models"}</Descriptions.Item>
          </Descriptions>
          <Alert type="info" showIcon style={{ marginTop: 12 }} message="兼容端点的连接凭证和模型列表由端点配置决定；先添加连接，再导入或添加模型。" />
        </Card>}
        {kind === "no-auth" && <Card title="免鉴权提供者"><Space align="start" style={{ width: "100%", justifyContent: "space-between" }}><Alert type="info" showIcon message="此提供者不需要 API Key 或 OAuth 连接。" description="关闭后，路由不会再向该提供者发送匿名请求。" style={{ flex: 1 }} /><Switch checked={noAuthEnabled} loading={noAuthBusy} onChange={(checked) => void toggleNoAuth(checked)} /></Space></Card>}
        {/* OAuth/Web-cookie/IDE flows are exposed from the Connections toolbar in
            the official page; do not add a generic warning card here. */}
        {(kind === "search" || kind === "webfetch") && <Card title={kind === "webfetch" ? "搜索与网页抓取" : "搜索提供者"}>
          <Typography.Paragraph className={styles.muted}>按名称、能力或类别查找提供者。该类型不提供模型目录。</Typography.Paragraph>
          {kind === "webfetch" && <Card type="inner" title="游乐场 · 网页获取">
            <Space orientation="vertical" style={{ width: "100%" }}>
              <Typography.Text code>/api/v1/web/fetch</Typography.Text>
              <Input value={playgroundUrl} onChange={(event) => setPlaygroundUrl(event.target.value)} placeholder="https://example.com/article" />
              <Space wrap>
                <Select value={playgroundFormat} onChange={setPlaygroundFormat} options={["markdown", "html", "links", "screenshot"].map((value) => ({ label: value, value }))} />
                <Select value={playgroundDepth} onChange={setPlaygroundDepth} options={[0, 1, 2, 3].map((value) => ({ label: `深度 ${value}`, value: String(value) }))} />
                <Button type="primary" icon={<MaterialIcon name="open_in_new" />} loading={playgroundMutation.isPending} onClick={() => playgroundMutation.mutate()}>运行</Button>
              </Space>
              {playgroundResult && <Alert type={playgroundMutation.isError ? "error" : "info"} message={<pre style={{ maxHeight: 280, overflow: "auto", whiteSpace: "pre-wrap", margin: 0 }}>{playgroundResult}</pre>} />}
            </Space>
          </Card>}
        </Card>}
        {kind === "upstream-proxy" && <Card title="由上游代理管理"><Typography.Paragraph className={styles.muted}>该条目由 CLIProxyAPI/上游代理层管理，不建立普通直连。请在代理设置中配置运行时和路由。</Typography.Paragraph><Button onClick={() => navigate("/dashboard/settings/routing")}>打开路由设置</Button></Card>}

        {kind !== "no-auth" && kind !== "upstream-proxy" && <Card className={styles.section} title={<div className={styles.cardTitleRow}><span>{t("providers.connections")}</span><Button className={styles.providerProxyButton} size="small" color={providerProxyHost ? "orange" : "default"} variant="filled" icon={<MaterialIcon name="vpn_lock" />} loading={proxyBusy && proxyTarget?.scope === "provider" && !proxyModalOpen} onClick={() => void openProviderProxyConfig()}>{providerProxyHost ?? t("providers.providerProxy")}</Button></div>} extra={<Space size={8}>{connections.length > 0 && <Button className={styles.headerActionButton} icon={<MaterialIcon name="swap_horiz" />} loading={distributeProxyMutation.isPending} onClick={() => distributeProxyMutation.mutate()}>{t("providers.distributeProxies")}</Button>}<Button className={styles.headerActionButton} icon={<MaterialIcon name="refresh" />} onClick={() => { void providerQuery.refetch(); void modelsQuery.refetch(); }}>{t("providers.refresh")}</Button>{providerId === "qoder" && <Button className={styles.headerActionButton} onClick={() => void startOAuth()}>{t("providers.experimentalOAuth")}</Button>}<Button className={styles.headerActionButton} type="primary" icon={<MaterialIcon name="add" />} onClick={openAddConnection}>{kind === "oauth" ? t("providers.oauthAuthorize") : kind === "web-cookie" ? t("providers.addCookie") : kind === "ide" ? t("providers.connectIde") : t("providers.addConnection")}</Button></Space>}>
          {connections.length > 1 && <Card type="inner" size="small" title={t("providers.accountRouting")} style={{ marginBottom: 16 }}>
            <Space wrap align="center">
              <Typography.Text type="secondary">{t("providers.accountRoutingDescription")}</Typography.Text>
              <Select
                value={routingStrategy}
                disabled={routingBusy || settingsQuery.isLoading}
                onChange={(value: string) => { setRoutingStrategy(value); void saveRouting(value, stickyLimit); }}
                options={[{ label: t("providers.inheritGlobal"), value: "" }, ...ROUTING_STRATEGIES.map((value) => ({ label: value, value }))]}
                style={{ width: 170 }}
              />
              {routingStrategy === "round-robin" && <InputNumber min={1} max={10} value={stickyLimit} disabled={routingBusy} onChange={(value) => setStickyLimit(value ?? 3)} onBlur={() => void saveRouting(routingStrategy, stickyLimit)} addonBefore={t("providers.stickyLimit")} />}
            </Space>
          </Card>}
          {connections.length > 0 && <div className={styles.connectionToolbar}>
            <Space className={styles.connectionToolbarFilters} wrap>
              <Checkbox checked={visibleConnections.length > 0 && visibleConnections.every((row) => selectedConnectionIds.includes(row.id))} indeterminate={selectedConnectionIds.length > 0 && selectedConnectionIds.length < visibleConnections.length} onChange={(event) => setSelectedConnectionIds(event.target.checked ? visibleConnections.map((row) => row.id) : [])}>{selectedConnectionIds.length > 0 ? t("providers.selectedCount", { count: selectedConnectionIds.length }) : t("providers.accountsCount", { count: connections.length })}</Checkbox>
              <Input.Search allowClear value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder={t("providers.searchAccounts")} style={{ width: 180 }} />
              <Segmented
                value={healthFilter}
                onChange={(value) => setHealthFilter(value as typeof healthFilter)}
                options={[
                  { label: t("providers.all"), value: "all" },
                  { label: t("providers.healthy"), value: "active" },
                  { label: t("providers.error"), value: "error" },
                  { label: t("providers.disabled"), value: "disabled" },
                  { label: t("providers.quotaExhausted"), value: "exhausted" },
                ]}
              />
              {connections.length > 1 && selectedConnectionIds.length === 0 && <Button icon={<MaterialIcon name="play_arrow" />} loading={batchTestMutation.isPending} onClick={() => void batchTestMutation.mutateAsync()}>{t("providers.testAll")}</Button>}
            </Space>
            {selectedConnectionIds.length > 0 && <Space className={styles.bulkActions} wrap size={[8, 8]}>
              <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="toggle_on" />} loading={batchStatusMutation.isPending} onClick={() => void batchStatusMutation.mutateAsync(true)}>{t("providers.enableSelected")}</Button>
              <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="toggle_off" />} loading={batchStatusMutation.isPending} onClick={() => void batchStatusMutation.mutateAsync(false)}>{t("providers.disableSelected")}</Button>
              <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="play_arrow" />} loading={batchTestMutation.isPending} onClick={() => void batchTestMutation.mutateAsync(selectedConnectionIds)}>{t("providers.testSelected")}</Button>
              <Popconfirm title={t("providers.deleteSelectedConfirm")} onConfirm={() => void batchDeleteMutation.mutateAsync()}>
                <Button className={styles.bulkActionButton} color="danger" variant="filled" loading={batchDeleteMutation.isPending} icon={<MaterialIcon name="delete" />}>{t("providers.deleteSelected", { count: selectedConnectionIds.length })}</Button>
              </Popconfirm>
            </Space>}
          </div>}
          {connections.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<><Typography.Text>{t("providers.noConnections")}</Typography.Text><br /><Typography.Text type="secondary">{t("providers.noConnectionsDescription")}</Typography.Text><br /><Button type="link" icon={<MaterialIcon name="add" />} onClick={openAddConnection}>{t("providers.addConnection")}</Button></>} /> : <List
            dataSource={visibleConnections}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
            renderItem={(row) => <List.Item style={{ paddingBlock: 12, paddingInline: 0, border: 0 }}>
              <div className={styles.connectionRow}>
                <Checkbox checked={selectedConnectionIds.includes(row.id)} onChange={(event) => setSelectedConnectionIds((current) => event.target.checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} />
                <Space orientation="vertical" size={0} className={styles.connectionIdentity}>
                  <div className={styles.connectionNameRow}><MaterialIcon className={styles.connectionNameIcon} name="lock" size={16} /><Typography.Text strong ellipsis={{ tooltip: maskAccountName(row.name) }}>{maskAccountName(row.name)}</Typography.Text></div>
                </Space>
                <Divider type="vertical" className={styles.connectionDivider} />
                <Space wrap align="center" size={[4, 4]} className={styles.connectionFeatures}>
                  {connectionStatus(row, t, styles.statusTag)}
                  <Button className={styles.actionButton} size="small" color={row.rateLimitProtection ? "green" : "default"} variant="filled" icon={<MaterialIcon name="shield" />} onClick={() => rateLimitMutation.mutate({ id: row.id, enabled: !row.rateLimitProtection })}>{row.rateLimitProtection ? t("providers.protected") : t("providers.unprotected")}</Button>
                  <Button className={styles.actionButton} size="small" color={row.quotaVisible === false ? "default" : "blue"} variant="filled" icon={<MaterialIcon name="visibility" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { quotaVisible: row.quotaVisible === false } })}>{t("providers.quota")}</Button>
                  <Button className={styles.actionButton} size="small" color={(row.providerSpecificData as Record<string, unknown> | undefined)?.autoSync ? "green" : "default"} variant="filled" icon={<MaterialIcon name="sync" />} onClick={() => toggleConnectionAutoSync(row)}>{t("providers.sync")}</Button>
                  <Button className={styles.actionButton} size="small" color={row.proxyEnabled === false ? "default" : "green"} variant="filled" icon={<MaterialIcon name="vpn_lock" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { proxyEnabled: row.proxyEnabled === false } })}>{t("providers.proxy")}</Button>
                  <Button className={styles.actionButton} size="small" color={row.perKeyProxyEnabled ? "purple" : "default"} variant="filled" icon={<MaterialIcon name="key" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { perKeyProxyEnabled: !row.perKeyProxyEnabled } })}>{t("providers.perKey")}</Button>
                  {row.baseUrl && <Tag>{row.baseUrl}</Tag>}
                  {row.defaultModel && <Tag color="blue">{row.defaultModel}</Tag>}
                  {row.lastError && <Tag color="error">{row.lastError}</Tag>}
                </Space>
                <Space size={[4, 4]} wrap className={styles.connectionActions}>
                  <Button className={styles.actionButton} size="small" color="blue" variant="filled" loading={testMutation.isPending} icon={<MaterialIcon name="refresh" />} onClick={() => testMutation.mutate(row.id)}>{t("providers.retest")}</Button>
                  {(row.authType === "oauth" || kind === "oauth" || kind === "ide") && <Button className={styles.actionButton} size="small" color="orange" variant="filled" loading={refreshTokenMutation.isPending} icon={<MaterialIcon name="token" />} onClick={() => refreshTokenMutation.mutate(row)}>{t("providers.token")}</Button>}
                  <Switch size="small" checked={row.isActive !== false} loading={statusMutation.isPending} onChange={(checked) => statusMutation.mutate({ id: row.id, isActive: checked })} />
                  {(row.authType === "oauth" || kind === "oauth" || kind === "ide") && <Button className={styles.actionButton} size="small" color="gold" variant="filled" icon={<MaterialIcon name="passkey" />} onClick={() => void startOAuth()}>{t("providers.reauthorize")}</Button>}
                  <Button className={styles.actionButton} size="small" variant="filled" icon={<MaterialIcon name="edit" />} onClick={() => navigate(`/dashboard/providers/${providerId}/connections/${row.id}`)}>{t("providers.edit")}</Button>
                  <Button className={styles.actionButton} size="small" variant="filled" icon={<MaterialIcon name="vpn_lock" />} onClick={() => void openProxyConfig(row)}>{t("providers.proxyConfig")}</Button>
                  <Popconfirm title={t("providers.deleteConnectionConfirm")} onConfirm={() => deleteMutation.mutate(row.id)}><Button className={styles.actionButton} size="small" color="danger" variant="filled" icon={<MaterialIcon name="delete" />}>{t("providers.delete")}</Button></Popconfirm>
                </Space>
              </div>
            </List.Item>}
          />}
        </Card>}

        {kind !== "search" && kind !== "webfetch" && kind !== "upstream-proxy" && <Card className={styles.section} title={<Space size={8}><span>{t("providers.availableModels")}</span><Tag>{modelRows.length}</Tag></Space>} loading={modelsQuery.isLoading} extra={<Space wrap><Input.Search size="small" allowClear value={modelFilter} onChange={(event) => setModelFilter(event.target.value)} placeholder={t("providers.searchModels")} style={{ width: 150 }} /><Select size="small" value={visibilityFilter} onChange={setVisibilityFilter} options={[{ label: t("providers.allModels"), value: "all" }, { label: t("providers.visible"), value: "visible" }, { label: t("providers.hidden"), value: "hidden" }]} /><Button size="small" icon={<MaterialIcon name="refresh" />} loading={syncModelsMutation.isPending} disabled={connections.length === 0} onClick={() => syncModelsMutation.mutate()}>{t("providers.syncModels")}</Button><Input size="small" value={modelId} onChange={(event) => setModelId(event.target.value)} placeholder={t("providers.modelId")} /><Input size="small" value={modelName} onChange={(event) => setModelName(event.target.value)} placeholder={t("providers.displayNameOptional")} /><Button size="small" type="primary" icon={<MaterialIcon name="add" />} disabled={!modelId.trim() || connections.length === 0} loading={modelMutation.isPending} onClick={() => modelMutation.mutate({ action: "add", id: modelId.trim(), name: modelName.trim() || undefined })}>{t("providers.add")}</Button></Space>}>
          {connections.length === 0 && <Alert type="info" showIcon message={t("providers.modelsNeedConnection")} style={{ marginBottom: 12 }} />}
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, lg: 3 }}
            pagination={{ pageSize: 12, hideOnSinglePage: true }}
            dataSource={visibleModelRows}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("providers.noModels")} /> }}
            renderItem={(row) => {
              const id = String(row.id ?? "-");
              const hidden = hiddenModelIds.has(id);
              return <List.Item>
                <Card size="small" style={{ height: "100%" }}>
                  <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                    <Space style={{ width: "100%", justifyContent: "space-between" }}>
                      <Typography.Text code ellipsis={{ tooltip: id }}>{id}</Typography.Text>
                      <Tag>{String(row.source || (row._custom ? "Custom" : "Built-in"))}</Tag>
                    </Space>
                    <Typography.Text type="secondary" ellipsis={{ tooltip: String(row.name || id) }}>{String(row.name || id)}</Typography.Text>
                    <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                      <Button size="small" type="text" icon={<MaterialIcon name={hidden ? "visibility_off" : "visibility"} />} onClick={() => visibilityMutation.mutate({ modelId: id, isHidden: !hidden })}>{hidden ? t("providers.hidden") : t("providers.visible")}</Button>
                      {row._custom && <Button size="small" type="link" danger onClick={() => modelMutation.mutate({ action: "remove", id })}>{t("providers.delete")}</Button>}
                    </Space>
                  </Space>
                </Card>
              </List.Item>;
            }}
          />
        </Card>}

        {kind !== "search" && kind !== "webfetch" && kind !== "upstream-proxy" && <Card title={t("providers.playground")}>
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Space wrap>
              <Typography.Text>{t("providers.model")}</Typography.Text>
              <Select style={{ minWidth: 260 }} placeholder={t("providers.selectModel")} value={chatModel || undefined} onChange={setChatModel} options={modelRows.map((row) => ({ label: String(row.name || row.id), value: String(row.id) }))} disabled={modelRows.length === 0} />
            </Space>
            <Input.TextArea value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder={t("providers.sendPlaceholder")} autoSize={{ minRows: 2, maxRows: 6 }} />
            <Button type="primary" loading={chatMutation.isPending} disabled={!chatModel || !chatInput.trim() || connections.length === 0} onClick={() => chatMutation.mutate()}>{t("providers.send")}</Button>
            {chatOutput && <Alert type={chatMutation.isError ? "error" : "info"} message={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{chatOutput}</pre>} />}
          </Space>
        </Card>}

        {(kind === "standard" || kind === "compatible" || kind === "oauth" || kind === "web-cookie" || kind === "ide" || kind === "search" || kind === "webfetch") && <Space orientation="vertical" style={{ width: "100%" }} size={16}>
          <Card title={t("providers.parameterFilters")} extra={<Space><Button onClick={() => { setFiltersText(JSON.stringify({ block: [], allow: [], autoLearn: false }, null, 2)); }}>{t("providers.reset")}</Button><Button type="primary" icon={<MaterialIcon name="save" />} loading={saveConfigMutation.isPending} onClick={() => saveConfigMutation.mutate({ type: "filters", text: filtersText || filtersValue || "{}" })}>{t("providers.save")}</Button></Space>}>
            <Input.TextArea value={filtersText || filtersValue} onChange={(event) => setFiltersText(event.target.value)} autoSize={{ minRows: 4, maxRows: 10 }} placeholder='{"block":[],"allow":[],"autoLearn":false}' />
          </Card>
          <Card title={t("providers.webInterceptionRules")} extra={<Space><Button onClick={() => setInterceptionText(JSON.stringify({ interceptSearch: undefined, interceptFetch: undefined }, null, 2))}>{t("providers.reset")}</Button><Button type="primary" icon={<MaterialIcon name="save" />} loading={saveConfigMutation.isPending} onClick={() => saveConfigMutation.mutate({ type: "interception", text: interceptionText || interceptionValue || "{}" })}>{t("providers.save")}</Button></Space>}>
            <Input.TextArea value={interceptionText || interceptionValue} onChange={(event) => setInterceptionText(event.target.value)} autoSize={{ minRows: 4, maxRows: 10 }} placeholder='{"interceptSearch":false,"interceptFetch":false}' />
          </Card>
        </Space>}
      </Space>
      <Modal title={proxyTarget?.scope === "provider" ? t("providers.providerProxyConfig") : t("providers.connectionProxyConfig")} open={proxyModalOpen} onCancel={() => { if (!proxyBusy) setProxyModalOpen(false); }} onOk={() => void saveProxyConfig()} confirmLoading={proxyBusy} okText={t("providers.save")} cancelText={t("providers.cancel")}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">{t("providers.proxyConfigDescription", { target: proxyTarget?.label ?? t("providers.currentTarget") })}</Typography.Text>
          <Select value={proxySelection} onChange={setProxySelection} options={[{ value: "", label: t("providers.noProxy") }, ...proxyOptions]} style={{ width: "100%" }} loading={proxyBusy} />
        </Space>
      </Modal>
      <Modal
        title={t("providers.addConnectionTitle", { provider: info?.name ?? providerId })}
        open={addConnectionOpen}
        onCancel={() => { if (!createConnectionMutation.isPending) setAddConnectionOpen(false); }}
        okText={t("providers.add")}
        cancelText={t("providers.cancel")}
        confirmLoading={createConnectionMutation.isPending}
        okButtonProps={{ disabled: !connectionName.trim() || (kind !== "no-auth" && !connectionApiKey.trim() && !connectionBaseUrl.trim()) }}
        onOk={() => createConnectionMutation.mutate()}
      >
        <Space orientation="vertical" size={16} style={{ width: "100%" }}>
          <Alert type="info" showIcon message={t("providers.newConnectionDisabled")} description={t("providers.newConnectionHint")} />
          <label><Typography.Text>{t("providers.connectionName")}</Typography.Text><Input value={connectionName} onChange={(event) => setConnectionName(event.target.value)} placeholder="Primary" style={{ marginTop: 6 }} /></label>
          <label><Typography.Text>{kind === "compatible" ? "API Key" : "API Key / PAT"}</Typography.Text><Input.Password value={connectionApiKey} onChange={(event) => setConnectionApiKey(event.target.value)} placeholder={t("providers.enterCredential")} style={{ marginTop: 6 }} /></label>
          {(kind === "compatible" || connectionBaseUrl) && <label><Typography.Text>Base URL</Typography.Text><Input value={connectionBaseUrl} onChange={(event) => setConnectionBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" style={{ marginTop: 6 }} /></label>}
          <label><Typography.Text>{t("providers.priority")}</Typography.Text><br /><InputNumber min={0} value={connectionPriority} onChange={(value) => setConnectionPriority(value ?? 1)} style={{ marginTop: 6, width: 140 }} /></label>
        </Space>
      </Modal>
      <Modal
        title={`${info?.name ?? providerId} 授权`}
        open={oauthOpen}
        onCancel={() => { if (!oauthBusy) { setOauthOpen(false); setOauthSession(null); setOauthDevice(null); } }}
        footer={<Space><Button onClick={() => { setOauthOpen(false); setOauthSession(null); setOauthDevice(null); }} disabled={oauthBusy}>关闭</Button>{!oauthDevice && <Button type="primary" loading={oauthBusy} disabled={!oauthCallbackUrl.trim() || !oauthSession} onClick={() => void completeOAuth()}>完成授权</Button>}</Space>}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          {oauthDevice ? <Alert showIcon type="info" message="等待设备授权完成" description={<span>请在新打开的页面完成登录：<Typography.Link href={oauthDevice.verificationUrl} target="_blank" rel="noreferrer">打开验证页面</Typography.Link>。完成后本页会自动轮询并添加连接。</span>} /> : <>
            <Alert showIcon type="info" message="已打开官方授权页面" description="完成登录后，将浏览器地址栏中的回调地址粘贴到下方；本页面不会显示或保存你的授权令牌。" />
            <Input.TextArea
              value={oauthCallbackUrl}
              onChange={(event) => setOauthCallbackUrl(event.target.value)}
              autoSize={{ minRows: 3, maxRows: 5 }}
              placeholder="粘贴 http://127.0.0.1:20128/callback?code=...&state=..."
            />
          </>}
          {oauthError && <Alert showIcon type="error" message={oauthError} />}
        </Space>
      </Modal>
    </div>
  );
}
