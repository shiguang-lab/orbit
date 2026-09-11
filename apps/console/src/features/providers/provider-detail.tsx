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
  Dropdown,
  Empty,
  Flex,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Segmented,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import { api, embeddedServicesApi, providersApi, settingsApi, type CliproxyAccountItem, type ProviderCatalogEntry, type ProviderConnection } from "@/entities/api";
import { useI18n } from "@/i18n";
import AntigravityColorIcon from "@lobehub/icons/es/Antigravity/components/Color";
import AwsColorIcon from "@lobehub/icons/es/Aws/components/Color";
import ClineMonoIcon from "@lobehub/icons/es/Cline/components/Mono";
import QoderColorIcon from "@lobehub/icons/es/Qoder/components/Color";
import TencentColorIcon from "@lobehub/icons/es/Tencent/components/Color";
import { ProviderModelsSection, type ModelRowItem } from "./components/ProviderModelsSection";
import { CustomModelsSection, type CustomModelItem } from "./components/CustomModelsSection";
import { SearchProviderCard } from "./components/SearchProviderCard";
import { ProviderPlaygroundPanel } from "./components/ProviderPlaygroundPanel";
import { ProviderParamFilterSection } from "./components/ProviderParamFilterSection";
import { ProviderInterceptionSection } from "./components/ProviderInterceptionSection";
import { getWebSessionCredentialRequirement } from "@orbit/contracts/config/webSessionCredentials";
import { ProviderCcAliasSection } from "./components/ProviderCcAliasSection";
import { useBreadcrumbTitle } from "@/shell/useBreadcrumbTitle";
import { getConnectionHealth, resolveOAuthRedirectUri } from "./connection-health";

const useStyles = createStyles(({ token }) => ({
  // Orbit's dashboard is fluid (capped only by the shell at very wide
  // viewports). A local max-width here made the detail page visibly narrower
  // than the Providers list and the official page.
  page: {
    width: "100%",
    maxWidth: "none",
    margin: 0,
  },
  header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 0, minHeight: 38 },
  title: { margin: "0 !important", fontSize: 20, lineHeight: "1 !important", letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center" },
  titleLink: { color: "inherit", display: "inline-flex", alignItems: "center", gap: 6, lineHeight: 1 },
  headerIcon: { width: 38, height: 38, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "none", position: "relative" },
  headerIconImage: { width: 32, height: 32, objectFit: "contain" as const, position: "relative" as const, zIndex: 1 },
  headerRow: { display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 10, minWidth: 0, flex: 1 },
  muted: { color: token.colorTextSecondary },
  section: { marginBottom: 0 },
  protocol: { borderLeft: `3px solid ${token.colorPrimary}` },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 },
  connectionRow: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, width: "100%", minWidth: 0 },
  connectionToolbar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", flexWrap: "wrap" as const, marginBottom: 8 },
  connectionToolbarFilters: { display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: 12, minWidth: 0 },
  bulkActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" as const, gap: 8, marginInlineStart: "auto" },
  bulkActionButton: { minHeight: 32, paddingInline: 12, fontWeight: 500 },
  cardTitleRow: { display: "inline-flex", alignItems: "center", gap: 8 },
  providerProxyButton: { minHeight: 28, paddingInline: 10, fontSize: 13, fontWeight: 500 },
  headerActionButton: { height: 32 },
  connectionIdentity: { width: 220, minWidth: 220 },
  connectionNameRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, lineHeight: "22px" },
  connectionNameIcon: { flex: "none" },
  connectionDivider: { height: 16, marginInline: 4, opacity: 0.5, borderInlineStartColor: token.colorBorderSecondary },
  connectionFeatures: { flex: "1 1 280px", minWidth: 240 },
  connectionActions: { flex: "0 1 auto", marginInlineStart: "auto", justifyContent: "flex-end" },
  actionButton: { minHeight: 28, paddingInline: 10, fontSize: 13, fontWeight: 500 },
  statusTag: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    minHeight: 28,
    lineHeight: 1,
    marginInlineEnd: 0,
    paddingInline: 10,
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    border: "none",
  },
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

const FREE_APIKEY_PROVIDER_IDS = new Set([
  "qoder",
  "opencode",
  "dahl",
  "auggie",
  "zcode",
  "aihorde",
]);

function supportsApiKeyOnFreeProvider(providerId: string): boolean {
  return FREE_APIKEY_PROVIDER_IDS.has(providerId);
}

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

function connectionStatus(connection: ProviderConnection, t: (key: string, fallback?: string) => string, className?: string) {
  const health = getConnectionHealth(connection);
  if (health === "disabled") return <Tag bordered={false} color="default" className={className}>{t("providers.statusDisabled", "已禁用")}</Tag>;
  if (health === "error") return <Tag bordered={false} className={className} color="error">{t("providers.statusError", "异常")}</Tag>;
  if (health === "warning") return <Tag bordered={false} className={className} color="warning">{t("providers.statusWarning", "需检查")}</Tag>;
  if (health === "connected") return <Tag bordered={false} className={className} color="success">{t("providers.statusConnected", "已连接")}</Tag>;
  return <Tag bordered={false} className={className} color="processing">{t("providers.statusUntested", "未测试")}</Tag>;
}

export function cleanAccountName(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.includes("@")) {
    let s = raw.replace(/\.json$/i, "");
    s = s.replace(/-(?:plus|pro|team|enterprise|free|default)$/i, "");
    const atIndex = s.lastIndexOf("@");
    const user = s.slice(0, atIndex);
    const domain = s.slice(atIndex + 1);
    const cleanedUser = user.replace(/^[a-zA-Z0-9]+-[a-f0-9]{4,32}-/, "");
    const cleanedDomain = domain.replace(/\.json$/i, "").replace(/-(?:plus|pro|team|enterprise|free|default)$/i, "");
    return `${cleanedUser}@${cleanedDomain}`;
  }
  return raw.replace(/\.json$/i, "").replace(/^[a-zA-Z0-9]+-[a-f0-9]{4,32}-/, "");
}

function maskAccountName(value: string | null | undefined): string {
  const cleaned = cleanAccountName(value);
  if (!cleaned || !cleaned.includes("@")) return cleaned;
  const at = cleaned.lastIndexOf("@");
  const user = cleaned.slice(0, at);
  const domain = cleaned.slice(at + 1);
  if (user.length <= 4) return cleaned;
  return `${user.slice(0, 4)}***@${domain}`;
}


export default function ProviderDetailPage() {
  const { styles } = useStyles();
  const { t, tt } = useI18n();
  const navigate = useNavigate();
  const { id: providerId = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [oauthOpen, setOauthOpen] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState("");
  const [oauthSession, setOauthSession] = useState<{ redirectUri: string; codeVerifier?: string; connectionId?: string } | null>(null);
  const [oauthDevice, setOauthDevice] = useState<{ deviceCode: string; verificationUrl: string; codeVerifier?: string; interval: number } | null>(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "active" | "error" | "disabled" | "banned" | "exhausted">("all");
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [routingStrategy, setRoutingStrategy] = useState("");
  const [stickyLimit, setStickyLimit] = useState(3);
  const [routingBusy, setRoutingBusy] = useState(false);
  const [noAuthEnabled, setNoAuthEnabled] = useState(true);
  const [noAuthBusy, setNoAuthBusy] = useState(false);
  const [addConnectionOpen, setAddConnectionOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ProviderConnection | null>(null);
  const [connectionName, setConnectionName] = useState("");
  const [connectionApiKey, setConnectionApiKey] = useState("");
  const [connectionRefreshToken, setConnectionRefreshToken] = useState("");
  const [connectionBaseUrl, setConnectionBaseUrl] = useState("");
  const [connectionPriority, setConnectionPriority] = useState(1);
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [proxyTarget, setProxyTarget] = useState<{ scope: "account" | "provider"; id: string; label: string } | null>(null);
  const [proxyOptions, setProxyOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [proxySelection, setProxySelection] = useState<string>("");
  const [proxyBusy, setProxyBusy] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggingIndex === null || draggingIndex === targetIndex) {
      setDraggingIndex(null);
      setDragOverIndex(null);
      return;
    }
    const currentList = [...visibleConnections];
    const [draggedItem] = currentList.splice(draggingIndex, 1);
    currentList.splice(targetIndex, 0, draggedItem);
    setDraggingIndex(null);
    setDragOverIndex(null);

    try {
      for (let i = 0; i < currentList.length; i++) {
        const newPriority = i + 1;
        if (currentList[i].priority !== newPriority) {
          await providersApi.update(currentList[i].id, { priority: newPriority });
        }
      }
      messageApi.success("已更新账号排序与优先级");
      await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
    } catch {
      messageApi.error("更新账号排序失败");
    }
  };

  const catalogQuery = useQuery({ queryKey: ["providers", "catalog"], queryFn: providersApi.catalog, staleTime: 300_000 });
  const providerQuery = useQuery({ queryKey: ["providers", "detail", providerId], queryFn: () => providersApi.list({ provider: providerId }), enabled: Boolean(providerId) });
  const cliproxyAccountsQuery = useQuery({
    queryKey: ["cliproxy-accounts"],
    queryFn: () => embeddedServicesApi.getCliproxyAccounts().catch(() => []),
    enabled: providerId === "cliproxyapi" || providerId === "cliproxy",
    staleTime: 30_000,
  });
  const connectionIds = (providerQuery.data?.connections ?? []).map((connection) => connection.id).sort();
  const modelsQuery = useQuery({
    queryKey: ["providers", "provider-models", providerId, connectionIds],
    queryFn: async () => {
      const [metadata, registry, synced, pluginManifest] = await Promise.all([
        providersApi.providerModels(providerId).catch(() => ({ models: [], customModels: [], modelCompatOverrides: [], hiddenModelsByProvider: {} })),
        providersApi.catalogModels(providerId).catch(() => ({ models: [] })),
        providersApi.syncedModels(providerId).catch(() => ({ models: [] })),
        providerId === "cliproxyapi" ? providersApi.providerPluginManifest().catch(() => null) : Promise.resolve(null),
      ]);
      const compatMap = new Map<string, any>();
      for (const override of ((metadata as any).modelCompatOverrides || []) as any[]) {
        if (override?.id) compatMap.set(override.id, override);
      }
      return {
        ...metadata,
        registryModels: registry.models || [],
        syncedModels: synced.models || [],
        manifestModels: pluginManifest?.providers?.find((provider) => provider.id === providerId)?.models || [],
        customModels: (metadata as any).customModels || [],
        compatMap,
      };
    },
    enabled: Boolean(providerId) && providerQuery.isSuccess,
  });
  const aliasesQuery = useQuery({
    queryKey: ["models", "aliases"],
    queryFn: async () => {
      const res = await providersApi.aliases().catch(() => ({ aliases: {} }));
      return res.aliases || {};
    },
  });
  const ccAliasQuery = useQuery({
    queryKey: ["providers", providerId, "cc-alias"],
    queryFn: () => providersApi.ccAlias(providerId).catch(() => ({ provider: null, models: {} })),
    enabled: Boolean(providerId),
  });
  const filtersQuery = useQuery({ queryKey: ["providers", providerId, "param-filters"], queryFn: () => providersApi.paramFilters(providerId), enabled: Boolean(providerId) });
  const interceptionQuery = useQuery({ queryKey: ["providers", providerId, "interception-rules"], queryFn: () => providersApi.interceptionRules(providerId), enabled: Boolean(providerId) });
  const nodesQuery = useQuery({ queryKey: ["provider-nodes"], queryFn: providersApi.listNodes, staleTime: 30_000 });

  const info = useMemo(() => resolveProvider(catalogQuery.data, providerId), [catalogQuery.data, providerId]);
  const kind = classify(providerId, info);
  const providerSupportsPat = supportsApiKeyOnFreeProvider(providerId);
  const webSessionRequirement = useMemo(() => getWebSessionCredentialRequirement(providerId), [providerId]);
  const connections = providerQuery.data?.connections ?? [];
  const settingsQuery = useQuery({ queryKey: ["settings", "provider-routing"], queryFn: settingsApi.get, staleTime: 30_000, enabled: connections.length > 1 || kind === "no-auth" });
  const proxyConfigQuery = useQuery({ queryKey: ["settings", "proxy"], queryFn: () => settingsApi.proxyConfig(), staleTime: 30_000, enabled: Boolean(providerId) });
  const node = nodesQuery.data?.nodes.find((item) => item.id === providerId);
  const isCliproxyManaged = providerId.startsWith("openai-compatible-cliproxy-") || Boolean(node?.prefix?.startsWith("cpa-"));
  const providerProxy = (proxyConfigQuery.data as Record<string, unknown> | undefined)?.providers as Record<string, { host?: string; name?: string }> | undefined;
  const providerProxyHost = providerProxy?.[providerId]?.host;
  const providerDisplayAlias = node?.prefix || (info as any)?.alias || providerId;
  const headerIconId = (HEADER_ICON_ALIASES[providerId.toLowerCase()] ?? info?.icon ?? providerId).toLowerCase();
  const HeaderIcon = HEADER_LOBE_ICONS[headerIconId];
  const visibleConnections = useMemo(() => {
    const query = accountSearch.trim().toLocaleLowerCase();
    return connections.filter((connection) => {
      const specific = (
        typeof connection.providerSpecificData === "object" && connection.providerSpecificData !== null
          ? connection.providerSpecificData
          : typeof connection.providerSpecificData === "string"
            ? (() => { try { return JSON.parse(connection.providerSpecificData); } catch { return {}; } })()
            : {}
      ) as Record<string, unknown>;
      const specificEmail = cleanAccountName(specific?.accountEmail as string | undefined);
      const cleanName = cleanAccountName(connection.name);
      const matchesQuery = !query || [connection.name, cleanName, specificEmail, connection.baseUrl, connection.id, connection.authType].some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
      const isError = getConnectionHealth(connection) === "error";
      const matchesHealth = healthFilter === "all" || (healthFilter === "active" && connection.isActive !== false && !isError) || (healthFilter === "error" && isError) || (healthFilter === "disabled" && connection.isActive === false) || (healthFilter === "banned" && connection.testStatus === "banned") || (healthFilter === "exhausted" && connection.testStatus === "credits_exhausted");
      return matchesQuery && matchesHealth;
    });
  }, [accountSearch, connections, healthFilter]);
  useEffect(() => {
    const overrides = settingsQuery.data?.providerStrategies as Record<string, { fallbackStrategy?: string; stickyRoundRobinLimit?: number }> | undefined;
    const override = overrides?.[providerId];
    setRoutingStrategy(override?.fallbackStrategy ?? "");
    setStickyLimit(Math.min(1000, Math.max(1, Number(override?.stickyRoundRobinLimit ?? 3))));
  }, [providerId, settingsQuery.data]);
  useEffect(() => {
    const blocked = settingsQuery.data?.blockedProviders;
    setNoAuthEnabled(!(Array.isArray(blocked) && blocked.includes(providerId)));
  }, [providerId, settingsQuery.data]);

  const setCustomTitle = useBreadcrumbTitle((s) => s.setCustomTitle);
  useEffect(() => {
    const title = node?.name || info?.name || providerId;
    if (title) setCustomTitle(title);
    return () => setCustomTitle(null);
  }, [info?.name, node?.name, providerId, setCustomTitle]);

  useEffect(() => {
    const resetScroll = () => {
      const targets = [
        document.querySelector(".shell-content-scrollbar"),
        document.querySelector(".shell-content-scrollbar .os-viewport"),
        document.querySelector(".shell-content-scrollbar > div"),
        document.querySelector(".shell-content-scrollbar [data-overlayscrollbars-viewport]"),
        document.documentElement,
        document.body,
      ];
      targets.forEach((el) => {
        if (el) el.scrollTop = 0;
      });
      window.scrollTo(0, 0);
    };

    resetScroll();
    const frameId = requestAnimationFrame(resetScroll);
    const timerId = setTimeout(resetScroll, 100);
    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timerId);
    };
  }, [providerId, providerQuery.isLoading]);

  const startOAuth = useCallback(async (connectionId?: string) => {
    setOauthBusy(true);
    setOauthError(null);
    setOauthCallbackUrl("");
    setOauthDevice(null);
    try {
      if (DEVICE_CODE_PROVIDERS.has(providerId)) {
        const payload = await api<{ device_code?: string; verification_uri?: string; verification_uri_complete?: string; codeVerifier?: string; interval?: number; error?: string }>(
          `/oauth/${encodeURIComponent(providerId)}/device-code`
        );
        if (!payload?.device_code) throw new Error(payload?.error || "无法启动设备授权流程");
        const verificationUrl = payload.verification_uri_complete || payload.verification_uri;
        if (!verificationUrl) throw new Error("授权服务没有返回验证地址");
        setOauthSession({ redirectUri: "", codeVerifier: payload.codeVerifier, connectionId });
        setOauthDevice({ deviceCode: payload.device_code, verificationUrl, codeVerifier: payload.codeVerifier, interval: Math.max(3, payload.interval || 5) });
        setOauthOpen(true);
        window.open(verificationUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const redirectUri = resolveOAuthRedirectUri(providerId, window.location);
      const payload = await api<{ authUrl?: string; redirectUri?: string; codeVerifier?: string; error?: string }>(
        `/oauth/${encodeURIComponent(providerId)}/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`
      );
      if (!payload?.authUrl) throw new Error(payload?.error || "无法启动授权流程");
      setOauthSession({ redirectUri: payload.redirectUri || redirectUri, codeVerifier: payload.codeVerifier, connectionId });
      setOauthOpen(true);
      window.open(payload.authUrl, "_blank", "noopener,noreferrer");
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
      await api<{ error?: string | { message?: string } }>(
        `/oauth/${encodeURIComponent(providerId)}/exchange`,
        {
          method: "POST",
          body: JSON.stringify({
            code,
            state,
            redirectUri: oauthSession.redirectUri,
            codeVerifier: oauthSession.codeVerifier,
            connectionId: oauthSession.connectionId,
          }),
        }
      );
      await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      setOauthOpen(false);
      setOauthSession(null);
      messageApi.success(oauthSession.connectionId ? "授权连接已更新" : "授权连接已添加");
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
        const payload = await api<{ success?: boolean; pending?: boolean; error?: string; errorDescription?: string }>(
          `/oauth/${encodeURIComponent(providerId)}/poll`,
          {
            method: "POST",
            body: JSON.stringify({ deviceCode: oauthDevice.deviceCode, codeVerifier: oauthDevice.codeVerifier }),
          }
        );
        if (!active) return;
        if (payload?.success) {
          await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
          await queryClient.invalidateQueries({ queryKey: ["providers"] });
          setOauthDevice(null);
          setOauthSession(null);
          setOauthOpen(false);
          messageApi.success("授权连接已添加");
        } else if (!payload?.pending && payload?.error && payload.error !== "authorization_pending" && payload.error !== "slow_down") {
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
    setEditingConnection(null);
    setConnectionName(`${info?.name ?? providerId} Primary`);
    setConnectionApiKey("");
    setConnectionRefreshToken("");
    setConnectionBaseUrl(node?.baseUrl ?? info?.baseUrl ?? "");
    setConnectionPriority(1);
    setAddConnectionOpen(true);
  }, [info?.baseUrl, info?.name, node?.baseUrl, providerId]);

  const openEditConnection = useCallback((row: ProviderConnection) => {
    setEditingConnection(row);
    setConnectionName(row.name);
    setConnectionApiKey("");
    setConnectionRefreshToken("");
    setConnectionBaseUrl(row.baseUrl ?? "");
    setConnectionPriority(row.priority ?? 1);
    setAddConnectionOpen(true);
  }, []);

  const saveConnectionMutation = useMutation({
    mutationFn: () => {
      if (editingConnection) {
        const payload: Record<string, unknown> = {
          name: connectionName.trim() || editingConnection.name,
          baseUrl: connectionBaseUrl.trim() || undefined,
          priority: connectionPriority,
        };
        if (connectionApiKey.trim()) {
          payload.apiKey = connectionApiKey.trim();
        }
        if (connectionRefreshToken.trim()) {
          payload.providerSpecificData = {
            refreshToken: connectionRefreshToken.trim(),
          };
        }
        return providersApi.update(editingConnection.id, payload);
      }
      const payload: Record<string, unknown> = {
        provider: providerId,
        name: connectionName.trim() || `${info?.name ?? providerId} Primary`,
        apiKey: connectionApiKey.trim() || undefined,
        baseUrl: connectionBaseUrl.trim() || undefined,
        authType: kind === "compatible" ? "compatible" : kind === "oauth" ? "oauth" : kind === "web-cookie" ? "web-cookie" : "apikey",
        priority: connectionPriority,
        isActive: false,
        testStatus: "unknown",
      };
      if (connectionRefreshToken.trim()) {
        payload.providerSpecificData = {
          refreshToken: connectionRefreshToken.trim(),
        };
      }
      return providersApi.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      setAddConnectionOpen(false);
      setConnectionApiKey("");
      setConnectionRefreshToken("");
      messageApi.success(editingConnection ? tt("连接已保存", "Connection saved") : tt("连接已添加，请测试通过后启用", "Connection added, please enable after testing"));
      setEditingConnection(null);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error?.message || error?.message || (editingConnection ? "连接保存失败" : "连接添加失败");
      messageApi.error(msg);
    },
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
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [modelTestStatus, setModelTestStatus] = useState<Record<string, "ok" | "error" | "quota">>({});
  const [modelTestLatencies, setModelTestLatencies] = useState<Record<string, number>>({});
  const [modelTestErrors, setModelTestErrors] = useState<Record<string, string>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [testProgress, setTestProgress] = useState<{ done: number; total: number } | null>(null);
  const [testingCliproxyId, setTestingCliproxyId] = useState<string | null>(null);

  const handleTestCliproxyAccount = async (id: string) => {
    setTestingCliproxyId(id);
    try {
      const res = await embeddedServicesApi.testCliproxyAccount(id);
      if (res.success) {
        messageApi.success(`账号连通性正常（延迟: ${res.latencyMs || 120}ms）`);
      } else {
        messageApi.warning(`连通性异常: ${res.error || "请求超时"}`);
      }
      void queryClient.invalidateQueries({ queryKey: ["cliproxy-accounts"] });
    } catch {
      messageApi.error("测试连通性请求失败");
    } finally {
      setTestingCliproxyId(null);
    }
  };

  const setAliasMutation = useMutation({
    mutationFn: ({ modelId, alias }: { modelId: string; alias: string }) =>
      providersApi.setAlias(`${providerId}/${modelId}`, alias),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models", "aliases"] });
      messageApi.success("别名已设置");
    },
    onError: () => messageApi.error("设置别名失败"),
  });

  const deleteAliasMutation = useMutation({
    mutationFn: (alias: string) => providersApi.deleteAlias(alias),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["models", "aliases"] });
      messageApi.success("别名已删除");
    },
    onError: () => messageApi.error("删除别名失败"),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ modelIds, isHidden }: { modelIds: string[]; isHidden: boolean }) =>
      providersApi.setModelVisibility(providerId, modelIds, isHidden),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
    },
    onError: () => messageApi.error("保存模型可见性失败"),
  });

  const saveModelCompatMutation = useMutation({
    mutationFn: ({ modelId, patch }: { modelId: string; patch: any }) =>
      providersApi.updateCustomModel({ provider: providerId, modelId, ...patch }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
    },
    onError: () => messageApi.error("保存兼容性配置失败"),
  });

  const addCustomModelMutation = useMutation({
    mutationFn: (data: any) => providersApi.addCustomModel(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
    },
  });

  const updateCustomModelMutation = useMutation({
    mutationFn: (data: any) => providersApi.updateCustomModel(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
    },
  });

  const removeCustomModelMutation = useMutation({
    mutationFn: ({ modelId, resetOverride }: { modelId: string; resetOverride?: boolean }) =>
      providersApi.removeCustomModel(providerId, modelId, resetOverride),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
      messageApi.success("模型已删除");
    },
    onError: () => messageApi.error("删除模型失败"),
  });

  const clearAllCustomModelsMutation = useMutation({
    mutationFn: () => providersApi.clearAllCustomModels(providerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "provider-models", providerId] });
      void queryClient.invalidateQueries({ queryKey: ["models", "aliases"] });
      messageApi.success("模型已清空");
    },
    onError: () => messageApi.error("清空模型失败"),
  });

  const updateCcAliasMutation = useMutation({
    mutationFn: (data: { scope: "provider" | "model"; value: "on" | "off" | null; modelId?: string }) =>
      providersApi.updateCcAlias(providerId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", providerId, "cc-alias"] });
    },
  });

  const saveParamFiltersMutation = useMutation({
    mutationFn: (cfg: any) => providersApi.updateParamFilters(providerId, cfg),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", providerId, "param-filters"] });
    },
  });

  const resetParamFiltersMutation = useMutation({
    mutationFn: () => providersApi.deleteParamFilters(providerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", providerId, "param-filters"] });
    },
  });

  const updateInterceptionMutation = useMutation({
    mutationFn: (cfg: any) => providersApi.updateInterceptionRules(providerId, cfg),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers", providerId, "interception-rules"] });
    },
  });

  const handleTestModel = async (modelId: string, fullModel: string) => {
    setTestingModelId(modelId);
    try {
      const targetConnectionId = selectedConnectionIds.length === 1 ? selectedConnectionIds[0] : undefined;
      const res = await providersApi.testModel({
        providerId,
        modelId: fullModel,
        ...(targetConnectionId ? { connectionId: targetConnectionId } : {}),
      });
      if (res.status === "ok") {
        setModelTestStatus((prev) => ({ ...prev, [modelId]: "ok" }));
        if (res.latencyMs) setModelTestLatencies((prev) => ({ ...prev, [modelId]: res.latencyMs! }));
        setModelTestErrors((prev) => {
          const next = { ...prev };
          delete next[modelId];
          return next;
        });
        messageApi.success(`模型 ${modelId} 测试通过 (${res.latencyMs || 0}ms)`);
      } else {
        const errMsg = res.error || "测试失败";
        setModelTestStatus((prev) => ({ ...prev, [modelId]: "error" }));
        setModelTestErrors((prev) => ({ ...prev, [modelId]: errMsg }));
        messageApi.error(`模型 ${modelId} 测试失败: ${errMsg}`);
      }
    } catch (err: any) {
      const errMsg = err?.message || "测试失败";
      setModelTestStatus((prev) => ({ ...prev, [modelId]: "error" }));
      setModelTestErrors((prev) => ({ ...prev, [modelId]: errMsg }));
      messageApi.error(`模型 ${modelId} 测试失败: ${errMsg}`);
    } finally {
      setTestingModelId(null);
    }
  };

  const handleTestAll = async (
    targets: Array<{ modelId: string; fullModel: string }>,
    autoHideFailed?: boolean
  ) => {
    if (testingAll || targets.length === 0) return;
    setTestingAll(true);
    setTestProgress({ done: 0, total: targets.length });

    let doneCount = 0;
    const failedModelIds: string[] = [];
    const targetConnectionId = selectedConnectionIds.length === 1 ? selectedConnectionIds[0] : undefined;

    for (let i = 0; i < targets.length; i += 3) {
      const chunk = targets.slice(i, i + 3);
      await Promise.all(
        chunk.map(async ({ modelId, fullModel }) => {
          try {
            const res = await providersApi.testModel({
              providerId,
              modelId: fullModel,
              ...(targetConnectionId ? { connectionId: targetConnectionId } : {}),
            });
            if (res.status === "ok") {
              setModelTestStatus((prev) => ({ ...prev, [modelId]: "ok" }));
              if (res.latencyMs) setModelTestLatencies((prev) => ({ ...prev, [modelId]: res.latencyMs! }));
              setModelTestErrors((prev) => {
                const next = { ...prev };
                delete next[modelId];
                return next;
              });
            } else {
              const errMsg = res.error || "测试失败";
              setModelTestStatus((prev) => ({ ...prev, [modelId]: "error" }));
              setModelTestErrors((prev) => ({ ...prev, [modelId]: errMsg }));
              failedModelIds.push(modelId);
            }
          } catch (err: any) {
            const errMsg = err?.message || "测试失败";
            setModelTestStatus((prev) => ({ ...prev, [modelId]: "error" }));
            setModelTestErrors((prev) => ({ ...prev, [modelId]: errMsg }));
            failedModelIds.push(modelId);
          } finally {
            doneCount++;
            setTestProgress({ done: doneCount, total: targets.length });
          }
        })
      );
    }

    if (autoHideFailed && failedModelIds.length > 0) {
      await toggleVisibilityMutation.mutateAsync({
        modelIds: failedModelIds,
        isHidden: true,
      }).catch(() => {});
      messageApi.warning(`测试完成，已自动隐藏 ${failedModelIds.length} 个失败模型`);
    } else if (failedModelIds.length > 0) {
      messageApi.warning(`测试完成：${targets.length - failedModelIds.length} 个通过，${failedModelIds.length} 个失败（鼠标悬浮 ❌ 可查看具体报错）`);
    } else {
      messageApi.success(`所有 ${targets.length} 个模型测试通过！`);
    }

    setTestingAll(false);
    setTestProgress(null);
  };

  const autoFetchModelsEnabled = useMemo(() => {
    const activeConnections = connections.filter((c) => c.isActive !== false);
    return activeConnections.length > 0 && activeConnections.every((c) => (c as any).providerSpecificData?.autoFetchModels === true);
  }, [connections]);

  const isCodingPlanProvider = providerId === "volcengine-coding-plan";

  const handleToggleAutoFetchModels = async (enabled: boolean) => {
    const activeConnections = connections.filter((c) => c.isActive !== false);
    for (const c of activeConnections) {
      const curData = (c as any).providerSpecificData || {};
      await providersApi.update(c.id, {
        providerSpecificData: { ...curData, autoFetchModels: enabled },
      } as any).catch(() => {});
    }
    void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
    messageApi.success(enabled ? "已开启自动拉取上游模型" : "已关闭自动拉取上游模型");
  };

  const autoSyncEnabled = useMemo(() => {
    const activeConnections = connections.filter((c) => c.isActive !== false);
    return activeConnections.length > 0 && activeConnections.every((c) => (c as any).providerSpecificData?.autoSync === true);
  }, [connections]);

  const handleToggleAutoSync = async (enabled: boolean) => {
    const activeConnections = connections.filter((c) => c.isActive !== false);
    for (const c of activeConnections) {
      const curData = (c as any).providerSpecificData || {};
      await providersApi.update(c.id, {
        providerSpecificData: { ...curData, autoSync: enabled },
      } as any).catch(() => {});
    }
    void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
    messageApi.success(enabled ? "已开启自动同步" : "已关闭自动同步");
  };

  const availableModelRows: ModelRowItem[] = useMemo(() => {
    const map = new Map<string, ModelRowItem>();
    const compatMap = (modelsQuery.data as any)?.compatMap || new Map();
    const hiddenSet = new Set((modelsQuery.data as any)?.hiddenModelsByProvider?.[providerId] || []);

    for (const m of ((modelsQuery.data as any)?.registryModels || []) as any[]) {
      const id = String(m.id ?? "").trim();
      if (!id) continue;
      map.set(id, {
        id,
        name: m.name || id,
        source: "system",
        isFree: Boolean(m.isFree),
        isHidden: hiddenSet.has(id),
        compat: compatMap.get(id),
        testStatus: modelTestStatus[id],
        testError: modelTestErrors[id],
        latencyMs: modelTestLatencies[id],
      });
    }

    for (const m of ((modelsQuery.data as any)?.syncedModels || []) as any[]) {
      const id = String(m.id ?? "").trim();
      if (!id) continue;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, {
          id,
          name: m.name || id,
          source: "imported",
          isFree: Boolean(m.isFree),
          isHidden: hiddenSet.has(id),
          compat: compatMap.get(id),
          testStatus: modelTestStatus[id],
          testError: modelTestErrors[id],
          latencyMs: modelTestLatencies[id],
        });
      } else {
        // Retain built-in system source, enrich with any newly discovered attributes
        map.set(id, {
          ...existing,
          name: existing.name || m.name || id,
          isFree: existing.isFree || Boolean(m.isFree),
          testError: modelTestErrors[id],
        });
      }
    }

    // Embedded services publish their live catalog through Orbit's official
    // provider-plugin manifest. Keep the public provider prefix out of the
    // row id because ProviderModelsSection adds it when routing/testing.
    for (const m of [
      ...(((modelsQuery.data as any)?.manifestModels || []) as any[]),
    ]) {
      const rawId = String(m.id ?? "").trim();
      if (!rawId) continue;
      const prefixes = [`${providerDisplayAlias}/`, `${providerId}/`, "cliproxy/"];
      const prefix = prefixes.find((candidate) => rawId.startsWith(candidate));
      const id = prefix ? rawId.slice(prefix.length) : rawId;
      if (!id) continue;
      const existing = map.get(id);
      if (!existing) {
        map.set(id, {
          id,
          name: m.name || id,
          source: "imported",
          isFree: Boolean(m.isFree),
          isHidden: hiddenSet.has(id),
          compat: compatMap.get(id),
          testStatus: modelTestStatus[id],
          testError: modelTestErrors[id],
          latencyMs: modelTestLatencies[id],
        });
      }
    }

    return [...map.values()];
  }, [modelsQuery.data, providerId, providerDisplayAlias, modelTestStatus, modelTestLatencies, modelTestErrors]);

  const customModelRows: CustomModelItem[] = useMemo(() => {
    const compatMap = (modelsQuery.data as any)?.compatMap || new Map();
    const hiddenSet = new Set((modelsQuery.data as any)?.hiddenModelsByProvider?.[providerId] || []);
    const registrySet = new Set(((modelsQuery.data as any)?.registryModels || []).map((m: any) => String(m.id)));

    return ((modelsQuery.data as any)?.customModels || []).map((m: any) => {
      const id = String(m.id ?? "").trim();
      return {
        id,
        name: m.name || id,
        apiFormat: m.apiFormat,
        targetFormat: m.targetFormat,
        supportedEndpoints: m.supportedEndpoints,
        supportsVision: m.supportsVision,
        isFree: m.isFree,
        contextWindowOverride: m.contextWindowOverride,
        isHidden: hiddenSet.has(id),
        isOverride: registrySet.has(id),
        compat: compatMap.get(id),
      };
    });
  }, [modelsQuery.data, providerId]);
  const saveRouting = useCallback(async (strategy: string, nextStickyLimit: number) => {
    setRoutingBusy(true);
    try {
      const current = await settingsApi.get();
      const providerStrategies = { ...((current.providerStrategies ?? {}) as Record<string, unknown>) };
      if (!strategy) delete providerStrategies[providerId];
      else providerStrategies[providerId] = { fallbackStrategy: strategy, ...(strategy === "round-robin" ? { stickyRoundRobinLimit: Math.min(1000, Math.max(1, nextStickyLimit)) } : {}) };
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
    mutationFn: (row: ProviderConnection) =>
      row.provider === "cursor"
        ? providersApi.refreshCursor(row.id)
        : (row.provider === "kimi-web" || row.provider === "kimi_web")
        ? providersApi.refreshToken(row.id)
        : providersApi.refresh(row.id),
    onSuccess: (result: any) => {
      void queryClient.invalidateQueries({ queryKey: ["providers", "detail", providerId] });
      const msg = result?.message || (result?.expiresAt ? `令牌已刷新 (有效期至 ${new Date(result.expiresAt).toLocaleTimeString()})` : "令牌已刷新");
      messageApi.success(msg);
    },
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

  const renderWebSessionGuide = () => {
    if (providerId === "deepseek-web") {
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt("如何获取 DeepSeek Web 会话凭据 (userToken)", "How to get DeepSeek Web credential (userToken)")}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              <div>1. 在浏览器中打开并登录 <Typography.Link href="https://chat.deepseek.com" target="_blank" rel="noreferrer">chat.deepseek.com</Typography.Link>。</div>
              <div>2. 按 <code>F12</code>（或右键“检查”）打开开发者工具，切换到 <b>Application</b>（应用程序）面板。</div>
              <div>3. 在左侧栏展开 <b>Storage</b> → <b>Local Storage</b>，点击 <code>https://chat.deepseek.com</code>。</div>
              <div>4. 在右侧列表中找到 <b><code>userToken</code></b> 项，复制其 Value 粘贴到下方凭据框。</div>
              <div style={{ marginTop: 6, color: "var(--ant-color-warning)" }}>
                💡 <b>双 Token 说明</b>：系统已内置自动换票与定期续期机制，您<b>只需填写这一个 <code>userToken</code> 即可</b>，后端会自动换取临时 accessToken，无需也不需要提供双 Token。
              </div>
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方凭据输入框留空表示保留现有已配置的 userToken，无需重复粘贴。", "Edit note: Leave the credential field blank to keep existing userToken.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    if (providerId === "kimi-web") {
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt("如何获取 Kimi Web 会话凭据 (双 Token 自动续期)", "How to get Kimi Web credentials (Dual-Token Auto-Renewal)")}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              <div>1. 在浏览器中打开并登录 <Typography.Link href="https://www.kimi.com" target="_blank" rel="noreferrer">www.kimi.com</Typography.Link>。</div>
              <div>2. 按 <code>F12</code> 打开开发者工具，切换到 <b>Application</b>（应用程序）面板。</div>
              <div>3. 在左侧栏展开 <b>Storage</b> → <b>Local Storage</b>，点击 <code>https://www.kimi.com</code>。</div>
              <div>4. <b>主凭据 (必需)</b>：在列表中找到 <b><code>access_token</code></b>，复制其 Value 粘贴到下方主凭据输入框。</div>
              <div>5. <b>自动续期凭据 (推荐)</b>：找到同一列表中的 <b><code>refresh_token</code></b>，复制其 Value 粘贴到下方的“Refresh Token”输入框。</div>
              <div style={{ marginTop: 6, color: "var(--ant-color-success)" }}>
                ⚡ <b>双 Token 自动续期优势</b>：配置 <code>refresh_token</code> 后，系统后台将在 <code>access_token</code> 即将到期前自动静默刷新换票并轮换保存，实现无需手动重新复制的长效保活！
              </div>
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方输入框留空表示保留现有已配置的 access_token 与 refresh_token，无需重复粘贴。", "Edit note: Leave blank to keep existing access_token and refresh_token.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    if (providerId === "zai-web") {
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt("如何获取 Z.ai Web 会话凭据 (token)", "How to get Z.ai Web credential (token)")}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              <div>1. 在浏览器中打开并登录 <Typography.Link href="https://chat.z.ai" target="_blank" rel="noreferrer">chat.z.ai</Typography.Link>。</div>
              <div>2. 按 <code>F12</code> 打开开发者工具，切换到 <b>Application</b>（应用程序）→ <b>Storage</b> → <b>Local Storage</b> → <code>https://chat.z.ai</code>。</div>
              <div>3. 找到名为 <b><code>token</code></b> 的条目，<b>仅复制其 Value</b> 粘贴到下方主凭据框。</div>
              <div style={{ marginTop: 6, color: "var(--ant-color-warning)" }}>
                ⚠️ <b>重要说明</b>：切勿复制 Cookie 请求头，仅需 Local Storage 的 <code>token</code> 值。系统会通过内建浏览器传输层自动处理请求级人机验证（CAPTCHA）。
              </div>
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方凭据输入框留空表示保留现有已配置凭据。", "Edit note: Leave blank to keep existing credential.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    if (providerId === "grok-web") {
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt("如何获取 Grok Web 会话凭据 (sso & sso-rw)", "How to get Grok Web credential (sso & sso-rw)")}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              <div>1. 在浏览器中打开并登录 <Typography.Link href="https://grok.com" target="_blank" rel="noreferrer">grok.com</Typography.Link>。</div>
              <div>2. 按 <code>F12</code> 打开开发者工具，在 <b>Network</b>（网络）面板刷新，找到任一发往 grok.com 的请求。</div>
              <div>3. 在请求头中找到 <b>Cookie</b>，复制包含 <b><code>sso</code></b> 和 <b><code>sso-rw</code></b> 的 Cookie 字符串粘贴到下方。</div>
              <div style={{ marginTop: 6, color: "var(--ant-color-warning)" }}>
                💡 <b>网络与指纹说明</b>：Cloudflare 会将凭据与复制凭据所在浏览器的 IP、User-Agent 和 TLS 指纹绑定。若测试遇到拦截，请在高级配置中设置与该浏览器完全一致的 Custom User-Agent，并在相同网络/代理下使用。
              </div>
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方凭据输入框留空表示保留现有已配置凭据。", "Edit note: Leave blank to keep existing credential.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    if (providerId === "chatgpt-web") {
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt("ChatGPT Web 会话凭据配置 (Playwright storageState)", "ChatGPT Web Credential Setup (Playwright storageState)")}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              <div>1. 在独立/专用的浏览器上下文中登录 <Typography.Link href="https://chatgpt.com" target="_blank" rel="noreferrer">chatgpt.com</Typography.Link>。</div>
              <div>2. 导出该浏览器上下文的 Playwright 兼容 <b>storageState</b> JSON（包含 cookies 与 origins）。</div>
              <div>3. 将完整的 JSON 字符串粘贴到下方凭据框中。</div>
              <div style={{ marginTop: 6, color: "var(--ant-color-text-tertiary)" }}>
                🔒 凭据将在服务端本地加密存储，仅供本地浏览器上下文会话使用。
              </div>
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方凭据输入框留空表示保留现有已配置凭据。", "Edit note: Leave blank to keep existing credential.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    const req = webSessionRequirement && webSessionRequirement.kind !== "none" ? webSessionRequirement : null;
    if (req || kind === "web-cookie") {
      const credName = req?.credentialName || "Cookie / Session Token";
      const isToken = req?.kind === "token";
      return (
        <Card
          style={{
            background: "var(--ant-color-fill-quaternary)",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border-secondary)",
          }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Typography.Text strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name="help_outline" size={16} style={{ color: "var(--ant-color-primary)" }} />
              {tt(`如何获取 ${info?.name ?? providerId} 会话凭据`, `How to get ${info?.name ?? providerId} web credential`)}
            </Typography.Text>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ant-color-text-secondary)" }}>
              {req?.guideSteps && req.guideSteps.length > 0 ? (
                req.guideSteps.map((step: string, idx: number) => (
                  <div key={idx}>{idx + 1}. {step}</div>
                ))
              ) : (
                <>
                  <div>1. 在浏览器中打开并登录 {info?.name ?? providerId} 官网。</div>
                  <div>2. 按 <code>F12</code>（或右键“检查”）打开开发者工具，切换到 <b>Application</b>（应用程序）或 <b>Network</b>（网络）面板。</div>
                  <div>
                    3. {isToken
                      ? <span>在 <b>Local Storage</b> 中找到并复制 <b><code>{credName}</code></b> 的 Value。</span>
                      : <span>在 <b>Cookies</b> 或请求头中复制包含 <b><code>{credName}</code></b> 的完整 Cookie 字符串。</span>}
                  </div>
                  <div>4. 将复制的内容粘贴到下方的会话凭据框中。</div>
                </>
              )}
              {req?.hintFallback && (
                <div style={{ marginTop: 6, color: "var(--ant-color-warning)" }}>
                  💡 {req.hintFallback}
                </div>
              )}
              {req?.guideNote && (
                <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>
                  📌 {req.guideNote}
                </div>
              )}
            </div>
            {editingConnection && (
              <Alert
                type="info"
                showIcon
                style={{ padding: "4px 10px", fontSize: 12, marginTop: 4 }}
                message={tt("编辑提示：下方凭据输入框留空表示保留现有已配置凭据，无需重复粘贴。", "Edit note: Leave blank to keep existing credential.")}
              />
            )}
          </Space>
        </Card>
      );
    }

    return (
      <Alert
        type="info"
        showIcon
        message={editingConnection ? tt("编辑连接信息", "Edit Connection") : t("providers.newConnectionDisabled")}
        description={
          editingConnection
            ? tt("修改连接基本信息。凭据输入框留空表示保留当前凭据不变。", "Update connection details. Leave credential blank to keep existing.")
            : providerId === "qoder"
            ? "请粘贴你的 Qoder Personal Access Token (PAT)。可在 Qoder → Settings → Personal Access Tokens 中生成。"
            : t("providers.newConnectionHint")
        }
      />
    );
  };
  if (providerQuery.isLoading || catalogQuery.isLoading) return <PageSkeleton />;
  if (providerQuery.isError || catalogQuery.isError) return <Alert type="error" showIcon title="Provider 数据加载失败" description={(providerQuery.error ?? catalogQuery.error) instanceof Error ? (providerQuery.error ?? catalogQuery.error)?.message : "无法读取 Provider 数据"} action={<Button onClick={() => { void providerQuery.refetch(); void catalogQuery.refetch(); }}>重试</Button>} />;
  if (!info && connections.length === 0) return <Alert type="warning" title="未找到提供者" description={<Button type="link" onClick={() => navigate("/dashboard/providers")}>返回 Providers</Button>} />;

  return (
    <div className={styles.page}>
      {contextHolder}
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <div className={styles.header}>
          <div
            className={styles.headerIcon}
            style={{ background: `${info?.color ?? "#1677ff"}18` }}
            aria-hidden="true"
          >
            {HeaderIcon ? createElement(HeaderIcon, { size: 24, style: { color: info?.color ?? "#1677ff", position: "relative", zIndex: 1 }, "aria-label": info?.name ?? providerId }) : <img
              className={styles.headerIconImage}
              src={`/providers/${headerIconId}.svg`}
              alt=""
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />}
            <span style={{ position: "absolute", color: info?.color ?? "#1677ff", fontWeight: 600, fontSize: 13 }}>
              {info?.textIcon ?? (isCliproxyManaged ? "CPA" : providerId.slice(0, 2).toUpperCase())}
            </span>
          </div>
          <div className={styles.headerRow}>
            <Typography.Title level={4} className={styles.title} style={{ color: info?.color ?? undefined }}>
              {info?.website ? (
                <a href={info.website} target="_blank" rel="noreferrer" className={styles.titleLink}>
                  <span>{node?.name ?? info?.name ?? providerId}</span><MaterialIcon name="open_in_new" size={15} />
                </a>
              ) : (node?.name ?? info?.name ?? providerId)}
            </Typography.Title>
            {kind === "upstream-proxy" ? (
              <Tag bordered={false} color="success" style={{ fontSize: 12, padding: "2px 8px" }}>
                {(cliproxyAccountsQuery.data?.length ?? 0) > 0
                  ? t("providers.connectionsCount", { count: cliproxyAccountsQuery.data!.length })
                  : "由上游代理管理"}
              </Tag>
            ) : (
              <Tag bordered={false} style={{ fontSize: 12, padding: "2px 8px", background: "var(--ant-color-fill-secondary)" }}>
                {t("providers.connectionsCount", { count: connections.length })}
              </Tag>
            )}
            {isCliproxyManaged && (
              <Tag color="cyan" style={{ fontSize: 12, padding: "2px 8px" }}>
                嵌入式服务
              </Tag>
            )}
            {info?.notice?.apiKeyUrl && (
              <a
                href={info.notice.apiKeyUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 3, marginInlineStart: 4 }}
              >
                <span>{t("providers.getApiKey", "获取 API Key")}</span>
                <MaterialIcon name="open_in_new" size={13} />
              </a>
            )}
          </div>
        </div>

        {isCliproxyManaged ? null : kind === "compatible" ? (
          <Card className={styles.protocol} title={providerId.startsWith("anthropic-compatible-") ? "Anthropic 兼容端点" : "OpenAI 兼容端点"} extra={<Tag color="orange">兼容协议</Tag>}>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="端点名称">{node?.name ?? info?.name ?? providerId}</Descriptions.Item>
              <Descriptions.Item label="API 类型">{node?.apiType ?? "OpenAI Chat Completions"}</Descriptions.Item>
              <Descriptions.Item label="Base URL">{node?.baseUrl ?? info?.baseUrl ?? "未配置"}</Descriptions.Item>
              <Descriptions.Item label="模型路径">{node?.modelsPath ?? "/v1/models"}</Descriptions.Item>
            </Descriptions>
            <Alert type="info" showIcon style={{ marginTop: 12 }} message="兼容端点的连接凭证和模型列表由端点配置决定；先添加连接，再导入或添加模型。" />
          </Card>
        ) : null}
        {kind === "no-auth" && (
          <Card title="免鉴权提供者">
            <Space align="start" style={{ width: "100%", justifyContent: "space-between" }}>
              <Alert
                type="info"
                showIcon
                message="此提供者支持免鉴权/匿名调用。"
                description={
                  providerSupportsPat
                    ? "开启后允许匿名调用；也可在下方添加 PAT 以使用专属额度与账号权限。"
                    : "关闭后，路由不会再向该提供者发送匿名请求。"
                }
                style={{ flex: 1 }}
              />
              <Switch checked={noAuthEnabled} loading={noAuthBusy} onChange={(checked) => void toggleNoAuth(checked)} />
            </Space>
          </Card>
        )}
        {/* OAuth/Web-cookie/IDE flows are exposed from the Connections toolbar in
            the official page; do not add a generic warning card here. */}
        {(kind === "search" || kind === "webfetch") && (
          <Card title={kind === "webfetch" ? "搜索与网页抓取" : "搜索提供者"}>
            <Typography.Paragraph className={styles.muted}>按名称、能力或类别查找提供者。该类型不提供模型目录。</Typography.Paragraph>
          </Card>
        )}
        {kind === "upstream-proxy" && (
          <Card
            className={styles.section}
            styles={{ body: { padding: 16 } }}
            title={
              <div className={styles.cardTitleRow}>
                <span>CLIProxyAPI 上游代理账号</span>
                <Tag color="cyan">嵌入式服务</Tag>
              </div>
            }
            extra={
              <Space size={8} wrap>
                <Button
                  className={styles.headerActionButton}
                  icon={<MaterialIcon name="refresh" />}
                  onClick={() => {
                    void cliproxyAccountsQuery.refetch();
                    void modelsQuery.refetch();
                  }}
                >
                  {t("providers.refresh")}
                </Button>
                <Button
                  className={styles.headerActionButton}
                  icon={<MaterialIcon name="settings" />}
                  onClick={() => navigate("/dashboard/settings/routing")}
                >
                  打开路由设置
                </Button>
                <Button
                  className={styles.headerActionButton}
                  type="primary"
                  icon={<MaterialIcon name="terminal" />}
                  onClick={() => navigate("/dashboard/services")}
                >
                  管理嵌入式服务与账号
                </Button>
              </Space>
            }
          >
            {(cliproxyAccountsQuery.data?.length ?? 0) > 0 ? (
              <Table<CliproxyAccountItem>
                rowKey="id"
                size="middle"
                pagination={false}
                dataSource={cliproxyAccountsQuery.data ?? []}
                columns={[
                  {
                    title: "账号 / 凭据来源",
                    key: "name",
                    render: (_, record) => (
                      <div>
                        <Typography.Text strong style={{ fontSize: 13 }}>
                          {record.name}
                        </Typography.Text>
                        <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                          ID: {record.id}
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: "所属平台",
                    dataIndex: "provider",
                    key: "provider",
                    width: 140,
                    render: (p: string) => {
                      const colors: Record<string, string> = {
                        codex: "purple",
                        claude: "volcano",
                        gemini: "blue",
                        antigravity: "geekblue",
                        kimi: "cyan",
                        qwen: "orange",
                        "github-copilot": "green",
                      };
                      return <Tag color={colors[p.toLowerCase()] || "blue"}>{p.toUpperCase()}</Tag>;
                    },
                  },
                  {
                    title: "状态",
                    key: "status",
                    width: 100,
                    render: (_, record) => (
                      <Tag color={record.status === "active" ? "success" : "error"}>
                        {record.status === "active" ? "在线" : "失效"}
                      </Tag>
                    ),
                  },
                  {
                    title: "延迟",
                    dataIndex: "latencyMs",
                    key: "latencyMs",
                    width: 100,
                    render: (lat?: number) => (
                      <span style={{ fontFamily: "monospace", color: "#10b981", fontWeight: 600, fontSize: 12 }}>
                        {lat ? `${lat}ms` : "—"}
                      </span>
                    ),
                  },
                  {
                    title: "连通性测试",
                    key: "action",
                    width: 110,
                    align: "right",
                    render: (_, record) => (
                      <Button
                        size="small"
                        icon={<MaterialIcon name="play_arrow" style={{ fontSize: 14 }} />}
                        loading={testingCliproxyId === record.id}
                        onClick={() => void handleTestCliproxyAccount(record.id)}
                        style={{ boxShadow: "none" }}
                      >
                        测试
                      </Button>
                    ),
                  },
                ]}
              />
            ) : (
              <div style={{ padding: "20px 0", textAlign: "center" }}>
                <Typography.Paragraph className={styles.muted} style={{ margin: 0 }}>
                  CLIProxyAPI 运行中但暂未配置任何登录账号。您可点击右上角「管理嵌入式服务与账号」进行添加与授权。
                </Typography.Paragraph>
              </div>
            )}
          </Card>
        )}

        {(kind !== "no-auth" || providerSupportsPat) && kind !== "upstream-proxy" && (
          <Card
            className={styles.section}
            styles={{ body: { padding: 16 } }}
            title={
              <div className={styles.cardTitleRow}>
                <span>{t("providers.connections")}</span>
                <Button
                  className={styles.providerProxyButton}
                  color={providerProxyHost ? "orange" : "default"}
                  variant="filled"
                  icon={<MaterialIcon name="vpn_lock" />}
                  loading={proxyBusy && proxyTarget?.scope === "provider" && !proxyModalOpen}
                  onClick={() => void openProviderProxyConfig()}
                >
                  {providerProxyHost ?? t("providers.providerProxy")}
                </Button>
              </div>
            }
            extra={
              <Space size={8} wrap>
                {connections.length > 0 && (
                  <Button
                    className={styles.headerActionButton}
                    icon={<MaterialIcon name="swap_horiz" />}
                    loading={distributeProxyMutation.isPending}
                    onClick={() => distributeProxyMutation.mutate()}
                  >
                    {t("providers.distributeProxies", "分配代理")}
                  </Button>
                )}
                <Button
                  className={styles.headerActionButton}
                  icon={<MaterialIcon name="refresh" />}
                  onClick={() => {
                    void providerQuery.refetch();
                    void modelsQuery.refetch();
                  }}
                >
                  {t("providers.refresh")}
                </Button>
                {providerSupportsPat ? (
                  <>
                    <Button
                      className={styles.headerActionButton}
                      type="primary"
                      icon={<MaterialIcon name="add" />}
                      onClick={openAddConnection}
                    >
                      {tt("添加", "Add")}
                    </Button>
                    {providerId === "qoder" && (
                      <Button
                        className={styles.headerActionButton}
                        onClick={() => void startOAuth()}
                      >
                        {t("providers.experimentalOAuth", "实验性 OAuth")}
                      </Button>
                    )}
                  </>
                ) : (providerId === "github-copilot" || providerId === "agy" || providerId === "antigravity") ? (
                  <Button
                    className={styles.headerActionButton}
                    type="primary"
                    icon={<MaterialIcon name="passkey" />}
                    loading={oauthBusy}
                    onClick={() => void startOAuth()}
                  >
                    {t("providers.oauthAuthorize", "OAuth 授权")}
                  </Button>
                ) : isCliproxyManaged ? (
                  <Button
                    className={styles.headerActionButton}
                    type="primary"
                    icon={<MaterialIcon name="open_in_new" />}
                    onClick={() => {
                      const cliproxyNodeId = providerId.startsWith("openai-compatible-cliproxy-")
                        ? providerId.replace("openai-compatible-cliproxy-", "")
                        : node?.prefix?.startsWith("cpa-")
                          ? node.prefix.replace(/^cpa-/, "")
                          : "";
                      if (cliproxyNodeId) {
                        navigate(`/dashboard/providers/services?tab=cliproxy&instance=${encodeURIComponent(cliproxyNodeId)}`);
                      } else {
                        navigate("/dashboard/providers/services?tab=cliproxy");
                      }
                    }}
                  >
                    管理节点账号
                  </Button>
                ) : (
                  <Button
                    className={styles.headerActionButton}
                    type="primary"
                    icon={<MaterialIcon name="add" />}
                    onClick={openAddConnection}
                  >
                    {tt("添加", "Add")}
                  </Button>
                )}
              </Space>
            }
          >
          {connections.length > 0 && <div className={styles.connectionToolbar}>
            <Space className={styles.connectionToolbarFilters} wrap>
              <Checkbox checked={visibleConnections.length > 0 && visibleConnections.every((row) => selectedConnectionIds.includes(row.id))} indeterminate={selectedConnectionIds.length > 0 && selectedConnectionIds.length < visibleConnections.length} onChange={(event) => setSelectedConnectionIds(event.target.checked ? visibleConnections.map((row) => row.id) : [])}>{selectedConnectionIds.length > 0 ? t("providers.selectedCount", { count: selectedConnectionIds.length }) : t("providers.accountsCount", { count: connections.length })}</Checkbox>

              {/* Direct Dropdown for Account Routing */}
              {connections.length > 1 && (() => {
                const items: MenuProps["items"] = [
                  {
                    key: "default",
                    label: (
                      <Flex align="center" justify="space-between" gap={16} style={{ minWidth: 160 }}>
                        <span style={{ fontWeight: !routingStrategy ? 600 : 400 }}>{t("providers.inheritGlobal", "继承全局设置")}</span>
                        {!routingStrategy && <MaterialIcon name="check" size={16} style={{ color: "var(--ant-color-primary)" }} />}
                      </Flex>
                    ),
                    onClick: () => {
                      setRoutingStrategy("");
                      void saveRouting("", stickyLimit);
                    },
                  },
                  { type: "divider" },
                  ...[
                    { key: "fill-first", label: "fill-first (按序填满)" },
                    { key: "round-robin", label: "round-robin (轮询分发)" },
                    { key: "priority", label: "priority (固定优先级)" },
                    { key: "p2c", label: "p2c (双随机选优)" },
                    { key: "random", label: "random (完全随机)" },
                    { key: "least-used", label: "least-used (最少使用)" },
                  ].map((opt) => ({
                    key: opt.key,
                    label: (
                      <Flex align="center" justify="space-between" gap={16} style={{ minWidth: 160 }}>
                        <span style={{ fontWeight: routingStrategy === opt.key ? 600 : 400 }}>{opt.label}</span>
                        {routingStrategy === opt.key && <MaterialIcon name="check" size={16} style={{ color: "var(--ant-color-primary)" }} />}
                      </Flex>
                    ),
                    onClick: () => {
                      setRoutingStrategy(opt.key);
                      void saveRouting(opt.key, stickyLimit);
                    },
                  })),
                ];
                return (
                  <Dropdown
                    trigger={["click"]}
                    placement="bottomLeft"
                    menu={{ items }}
                  >
                  <Button
                    size="small"
                    icon={<MaterialIcon name="alt_route" size={14} />}
                    loading={routingBusy}
                    style={{
                      fontSize: 12,
                      height: 28,
                      paddingInline: 10,
                      borderRadius: 6,
                      background: routingStrategy ? "rgba(59, 130, 246, 0.12)" : "rgba(255, 255, 255, 0.05)",
                      borderColor: routingStrategy ? "var(--ant-color-primary-border)" : "var(--ant-color-border-secondary)",
                      color: routingStrategy ? "var(--ant-color-primary)" : "var(--ant-color-text-secondary)",
                    }}
                  >
                    <span>
                      {t("providers.accountRouting", "账号路由")}: {routingStrategy || t("providers.inheritGlobal", "继承全局设置")}
                    </span>
                    <MaterialIcon name="arrow_drop_down" size={14} />
                  </Button>
                  </Dropdown>
                );
              })()}

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
            </Space>
            <Space className={styles.bulkActions} wrap size={[8, 8]}>
              {selectedConnectionIds.length > 0 ? (
                <>
                  <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="toggle_on" />} loading={batchStatusMutation.isPending} onClick={() => void batchStatusMutation.mutateAsync(true)}>{t("providers.enableSelected")}</Button>
                  <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="toggle_off" />} loading={batchStatusMutation.isPending} onClick={() => void batchStatusMutation.mutateAsync(false)}>{t("providers.disableSelected")}</Button>
                  <Button className={styles.bulkActionButton} color="default" variant="filled" icon={<MaterialIcon name="play_arrow" />} loading={batchTestMutation.isPending} onClick={() => void batchTestMutation.mutateAsync(selectedConnectionIds)}>{t("providers.testSelected")}</Button>
                  <Popconfirm title={t("providers.deleteSelectedConfirm")} onConfirm={() => void batchDeleteMutation.mutateAsync()}>
                    <Button className={styles.bulkActionButton} color="danger" variant="filled" loading={batchDeleteMutation.isPending} icon={<MaterialIcon name="delete" />}>{t("providers.deleteSelected", { count: selectedConnectionIds.length })}</Button>
                  </Popconfirm>
                </>
              ) : (
                connections.length > 1 && (
                  <Button icon={<MaterialIcon name="play_arrow" />} loading={batchTestMutation.isPending} onClick={() => void batchTestMutation.mutateAsync()}>
                    {t("providers.testAll", "测试全部")}
                  </Button>
                )
              )}
            </Space>
          </div>}
          {connections.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <>
                  <Typography.Text>{t("providers.noConnections")}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    {providerId === "qoder"
                      ? "添加 Qoder PAT 或使用实验性 OAuth 登录。"
                      : providerSupportsPat
                      ? "添加 PAT (Personal Access Token) 以便以此凭证调用上游。"
                      : t("providers.noConnectionsDescription")}
                  </Typography.Text>
                  <br />
                  <Space style={{ marginTop: 8 }}>
                    <Button type="primary" icon={<MaterialIcon name="add" />} onClick={openAddConnection}>
                      {tt("添加", "Add")}
                    </Button>
                    {providerId === "qoder" && (
                      <Button onClick={() => void startOAuth()}>
                        {t("providers.experimentalOAuth", "实验性 OAuth")}
                      </Button>
                    )}
                  </Space>
                </>
              }
            />
          ) : (
            <List
              dataSource={visibleConnections}
              pagination={visibleConnections.length > 10 ? { pageSize: 10, hideOnSinglePage: true } : false}
              renderItem={(row, index) => <List.Item style={{ paddingBlock: 3, paddingInline: 0, border: 0 }}>
              <div
                className={styles.connectionRow}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => void handleDrop(e, index)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "all 0.2s",
                  border: dragOverIndex === index ? "1px dashed var(--ant-color-primary)" : "1px solid transparent",
                  backgroundColor: dragOverIndex === index ? "rgba(59, 130, 246, 0.06)" : undefined,
                  opacity: draggingIndex === index ? 0.4 : 1,
                }}
              >
                {/* Drag Handle */}
                {visibleConnections.length > 1 && (
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    style={{
                      cursor: "grab",
                      display: "flex",
                      alignItems: "center",
                      color: "var(--ant-color-text-quaternary)",
                      padding: "2px 0",
                      marginRight: 2,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ant-color-text-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ant-color-text-quaternary)"; }}
                    title="拖动调整优先级与排序"
                  >
                    <MaterialIcon name="drag_indicator" size={16} />
                  </div>
                )}
                <Checkbox checked={selectedConnectionIds.includes(row.id)} onChange={(event) => setSelectedConnectionIds((current) => event.target.checked ? [...new Set([...current, row.id])] : current.filter((id) => id !== row.id))} />
                <Space orientation="vertical" size={0} className={styles.connectionIdentity}>
                  <div className={styles.connectionNameRow}>
                    <MaterialIcon className={styles.connectionNameIcon} name="lock" size={16} />
                    {(() => {
                      const specific = (
                        typeof row.providerSpecificData === "object" && row.providerSpecificData !== null
                          ? row.providerSpecificData
                          : typeof row.providerSpecificData === "string"
                            ? (() => { try { return JSON.parse(row.providerSpecificData); } catch { return {}; } })()
                            : {}
                      ) as Record<string, unknown>;
                      const rawAccount = (specific?.accountEmail as string | undefined) || row.name;
                      const cleanAccount = cleanAccountName(rawAccount);
                      return (
                        <Typography.Text strong ellipsis={{ tooltip: cleanAccount }}>
                          {maskAccountName(cleanAccount)}
                        </Typography.Text>
                      );
                    })()}
                  </div>
                </Space>
                <Divider type="vertical" className={styles.connectionDivider} />
                <Space wrap align="center" size={[4, 4]} className={styles.connectionFeatures}>
                  {connectionStatus(row, t, styles.statusTag)}
                  <Button className={styles.actionButton} size="small" color={row.rateLimitProtection ? "green" : "default"} variant="filled" icon={<MaterialIcon name="shield" />} onClick={() => rateLimitMutation.mutate({ id: row.id, enabled: !row.rateLimitProtection })}>{row.rateLimitProtection ? t("providers.protected") : t("providers.unprotected")}</Button>
                  <Button className={styles.actionButton} size="small" color={row.quotaVisible === false ? "default" : "blue"} variant="filled" icon={<MaterialIcon name="visibility" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { quotaVisible: row.quotaVisible === false } })}>{t("providers.quota")}</Button>
                  {!isCodingPlanProvider && <Button className={styles.actionButton} size="small" color={(row.providerSpecificData as Record<string, unknown> | undefined)?.autoSync ? "green" : "default"} variant="filled" icon={<MaterialIcon name="sync" />} onClick={() => toggleConnectionAutoSync(row)}>{t("providers.sync")}</Button>}
                  <Button className={styles.actionButton} size="small" color={row.proxyEnabled === false ? "default" : "green"} variant="filled" icon={<MaterialIcon name="vpn_lock" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { proxyEnabled: row.proxyEnabled === false } })}>{t("providers.proxy")}</Button>
                  <Button className={styles.actionButton} size="small" color={row.perKeyProxyEnabled ? "purple" : "default"} variant="filled" icon={<MaterialIcon name="key" />} onClick={() => featureMutation.mutate({ id: row.id, patch: { perKeyProxyEnabled: !row.perKeyProxyEnabled } })}>{t("providers.perKey")}</Button>
                  {Boolean(
                    (row.providerSpecificData as Record<string, unknown> | undefined)?.refreshToken ||
                    row.refreshToken
                  ) && (
                    <Tag color="cyan">{tt("自动续期已启用", "Auto-Renewal")}</Tag>
                  )}
                  {(row.provider === "kimi-web" || row.provider === "kimi_web") &&
                    !Boolean(
                      (row.providerSpecificData as Record<string, unknown> | undefined)?.refreshToken ||
                      row.refreshToken
                    ) && (
                    <Tag color="default">{tt("单Token", "Single Token")}</Tag>
                  )}
                  {row.baseUrl && <Tag>{row.baseUrl}</Tag>}
                  {row.defaultModel && <Tag color="blue">{row.defaultModel}</Tag>}
                  {row.lastError && <Tag color={getConnectionHealth(row) === "error" ? "error" : "warning"}>{row.lastError}</Tag>}
                </Space>
                <Space size={[6, 4]} wrap align="center" className={styles.connectionActions}>
                  {/* Switch placed as the FIRST action on the right */}
                  <Switch
                    size="small"
                    checked={row.isActive !== false}
                    loading={statusMutation.isPending}
                    onChange={(checked) => statusMutation.mutate({ id: row.id, isActive: checked })}
                  />
                  <Button className={styles.actionButton} size="small" color="blue" variant="filled" loading={testMutation.isPending} icon={<MaterialIcon name="refresh" />} onClick={() => testMutation.mutate(row.id)}>{t("providers.retest")}</Button>
                  {(row.authType === "oauth" || kind === "oauth" || kind === "ide" || row.provider === "kimi-web" || row.provider === "kimi_web") && (
                    <Button
                      className={styles.actionButton}
                      size="small"
                      color="orange"
                      variant="filled"
                      loading={refreshTokenMutation.isPending}
                      icon={<MaterialIcon name="token" />}
                      onClick={() => refreshTokenMutation.mutate(row)}
                    >
                      {t("providers.token")}
                    </Button>
                  )}
                  {(row.authType === "oauth" || kind === "oauth" || kind === "ide") && <Button className={styles.actionButton} size="small" color="gold" variant="filled" icon={<MaterialIcon name="passkey" />} onClick={() => void startOAuth(row.id)}>{t("providers.reauthorize")}</Button>}

                  <Button className={styles.actionButton} size="small" variant="filled" icon={<MaterialIcon name="edit" />} onClick={() => openEditConnection(row)}>{t("providers.edit")}</Button>
                  <Button className={styles.actionButton} size="small" variant="filled" icon={<MaterialIcon name="vpn_lock" />} onClick={() => void openProxyConfig(row)}>{t("providers.proxyConfig")}</Button>
                  <Popconfirm title={t("providers.deleteConnectionConfirm")} onConfirm={() => deleteMutation.mutate(row.id)}><Button className={styles.actionButton} size="small" color="danger" variant="filled" icon={<MaterialIcon name="delete" />}>{t("providers.delete")}</Button></Popconfirm>
                </Space>
              </div>
            </List.Item>}
          />
        )}
      </Card>
    )}

        {kind === "search" ? (
          <SearchProviderCard providerId={providerId} />
        ) : (
          <>
            {(kind !== "upstream-proxy" || providerId === "cliproxyapi") && (
              <>
                <ProviderModelsSection
                  providerId={providerId}
                  providerDisplayAlias={providerDisplayAlias}
                  models={availableModelRows}
                  modelAliases={aliasesQuery.data || {}}
                  allowModelImport={!isCodingPlanProvider && (kind !== "upstream-proxy" || providerId === "cliproxyapi") && Boolean(connections.length > 0)}
                  autoFetchModels={!isCodingPlanProvider && (kind !== "upstream-proxy" || providerId === "cliproxyapi") && autoFetchModelsEnabled}
                  onToggleAutoFetchModels={isCodingPlanProvider ? undefined : handleToggleAutoFetchModels}
                  autoSync={!isCodingPlanProvider && (kind !== "upstream-proxy" || providerId === "cliproxyapi") && autoSyncEnabled}
                  onToggleAutoSync={isCodingPlanProvider ? undefined : handleToggleAutoSync}
                  onImportModels={isCodingPlanProvider ? undefined : () => syncModelsMutation.mutateAsync().then(() => {})}
                  importingModels={!isCodingPlanProvider && syncModelsMutation.isPending}
                  onClearAllModels={() => clearAllCustomModelsMutation.mutateAsync().then(() => {})}
                  clearingModels={clearAllCustomModelsMutation.isPending}
                  onSetAlias={(mId, alias) => setAliasMutation.mutateAsync({ modelId: mId, alias }).then(() => {})}
                  onDeleteAlias={(alias) => deleteAliasMutation.mutateAsync(alias).then(() => {})}
                  onToggleModelHidden={(mId, hidden) => toggleVisibilityMutation.mutateAsync({ modelIds: [mId], isHidden: hidden }).then(() => {})}
                  onSaveModelCompat={(mId, patch) => saveModelCompatMutation.mutateAsync({ modelId: mId, patch }).then(() => {})}
                  onTestModel={handleTestModel}
                  testingModelId={testingModelId}
                  onTestAll={handleTestAll}
                  testingAll={testingAll}
                  testProgress={testProgress}
                />

                <CustomModelsSection
                  providerId={providerId}
                  providerDisplayAlias={providerDisplayAlias}
                  customModels={customModelRows}
                  onAddCustomModel={(m) => addCustomModelMutation.mutateAsync(m).then(() => {})}
                  onUpdateCustomModel={(m) => updateCustomModelMutation.mutateAsync(m).then(() => {})}
                  onRemoveCustomModel={(mId, resetOverride) => removeCustomModelMutation.mutateAsync({ modelId: mId, resetOverride }).then(() => {})}
                  onToggleModelHidden={(mId, hidden) => toggleVisibilityMutation.mutateAsync({ modelIds: [mId], isHidden: hidden }).then(() => {})}
                  onSaveModelCompat={(mId, patch) => saveModelCompatMutation.mutateAsync({ modelId: mId, patch }).then(() => {})}
                />
              </>
            )}
          </>
        )}

        {kind !== "upstream-proxy" && (
          <ProviderPlaygroundPanel
            providerId={providerId}
            providerDisplayAlias={providerDisplayAlias}
            serviceKinds={info?.serviceKinds || ["llm"]}
            availableModels={availableModelRows.map((m) => ({ id: m.id, name: m.name }))}
          />
        )}

        {(kind === "standard" || kind === "compatible" || kind === "oauth" || kind === "web-cookie" || kind === "ide" || kind === "search" || kind === "webfetch") && (
          <>
            <ProviderParamFilterSection
              providerId={providerId}
              config={(filtersQuery.data as any) || {}}
              onSave={(cfg) => saveParamFiltersMutation.mutateAsync(cfg).then(() => {})}
              onReset={() => resetParamFiltersMutation.mutateAsync().then(() => {})}
              loading={saveParamFiltersMutation.isPending}
            />

            <ProviderInterceptionSection
              providerId={providerId}
              config={(interceptionQuery.data as any) || {}}
              onUpdate={(cfg) => updateInterceptionMutation.mutateAsync(cfg).then(() => {})}
              loading={updateInterceptionMutation.isPending}
            />

            <ProviderCcAliasSection
              providerId={providerId}
              data={(ccAliasQuery.data as any) || { provider: null, models: {} }}
              onUpdateSetting={(scope, value, modelId) => updateCcAliasMutation.mutateAsync({ scope, value, modelId }).then(() => {})}
              loading={updateCcAliasMutation.isPending}
            />
          </>
        )}
      </Space>
      <Modal title={proxyTarget?.scope === "provider" ? t("providers.providerProxyConfig") : t("providers.connectionProxyConfig")} open={proxyModalOpen} onCancel={() => { if (!proxyBusy) setProxyModalOpen(false); }} onOk={() => void saveProxyConfig()} confirmLoading={proxyBusy} okText={t("providers.save")} cancelText={t("providers.cancel")}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Typography.Text type="secondary">{t("providers.proxyConfigDescription", { target: proxyTarget?.label ?? t("providers.currentTarget") })}</Typography.Text>
          <Select value={proxySelection} onChange={setProxySelection} options={[{ value: "", label: t("providers.noProxy") }, ...proxyOptions]} style={{ width: "100%" }} loading={proxyBusy} />
        </Space>
      </Modal>
      <Modal
        title={
          editingConnection
            ? tt(`编辑 ${info?.name ?? providerId} 连接`, `Edit ${info?.name ?? providerId} Connection`)
            : providerSupportsPat
            ? `添加 ${info?.name ?? providerId} PAT`
            : t("providers.addConnectionTitle", { provider: info?.name ?? providerId })
        }
        open={addConnectionOpen}
        onCancel={() => {
          if (!saveConnectionMutation.isPending) {
            setAddConnectionOpen(false);
            setEditingConnection(null);
          }
        }}
        okText={editingConnection ? tt("保存", "Save") : providerSupportsPat ? t("providers.addPat", "添加 PAT") : t("providers.add")}
        cancelText={t("providers.cancel")}
        confirmLoading={saveConnectionMutation.isPending}
        okButtonProps={{
          disabled:
            !connectionName.trim() ||
            (!editingConnection &&
              kind !== "no-auth" &&
              kind !== "compatible" &&
              !providerSupportsPat &&
              !connectionApiKey.trim() &&
              !connectionBaseUrl.trim()),
        }}
        onOk={() => saveConnectionMutation.mutate()}
        width={580}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {renderWebSessionGuide()}
          <label>
            <Typography.Text>{t("providers.connectionName")}</Typography.Text>
            <Input
              value={connectionName}
              onChange={(event) => setConnectionName(event.target.value)}
              placeholder="Primary"
              style={{ marginTop: 6 }}
            />
          </label>
          <label>
            <Typography.Text strong>
              {providerId === "qoder"
                ? "Qoder PAT"
                : webSessionRequirement?.credentialName
                ? `${webSessionRequirement.credentialName} (${webSessionRequirement.kind === "token" ? tt("Web 会话令牌", "Web Session Token") : tt("Web 会话凭据", "Web Session Credential")})`
                : kind === "web-cookie"
                ? tt("Cookie / Session 凭据", "Cookie / Session Credential")
                : kind === "oauth" || kind === "ide"
                ? "Access Token / API Key"
                : kind === "compatible"
                ? "API Key"
                : providerSupportsPat
                ? "PAT (Personal Access Token)"
                : "API Key / PAT"}
            </Typography.Text>
            <Input.Password
              value={connectionApiKey}
              onChange={(event) => setConnectionApiKey(event.target.value)}
              placeholder={
                editingConnection
                  ? tt("留空以保持现有凭据不变", "Leave blank to keep existing credential")
                  : providerId === "qoder"
                  ? "粘贴 Qoder PAT (例如 pat_...)"
                  : webSessionRequirement?.placeholder
                  ? webSessionRequirement.placeholder
                  : kind === "web-cookie"
                  ? "粘贴 Cookie 或 Session 凭据..."
                  : kind === "oauth" || kind === "ide"
                  ? "输入 Access Token 或 API Key..."
                  : kind === "compatible"
                  ? "输入 API Key (可为空)..."
                  : t("providers.enterCredential")
              }
              style={{ marginTop: 6 }}
            />
          </label>
          {Boolean((webSessionRequirement && webSessionRequirement.kind !== "none" && webSessionRequirement.refreshToken) || providerId === "kimi-web") && (
            <label>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <Typography.Text strong>
                  {tt("Refresh Token (刷新令牌 · 双 Token 自动续期)", "Refresh Token (Dual-Token Auto-Renewal)")}
                </Typography.Text>
                <Tag color="blue">{tt("可选 · 推荐", "Optional · Recommended")}</Tag>
              </div>
              <Input.Password
                value={connectionRefreshToken}
                onChange={(event) => setConnectionRefreshToken(event.target.value)}
                placeholder={
                  editingConnection
                    ? tt("留空以保持现有 Refresh Token 不变", "Leave blank to keep existing Refresh Token")
                    : (webSessionRequirement && webSessionRequirement.kind !== "none" && webSessionRequirement.refreshToken?.placeholder) ||
                      tt("从 Local Storage 复制 refresh_token（开启静默自动续期）", "Copy refresh_token from Local Storage to enable auto-renewal")
                }
                style={{ marginTop: 2 }}
              />
              <div style={{ fontSize: 12, color: "var(--ant-color-text-tertiary)", marginTop: 4 }}>
                {tt(
                  "配置后系统后台将在 access_token 到期前自动使用 refresh_token 静默换取新令牌并轮换，免去手动更新重新复制的麻烦。",
                  "The system will automatically refresh and rotate tokens before access_token expires when configured."
                )}
              </div>
            </label>
          )}
          {(kind === "compatible" || connectionBaseUrl || Boolean(node?.baseUrl)) && (
            <label>
              <Typography.Text>Base URL</Typography.Text>
              <Input
                value={connectionBaseUrl}
                onChange={(event) => setConnectionBaseUrl(event.target.value)}
                placeholder={node?.baseUrl ?? info?.baseUrl ?? "https://api.example.com/v1"}
                style={{ marginTop: 6 }}
              />
            </label>
          )}
          <label>
            <Typography.Text>{t("providers.priority")}</Typography.Text>
            <br />
            <InputNumber
              min={0}
              value={connectionPriority}
              onChange={(value) => setConnectionPriority(value ?? 1)}
              style={{ marginTop: 6, width: 140 }}
            />
          </label>
          {editingConnection && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
              <Button
                type="link"
                style={{ padding: 0, fontSize: 12 }}
                onClick={() => {
                  const connId = editingConnection.id;
                  setAddConnectionOpen(false);
                  setEditingConnection(null);
                  navigate(`/dashboard/providers/${providerId}/connections/${connId}`);
                }}
              >
                {tt("打开高级底层配置页面 →", "Open advanced configuration page →")}
              </Button>
            </div>
          )}
        </Space>
      </Modal>
      <Modal
        title={`${info?.name ?? providerId} ${oauthSession?.connectionId ? "重新授权" : "授权"}`}
        open={oauthOpen}
        onCancel={() => { if (!oauthBusy) { setOauthOpen(false); setOauthSession(null); setOauthDevice(null); } }}
        footer={<Space><Button onClick={() => { setOauthOpen(false); setOauthSession(null); setOauthDevice(null); }} disabled={oauthBusy}>关闭</Button>{!oauthDevice && <Button type="primary" loading={oauthBusy} disabled={!oauthCallbackUrl.trim() || !oauthSession} onClick={() => void completeOAuth()}>完成授权</Button>}</Space>}
      >
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          {oauthDevice ? (
            <Alert showIcon type="info" message="等待设备授权完成" description={<span>请在新打开的页面完成登录：<Typography.Link href={oauthDevice.verificationUrl} target="_blank" rel="noreferrer">打开验证页面</Typography.Link>。完成后本页会自动轮询并添加连接。</span>} />
          ) : (
            <>
              <Alert
                showIcon
                type="info"
                message="已打开官方授权页面"
                description={
                  providerId === "codex" || providerId === "openai" || providerId === "xai-oauth" || providerId === "grok-cli" || providerId === "openference" || providerId === "agy" || providerId === "antigravity"
                    ? "完成登录后，浏览器通常会自动跳转到无法直接打开的本地回环地址（例如 http://localhost:1455/... 或 127.0.0.1，页面显示“无法访问此网站”属正常现象）。请直接复制浏览器地址栏中的完整 URL 地址粘贴到下方输入框，点击“完成授权”。"
                    : "完成登录后，将浏览器地址栏中的回调地址粘贴到下方；本页面不会显示或保存你的授权令牌。"
                }
              />
              <Input.TextArea
                value={oauthCallbackUrl}
                onChange={(event) => setOauthCallbackUrl(event.target.value)}
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder="粘贴浏览器地址栏中的 callback?code=...&state=... 完整地址"
              />
            </>
          )}
          {oauthError && <Alert showIcon type="error" message={oauthError} />}
        </Space>
      </Modal>

    </div>
  );
}
