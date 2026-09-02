/**
 * Providers 列表页。
 *
 * 页面结构参考线上 Providers：工具栏、筛选视图、按 provider 聚合的卡片分区。
 * 这里使用 antd 的标准组件承载交互，Provider catalog、兼容节点和连接状态均从 BFF 获取。
 */
import { createElement, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { createStyles } from "antd-style";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Flex,
  Input,
  Modal,
  Row,
  Segmented,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import AntigravityColorIcon from "@lobehub/icons/es/Antigravity/components/Color";
import AwsColorIcon from "@lobehub/icons/es/Aws/components/Color";
import ClineMonoIcon from "@lobehub/icons/es/Cline/components/Mono";
import QoderColorIcon from "@lobehub/icons/es/Qoder/components/Color";
import TencentColorIcon from "@lobehub/icons/es/Tencent/components/Color";
import {
  embeddedServicesApi,
  providersApi,
  settingsApi,
  type ProviderConnection,
} from "@/entities/api";
import { useI18n } from "@/i18n";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

interface ProviderGroup {
  key: string;
  provider: string;
  displayName: string;
  category: string;
  color?: string;
  icon?: string;
  iconUrl?: string;
  textIcon?: string;
  connections: ProviderConnection[];
  connected: number;
  errorCount: number;
  serviceKinds?: string[];
  deprecated?: boolean;
  deprecationReason?: string;
  subscriptionRisk?: boolean;
  riskNoticeVariant?: "oauth" | "webCookie" | "deprecated" | "embedded-service";
  hasFree?: boolean;
  freeNote?: string;
  isIde?: boolean;
  dashboardSection?: string;
  expiryStatus?: "expired" | "expiring_soon";
  popularityRank?: number;
  blocked?: boolean;
  codexServiceTier?: string;
  upstreamProxyStatus?: { running: boolean; accountCount?: number; label: string };
}

type DisplayMode = "all" | "configured" | "compact";

const CATEGORY_LABELS: Record<string, string> = {
  "no-auth": "免鉴权",
  oauth: "OAuth",
  "web-cookie": "网络 Cookie",
  local: "本地",
  search: "搜索",
  audio: "音频",
  "upstream-proxy": "上游代理",
  "cloud-agent": "云代理",
  webfetch: "网页抓取",
  apikey: "API 密钥",
  compatible: "兼容",
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  free: "#22c55e",
  "no-auth": "#78716c",
  oauth: "#3b82f6",
  apikey: "#f59e0b",
  compatible: "#f97316",
  "web-cookie": "#a855f7",
  search: "#14b8a6",
  audio: "#f43f5e",
  local: "#10b981",
  "upstream-proxy": "#6366f1",
  "cloud-agent": "#8b5cf6",
};

const PROVIDER_TITLE_COLOR = "#3B82F6";

const useProviderStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    // Keep the last provider row clear of the viewport edge when the shell
    // scrollbar is scrolled all the way down.
    paddingBottom: 24,
  },
  card: {
    "&.ant-card-hoverable:hover": {
      borderColor: token.colorPrimary,
      boxShadow: "none",
    },
  },
}));

function connectionState(connection: ProviderConnection, t: (key: string) => string) {
  if (connection.isActive === false) {
    return { label: t("providers.statusDisabled"), color: "default", icon: <MaterialIcon name="cancel" /> };
  }
  if (isConnectionErrored(connection)) {
    return { label: t("providers.statusError"), color: "error", icon: <MaterialIcon name="error" /> };
  }
  return { label: t("apiKeys.active"), color: "success", icon: <MaterialIcon name="check_circle" /> };
}

function isConnectionConnected(connection: ProviderConnection): boolean {
  if (connection.isActive === false) return false;
  const status = connection.testStatus ?? "unknown";
  if (status === "error" || status === "expired" || status === "unavailable") {
    if (status !== "unavailable") return false;
    const cooldown = connection.rateLimitedUntil ? new Date(connection.rateLimitedUntil).getTime() : NaN;
    return !Number.isFinite(cooldown) || cooldown <= Date.now();
  }
  return status === "active" || status === "success" || status === "unknown";
}

function isConnectionErrored(connection: ProviderConnection): boolean {
  if (connection.isActive === false) return false;
  const status = connection.testStatus ?? "unknown";
  if (status === "error" || status === "expired") return true;
  if (status === "unavailable") {
    const cooldown = connection.rateLimitedUntil ? new Date(connection.rateLimitedUntil).getTime() : NaN;
    return Number.isFinite(cooldown) && cooldown > Date.now();
  }
  return Boolean(connection.lastErrorType || connection.errorCode || connection.lastError);
}

function SummaryChip({
  label,
  configured,
  total,
  active,
  onClick,
}: {
  label: string;
  configured: number;
  total: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button size="small" shape="round" type={active ? "primary" : "default"} onClick={onClick}>
      {label} <Typography.Text type={active ? undefined : "secondary"} style={{ fontSize: 11 }}>{configured}/{total}</Typography.Text>
    </Button>
  );
}

export default function ProvidersPage() {
  const { styles } = useProviderStyles();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [mode, setMode] = useState<DisplayMode>("all");
  const [activeServiceKind, setActiveServiceKind] = useState<string | null>(null);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const providersQuery = useQuery({
    queryKey: ["providers"],
    queryFn: () => providersApi.list(),
    staleTime: 15_000,
  });

  const catalogQuery = useQuery({
    queryKey: ["providers", "catalog"],
    queryFn: () => providersApi.catalog(),
    staleTime: 5 * 60_000,
  });

  const nodesQuery = useQuery({
    queryKey: ["provider-nodes"],
    queryFn: () => providersApi.listNodes(),
    staleTime: 30_000,
  });

  // Orbit's Providers page reads these as independent, best-effort sources.
  // Keep them separate so an unavailable enrichment never hides real connections.
  const expirationQuery = useQuery({
    queryKey: ["providers", "expiration"],
    queryFn: () => providersApi.expiration(),
    staleTime: 30_000,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings", "sidebar"],
    queryFn: () => settingsApi.sidebar(),
    staleTime: 30_000,
  });
  const openRouterStatsQuery = useQuery({
    queryKey: ["providers", "openrouter-stats"],
    queryFn: () => providersApi.openRouterStats(),
    staleTime: 24 * 60 * 60_000,
  });
  const cliproxyServiceQuery = useQuery({
    queryKey: ["embedded-services", "cliproxy"],
    queryFn: () => embeddedServicesApi.getStatus("cliproxy").catch(() => null),
    staleTime: 30_000,
  });
  const ninerouterServiceQuery = useQuery({
    queryKey: ["embedded-services", "9router"],
    queryFn: () => embeddedServicesApi.getStatus("9router").catch(() => null),
    staleTime: 30_000,
  });
  const cliproxyAccountsQuery = useQuery({
    queryKey: ["cliproxy-accounts"],
    queryFn: () => embeddedServicesApi.getCliproxyAccounts().catch(() => []),
    staleTime: 30_000,
  });

  const connections = providersQuery.data?.connections ?? [];
  const catalogCategories = catalogQuery.data?.categories ?? [];
  const groups = useMemo(() => {
    const map = new Map<string, ProviderGroup>();
    const cliproxyService = cliproxyServiceQuery.data;
    const ninerouterService = ninerouterServiceQuery.data;
    const cliproxyAccounts = cliproxyAccountsQuery.data ?? [];

    for (const category of catalogCategories) {
      for (const provider of category.providers) {
        if (provider.hiddenFromDashboard) continue;
        const key = `${category.key}:${provider.id}`;

        let upstreamProxyStatus: { running: boolean; accountCount?: number; label: string } | undefined;
        if (provider.id === "cliproxyapi" || provider.id === "cliproxy") {
          const isRunning = cliproxyService?.state === "running";
          if (cliproxyAccounts.length > 0) {
            upstreamProxyStatus = {
              running: true,
              accountCount: cliproxyAccounts.length,
              label: t("providersPage.connectedCount", { count: cliproxyAccounts.length }),
            };
          } else if (isRunning) {
            upstreamProxyStatus = {
              running: true,
              accountCount: 1,
              label: t("providersPage.connectedCount", { count: 1 }),
            };
          } else if (cliproxyService?.state && cliproxyService.state !== "not_installed") {
            upstreamProxyStatus = { running: false, label: t("providersPage.notConnected") };
          } else {
            upstreamProxyStatus = { running: false, label: t("providersPage.noConnections") };
          }
        } else if (provider.id === "9router" || provider.id === "ninerouter") {
          const isRunning = ninerouterService?.state === "running";
          if (isRunning) {
            upstreamProxyStatus = {
              running: true,
              accountCount: 1,
              label: t("providersPage.connectedCount", { count: 1 }),
            };
          } else if (ninerouterService?.state && ninerouterService.state !== "not_installed") {
            upstreamProxyStatus = { running: false, label: t("providersPage.notConnected") };
          } else {
            upstreamProxyStatus = { running: false, label: t("providersPage.noConnections") };
          }
        } else if (category.key === "upstream-proxy") {
          upstreamProxyStatus = { running: false, label: t("providersPage.noConnections") };
        }

        map.set(key, {
          key,
          provider: provider.id,
          displayName: provider.name,
          category: category.key,
          color: provider.color,
          icon: provider.icon,
          textIcon: provider.textIcon,
          serviceKinds: provider.serviceKinds,
          deprecated: provider.deprecated,
          deprecationReason: provider.deprecationReason,
          subscriptionRisk: provider.subscriptionRisk,
          riskNoticeVariant: provider.riskNoticeVariant,
          hasFree: provider.hasFree,
          freeNote: provider.freeNote,
          isIde: provider.isIde,
          dashboardSection: provider.dashboardSection,
          connections: [],
          connected: 0,
          errorCount: 0,
          blocked: category.key === "no-auth" && (settingsQuery.data?.blockedProviders ?? []).includes(provider.id),
          upstreamProxyStatus,
          codexServiceTier:
            provider.id === "codex"
              ? typeof settingsQuery.data?.codexServiceTier === "string"
                ? settingsQuery.data.codexServiceTier
                : settingsQuery.data?.codexServiceTier === true
                  ? "priority"
                  : undefined
              : undefined,
        });
      }
    }

    for (const connection of connections) {
      const matchingKeys = [...map.keys()].filter((key) => key.endsWith(`:${connection.provider}`));
      const key = matchingKeys[0] ?? `configured:${connection.provider}`;
      const group = map.get(key) ?? {
        key,
        provider: connection.provider,
        displayName: connection.provider,
        category: "configured",
        connections: [],
        connected: 0,
        errorCount: 0,
      };
      group.connections.push(connection);
      if (isConnectionConnected(connection)) group.connected += 1;
      if (isConnectionErrored(connection)) {
        group.errorCount += 1;
      }
      map.set(key, group);
    }

    for (const node of nodesQuery.data?.nodes ?? []) {
      const key = `compatible:${node.id}`;
      if (map.has(key)) continue;
      map.set(key, {
        key,
        provider: node.id,
        displayName: node.name || node.id,
        category: "compatible",
        color: "#10A37F",
        icon: "hub",
        iconUrl: node.iconUrl,
        textIcon: "OC",
        serviceKinds: ["llm"],
        connections: [],
        connected: 0,
        errorCount: 0,
      });
    }

    const expirations = expirationQuery.data?.list ?? [];
    const statsBySlug = new Map((openRouterStatsQuery.data?.data ?? []).map((item) => [item.slug, item]));
    for (const group of map.values()) {
      const expiry = expirations.find((item) => item.provider === group.provider && (item.status === "expired" || item.status === "expiring_soon"));
      if (expiry) group.expiryStatus = expiry.status as "expired" | "expiring_soon";
      group.popularityRank = statsBySlug.get(group.provider)?.popularityRank;
    }

    return [...map.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [catalogCategories, connections, expirationQuery.data?.list, nodesQuery.data?.nodes, openRouterStatsQuery.data?.data, settingsQuery.data?.blockedProviders, cliproxyServiceQuery.data, ninerouterServiceQuery.data, cliproxyAccountsQuery.data, t]);

  const isGroupConfigured = (group: ProviderGroup): boolean => {
    if (group.category === "no-auth") return !group.blocked;
    if (group.category === "upstream-proxy") return Boolean(group.upstreamProxyStatus?.running);
    return group.connections.length > 0;
  };

  const categoryMenu = useMemo(() => {
    const connectionCounts = new Map<string, number>();
    for (const group of groups) {
      if (isGroupConfigured(group)) {
        connectionCounts.set(group.category, (connectionCounts.get(group.category) ?? 0) + 1);
      }
    }
    const categories = catalogCategories
      .map((category) => ({
        key: category.key,
        label: t(`providersPage.category.${category.key}`, undefined, CATEGORY_LABELS[category.key] ?? category.key),
        total: category.providers.filter((provider) => !provider.hiddenFromDashboard).length,
        configured: connectionCounts.get(category.key) ?? 0,
      }))
      .filter((category) => category.total > 0);
    const webFetchGroups = groups.filter((group) => (group.serviceKinds ?? []).includes("webFetch"));
    if (webFetchGroups.length > 0) {
      categories.push({
        key: "webfetch",
        label: t("providersPage.category.webfetch"),
        total: webFetchGroups.length,
        configured: webFetchGroups.filter((group) => group.connections.length > 0).length,
      });
    }
    const compatibleTotal = groups.filter((group) => group.category === "compatible").length;
    if (compatibleTotal > 0) {
      categories.push({ key: "compatible", label: t("providersPage.category.compatible"), total: compatibleTotal, configured: 0 });
    }
    return categories;
  }, [catalogCategories, groups, t]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesSearch =
        !query ||
        group.provider.toLowerCase().includes(query) ||
        group.displayName.toLowerCase().includes(query) ||
        group.connections.some((connection) => connection.name.toLowerCase().includes(query));
      const matchesMode = mode !== "configured" || isGroupConfigured(group);
      const matchesCategory = !activeCategory || (
        activeCategory === "ide"
          ? group.isIde === true
          : activeCategory === "webfetch"
            ? (group.serviceKinds ?? []).includes("webFetch")
            : group.category === activeCategory
      );
      const matchesFree = !showFreeOnly || group.hasFree === true;
      const modelQuery = modelSearch.trim().toLowerCase();
      const matchesModel = !modelQuery || group.provider.toLowerCase().includes(modelQuery) || group.connections.some((connection) => connection.defaultModel?.toLowerCase().includes(modelQuery));
      const matchesServiceKind = !activeServiceKind || (group.serviceKinds ?? []).includes(activeServiceKind);
      return matchesSearch && matchesMode && matchesCategory && matchesFree && matchesModel && matchesServiceKind;
    });
  }, [activeCategory, activeServiceKind, groups, mode, modelSearch, search, showFreeOnly]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["providers"] });
    void queryClient.invalidateQueries({ queryKey: ["provider-nodes"] });
    void queryClient.invalidateQueries({ queryKey: ["providers", "expiration"] });
  };
  const [messageApi, contextHolder] = message.useMessage();

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      providersApi.update(id, { isActive }),
    onSuccess: () => {
      invalidate();
      messageApi.success("连接状态已更新");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "切换失败"),
  });

  const testMutation = useMutation({
    mutationFn: ({ mode, provider }: { mode: string; provider?: string }) =>
      providersApi.testBatch(mode, provider),
    onSuccess: (result) => {
      invalidate();
      messageApi.success(`测试完成：${result.summary.passed}/${result.summary.total} 通过`);
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "测试失败"),
  });

  const importMutation = useMutation({
    mutationFn: async (text: string) => {
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { throw new Error("导入内容必须是有效 JSON"); }
      const providers = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === "object" && Array.isArray((parsed as { providers?: unknown }).providers) ? (parsed as { providers: unknown[] }).providers : null);
      if (!providers || providers.length === 0 || providers.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
        throw new Error("JSON 必须是 Provider 对象数组，或 { providers: [...] }");
      }
      return providersApi.import(providers as Array<Record<string, unknown>>);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      if (result.errors.length > 0) messageApi.warning(`已导入 ${result.importedCount} 个，${result.errors.length} 个失败`);
      else messageApi.success(`已导入 ${result.importedCount} 个 Provider`);
      setImportOpen(false);
      setImportText("");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "导入失败"),
  });

  const compactRows = filteredGroups.flatMap((group) =>
    group.connections.map((connection) => ({ ...connection, providerName: group.displayName })),
  );

  const compactColumns: TableColumnsType<(typeof compactRows)[number]> = [
    {
      title: t("nav.item.providers"),
      dataIndex: "providerName",
      key: "provider",
      render: (provider: string) => (
        <Space>
          <Avatar size="small" icon={<MaterialIcon name="api" />} />
          <Typography.Text strong>{provider}</Typography.Text>
        </Space>
      ),
    },
    {
      title: t("providersPage.connection"),
      dataIndex: "name",
      key: "name",
      render: (name: string, connection) => (
        <Typography.Text ellipsis={{ tooltip: name }} style={{ maxWidth: 240, display: "block" }}>
          {name || connection.id}
        </Typography.Text>
      ),
    },
    {
      title: t("providersPage.status"),
      key: "status",
      render: (_, connection) => {
        const state = connectionState(connection, t);
        return <Tag color={state.color} icon={state.icon}>{state.label}</Tag>;
      },
    },
    {
      title: t("apiKeys.actions"),
      key: "actions",
      align: "right",
      render: (_, connection) => (
        <Space>
          <Switch
            size="small"
            checked={connection.isActive !== false}
            loading={toggleMutation.isPending && toggleMutation.variables?.id === connection.id}
            onChange={(checked) => toggleMutation.mutate({ id: connection.id, isActive: checked })}
            aria-label={`${connection.name} ${t("providersPage.status")}`}
          />
          <Button type="link" size="small" onClick={() => navigate(`/dashboard/providers/${connection.provider}`)}>
            {t("providersPage.details")}
          </Button>
        </Space>
      ),
    },
  ];

  if (providersQuery.isLoading && !providersQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <>
      {contextHolder}
      <Flex className={styles.page} vertical gap={16}>
        <Card styles={{ body: { padding: 12 } }}>
          <Flex vertical gap={12}>
            <Flex align="center" gap={12} wrap>
              <Input.Search
                allowClear
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("providersPage.search")}
                aria-label={t("providersPage.search")}
                style={{ flex: "1 1 180px", minWidth: 180 }}
              />
              <Input.Search
                allowClear
                value={modelSearch}
                onChange={(event) => setModelSearch(event.target.value)}
                placeholder={t("providersPage.searchModels")}
                aria-label={t("providersPage.searchModels")}
                style={{ flex: "1 1 180px", minWidth: 180 }}
              />
              <Segmented<DisplayMode>
                value={mode}
                onChange={setMode}
                options={[
                  { label: t("providers.all"), value: "all" },
                  { label: t("providersPage.configured"), value: "configured", disabled: connections.length === 0 },
                  { label: t("providersPage.compact"), value: "compact" },
                ]}
              />
              <Button type="primary" icon={<MaterialIcon name="add" />} onClick={() => navigate("/dashboard/providers/new")}>
                {t("providersPage.onboarding")}
              </Button>
              <Button icon={<MaterialIcon name="upload_file" />} onClick={() => setImportOpen(true)}>
                {t("providersPage.importFile")}
              </Button>
              <Button icon={<MaterialIcon name="play_circle" />} onClick={() => testMutation.mutate({ mode: "all" })} loading={testMutation.isPending}>
                {testMutation.isPending ? t("providersPage.testing") : t("providers.testAll")}
              </Button>
            </Flex>

            <Divider style={{ margin: 0 }} />
            <Space wrap size={[6, 6]}>
              <SummaryChip label={t("providers.all")} configured={groups.filter((group) => group.connections.length > 0).length} total={groups.length} active={!activeCategory && !showFreeOnly} onClick={() => { setActiveCategory(null); setShowFreeOnly(false); }} />
              <SummaryChip label={t("providersPage.freeTier")} configured={groups.filter((group) => group.hasFree && group.connections.length > 0).length} total={groups.filter((group) => group.hasFree).length} active={showFreeOnly} onClick={() => { setActiveCategory(null); setShowFreeOnly(true); }} />
              <SummaryChip label={t("providersPage.ide")} configured={groups.filter((group) => group.isIde && group.connections.length > 0).length} total={groups.filter((group) => group.isIde).length} active={activeCategory === "ide" && !showFreeOnly} onClick={() => { setShowFreeOnly(false); setActiveCategory("ide"); }} />
              {categoryMenu.map((category) => (
                <SummaryChip key={category.key} label={category.label} configured={category.configured} total={category.total} active={!showFreeOnly && activeCategory === category.key} onClick={() => { setShowFreeOnly(false); setActiveCategory(category.key); }} />
              ))}
            </Space>

            <Divider style={{ margin: 0 }} />
            <Space wrap size={[6, 6]}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("providersPage.media")}</Typography.Text>
              {[
                ["image", t("providersPage.image"), <MaterialIcon key="image" name="image" />],
                ["video", t("providersPage.video"), <MaterialIcon key="video" name="videocam" />],
                ["music", t("providersPage.music"), <MaterialIcon key="music" name="headphones" />],
                ["tts", t("providersPage.tts"), <MaterialIcon key="tts" name="mic" />],
                ["stt", t("providersPage.stt"), <MaterialIcon key="stt" name="mic_off" />],
                ["embedding", t("providersPage.embedding"), <MaterialIcon key="embedding" name="cloud" />],
              ].map(([key, label, icon]) => (
                <Button key={String(key)} size="small" type={activeServiceKind === key ? "primary" : "default"} icon={icon as ReactNode} onClick={() => setActiveServiceKind(activeServiceKind === key ? null : String(key))}>
                  {label}
                </Button>
              ))}
            </Space>
          </Flex>
        </Card>

        {expirationQuery.data?.summary &&
          (expirationQuery.data.summary.expired > 0 || expirationQuery.data.summary.expiringSoon > 0) && (
            <Alert
              showIcon
              type={expirationQuery.data.summary.expired > 0 ? "error" : "warning"}
              title={
                expirationQuery.data.summary.expired > 0
                  ? `${expirationQuery.data.summary.expired} 个 Provider 凭证已过期`
                  : `${expirationQuery.data.summary.expiringSoon} 个 Provider 凭证即将过期`
              }
              description="请打开对应 Provider 详情重新授权或更新凭证。"
            />
          )}

        {providersQuery.isError || catalogQuery.isError || nodesQuery.isError ? (
          <Alert
            type={providersQuery.isError ? "error" : "warning"}
            showIcon
            title={providersQuery.isError ? "Provider 数据加载失败" : "部分 Provider 元数据加载失败"}
            description={
              providersQuery.error instanceof Error
                ? providersQuery.error.message
                : "当前仍可查看已保存连接，刷新后将重新获取完整 catalog。"
            }
            action={<Button onClick={() => void Promise.all([providersQuery.refetch(), catalogQuery.refetch(), nodesQuery.refetch(), expirationQuery.refetch(), settingsQuery.refetch(), openRouterStatsQuery.refetch()])}>{t("providersPage.retry")}</Button>}
          />
        ) : providersQuery.isLoading || catalogQuery.isLoading || nodesQuery.isLoading ? (
          <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
        ) : mode === "compact" ? (
          <Card bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="id"
              size="middle"
              columns={compactColumns}
              dataSource={compactRows}
              pagination={{ pageSize: 10, showSizeChanger: true }}
            />
          </Card>
        ) : (
          <Flex vertical gap={24}>
            <ProviderSection
              category="compatible"
              title={t("providersPage.compatibleTitle")}
              badge={t("providersPage.compatibleBadge")}
              description={t("providersPage.compatibleDescription")}
              groups={filteredGroups.filter((group) => group.category === "compatible")}
              alwaysShow={!showFreeOnly && (!activeCategory || activeCategory === "compatible")}
              emptyText={t("providersPage.noCompatible")}
              actions={(
                <Space wrap>
                  {groups.length > 0 && <Button icon={<MaterialIcon name="play_circle" />} onClick={() => testMutation.mutate({ mode: "compatible" })} loading={testMutation.isPending && testMutation.variables.mode === "compatible"}>{t("providers.testAll")}</Button>}
                  {nodesQuery.data?.ccCompatibleProviderEnabled && <Button type="primary" icon={<MaterialIcon name="add" />} onClick={() => navigate("/dashboard/providers/new?kind=cc-compatible")}>{t("providersPage.addCcCompatible")}</Button>}
                  <Button type="primary" icon={<MaterialIcon name="add" />} onClick={() => navigate("/dashboard/providers/new?kind=anthropic-compatible")}>{t("providersPage.addAnthropicCompatible")}</Button>
                  <Button type="primary" icon={<MaterialIcon name="add" />} onClick={() => navigate("/dashboard/providers/new?kind=openai-compatible")}>{t("providersPage.addOpenAiCompatible")}</Button>
                </Space>
              )}
              navigate={navigate}
              onTest={(provider) => testMutation.mutate({ mode: "provider", provider })}
              onBatchTest={(mode) => testMutation.mutate({ mode })}
              testingProvider={testMutation.isPending ? testMutation.variables.provider ?? testMutation.variables.mode : undefined}
              onToggle={(id, active) => toggleMutation.mutate({ id, isActive: active })}
              togglingId={toggleMutation.isPending ? toggleMutation.variables?.id : undefined}
            />
            {[
              ["oauth", t("providersPage.oauthTitle"), t("providersPage.oauthDescription")],
              ["ide", t("providersPage.ideTitle"), t("providersPage.ideDescription")],
              ["web-cookie", t("providersPage.webCookieTitle"), t("providersPage.webCookieDescription")],
              ["apikey-llm", t("providersPage.llmTitle"), t("providersPage.llmDescription")],
              ["apikey-aggregator", t("providersPage.aggregatorTitle"), t("providersPage.aggregatorDescription")],
              ["apikey-enterprise", t("providersPage.enterpriseTitle"), t("providersPage.enterpriseDescription")],
              ["apikey-embedding", t("providersPage.embeddingTitle"), t("providersPage.embeddingDescription")],
              ["apikey-image", t("providersPage.imageTitle"), t("providersPage.imageDescription")],
              ["apikey-video", t("providersPage.videoTitle"), t("providersPage.videoDescription")],
              ["no-auth", t("providersPage.noAuthTitle"), t("providersPage.noAuthDescription")],
              ["upstream-proxy", t("providersPage.upstreamTitle"), t("providersPage.upstreamDescription")],
              ["cloud-agent", t("providersPage.cloudAgentTitle"), t("providersPage.cloudAgentDescription")],
              ["local", t("providersPage.localTitle"), t("providersPage.localDescription")],
              ["search", t("providersPage.searchTitle"), t("providersPage.searchDescription")],
              ["audio", t("providersPage.audioTitle"), t("providersPage.audioDescription")],
            ].map(([category, title, description]) => (
              <ProviderSection
                key={category}
                category={category}
                title={title}
                description={description}
                groups={filteredGroups.filter((group) => {
                  if (category === "ide") return group.isIde === true;
                  if (category.startsWith("apikey-")) {
                    return group.category === "apikey" && group.dashboardSection === category.slice("apikey-".length);
                  }
                  return group.category === category && group.isIde !== true;
                })}
                navigate={navigate}
                onTest={(provider) => testMutation.mutate({ mode: "provider", provider })}
                onBatchTest={(mode) => testMutation.mutate({ mode })}
                testMode={category.startsWith("apikey-") ? "apikey" : category}
                testingProvider={testMutation.isPending ? testMutation.variables.provider ?? testMutation.variables.mode : undefined}
                onToggle={(id, active) => toggleMutation.mutate({ id, isActive: active })}
                togglingId={toggleMutation.isPending ? toggleMutation.variables?.id : undefined}
              />
            ))}
          </Flex>
        )}
      </Flex>
      <Modal
        title={t("providersPage.importTitle")}
        open={importOpen}
        okText={t("providersPage.import")}
        cancelText={t("providers.cancel")}
        confirmLoading={importMutation.isPending}
        onCancel={() => setImportOpen(false)}
        onOk={() => importMutation.mutate(importText)}
      >
        <Typography.Paragraph type="secondary">{t("providersPage.importDescription")}</Typography.Paragraph>
        <Upload
          accept=".json,application/json"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(file) => {
            void file.text().then(setImportText);
            return false;
          }}
        >
          <Button icon={<MaterialIcon name="upload_file" />}>{t("providersPage.chooseJson")}</Button>
        </Upload>
        <Input.TextArea value={importText} onChange={(event) => setImportText(event.target.value)} autoSize={{ minRows: 10, maxRows: 20 }} placeholder={'[{"provider":"openai","name":"Primary","apiKey":"..."}]'} />
      </Modal>
    </>
  );
}

interface ProviderCardProps {
  group: ProviderGroup;
  onOpen: () => void;
  onTest: () => void;
  testing: boolean;
  onToggle: (id: string, active: boolean) => void;
  togglingId?: string;
}

function ProviderSection({
  category,
  title,
  badge,
  description,
  groups,
  alwaysShow = false,
  emptyText,
  actions,
  navigate,
  onTest,
  onBatchTest,
  testMode,
  testingProvider,
  onToggle,
  togglingId,
}: {
  category: string;
  title: string;
  badge?: string;
  description: string;
  groups: ProviderGroup[];
  alwaysShow?: boolean;
  emptyText?: string;
  actions?: ReactNode;
  navigate: ReturnType<typeof useNavigate>;
  onTest: (provider: string) => void;
  onBatchTest?: (mode: string) => void;
  testMode?: string;
  testingProvider?: string;
  onToggle: (id: string, active: boolean) => void;
  togglingId?: string;
}) {
  const { t } = useI18n();
  if (!alwaysShow && groups.length === 0) return null;
  const sectionDotColor =
    CATEGORY_DOT_COLORS[category.startsWith("apikey-") ? "apikey" : category] ??
    CATEGORY_DOT_COLORS.apikey;
  return (
    <section aria-labelledby={`provider-section-${category}`}>
      <Flex align="center" justify="space-between" gap={12} wrap style={{ marginBottom: 6 }}>
        <Flex align="center" gap={8}>
          <Typography.Title id={`provider-section-${category}`} level={2} style={{ margin: 0, fontSize: 20 }}>
            {title}
          </Typography.Title>
          {badge && <Tag color="orange" style={{ marginInlineEnd: 0 }}>{badge}</Tag>}
          <Badge
            color={sectionDotColor}
            text={(
              <span style={{ color: sectionDotColor }}>
                {groups.filter((group) => group.category === "no-auth" ? !group.blocked : group.category === "upstream-proxy" ? Boolean(group.upstreamProxyStatus?.running) : group.connections.length > 0).length}/{groups.length}
              </span>
            )}
          />
        </Flex>
        <Space wrap>
          {category !== "compatible" && groups.length > 0 && <Button icon={<MaterialIcon name="play_circle" />} onClick={() => (onBatchTest ? onBatchTest(testMode ?? category) : onTest(category))} loading={testingProvider === (testMode ?? category)}>{t("providers.testAll")}</Button>}
          {actions}
        </Space>
      </Flex>
      <Typography.Paragraph type="secondary" style={{ margin: "0 0 12px" }}>{description}</Typography.Paragraph>
      {groups.length === 0 ? (
        <Card styles={{ body: { padding: 16, textAlign: "center" } }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText ?? t("providersPage.noAvailable")} />
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {groups.map((group) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={group.key}>
              <ProviderCard
                group={group}
                onOpen={() => navigate(`/dashboard/providers/${group.provider}`)}
                onTest={() => onTest(group.provider)}
                testing={testingProvider === group.provider}
                onToggle={onToggle}
                togglingId={togglingId}
              />
            </Col>
          ))}
        </Row>
      )}
    </section>
  );
}

function ProviderCard({ group, onOpen, onTest, testing, onToggle, togglingId }: ProviderCardProps) {
  const { styles } = useProviderStyles();
  const { t } = useI18n();
  const allDisabled = group.connections.length > 0 && group.connections.every((connection) => connection.isActive === false);
  const isLlmProvider = !["search", "audio", "cloud-agent", "upstream-proxy", "no-auth"].includes(group.category);

  return (
    <Card
      hoverable
      className={styles.card}
      onClick={onOpen}
      styles={{ body: { padding: 12, minHeight: 142, display: "flex", flexDirection: "column" } }}
    >
      <Flex align="center" gap={12} style={{ minWidth: 0 }}>
        <ProviderGlyph group={group} />
        <Flex vertical gap={4} style={{ minWidth: 0, flex: 1 }}>
          <Flex align="center" gap={6} wrap>
            <Typography.Text strong ellipsis={{ tooltip: `${group.displayName} (${group.provider})` }} style={{ maxWidth: "100%", color: PROVIDER_TITLE_COLOR, textDecoration: group.deprecated ? "line-through" : undefined }}>
              {group.displayName}
            </Typography.Text>
            {group.subscriptionRisk && <ProviderRiskIndicator variant={group.riskNoticeVariant} provider={group.displayName} />}
          </Flex>
          <Flex gap={4} wrap>
            {group.popularityRank && <Tag color="gold">OR #{group.popularityRank}</Tag>}
            {group.codexServiceTier && group.codexServiceTier !== "false" && <Tag color="purple">Codex {group.codexServiceTier}</Tag>}
          </Flex>
        </Flex>
        <ProviderCategoryDots group={group} />
      </Flex>

      {(group.serviceKinds?.length || group.icon || group.textIcon) && (
        <Flex gap={4} wrap style={{ marginTop: 10 }}>
          {(group.serviceKinds ?? []).map((kind) => <Tag key={kind} bordered={false}>{kind}</Tag>)}
          {group.category === "compatible" && <Tag bordered={false} color="orange">Compatible</Tag>}
        </Flex>
      )}

      {group.errorCount > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<MaterialIcon name="info" />}
          title={t("providersPage.needsAttention", { count: group.errorCount })}
          style={{ marginTop: 10 }}
        />
      )}
      {group.blocked && (
        <Alert
          type="warning"
          showIcon
          title="此免鉴权 Provider 已在设置中禁用"
          style={{ marginTop: 10 }}
        />
      )}
      {group.expiryStatus && (
        <Alert
          type={group.expiryStatus === "expired" ? "error" : "warning"}
          showIcon
          title={group.expiryStatus === "expired" ? "凭证已过期" : "凭证即将过期"}
          style={{ marginTop: 10 }}
        />
      )}
      <Flex align="center" justify="space-between" gap={8} style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--ant-color-border-secondary)", minHeight: 34 }} onClick={(event) => event.stopPropagation()}>
        <Flex align="center" gap={6} wrap style={{ minHeight: 24, lineHeight: "24px" }}>
          {group.category === "upstream-proxy" ? (
            <Tag color={group.upstreamProxyStatus?.running ? "success" : "default"} style={{ margin: 0 }}>
              {group.upstreamProxyStatus?.label || "由上游代理管理"}
            </Tag>
          ) : group.category === "no-auth" ? (
            <Tag color={group.blocked ? "error" : "success"} style={{ margin: 0 }}>
              {group.blocked ? "已禁用" : "免鉴权可用"}
            </Tag>
          ) : group.connections.length > 0 ? (
            <Tag color={group.errorCount > 0 ? "error" : group.connected > 0 ? "success" : "default"} style={{ margin: 0 }}>
              {group.errorCount > 0 ? t("providersPage.errorCount", { count: group.errorCount }) : group.connected > 0 ? t("providersPage.connectedCount", { count: group.connected }) : t("providersPage.notConnected")}
            </Tag>
          ) : <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: "24px" }}>{t("providersPage.noConnections")}</Typography.Text>}
          {group.expiryStatus === "expired" && <Tag color="error" style={{ margin: 0 }}>{t("apiKeys.expired")}</Tag>}
          {group.expiryStatus === "expiring_soon" && <Tag color="warning" style={{ margin: 0 }}>{t("providers.expiringSoonBadge", undefined, "Expiring soon")}</Tag>}
        </Flex>
        <Flex align="center" gap={8} style={{ minHeight: 24 }}>
          {group.connections.length > 0 && (
            <Switch
              size="small"
              checked={!allDisabled}
              loading={Boolean(togglingId)}
              onChange={(checked) => group.connections.forEach((connection) => onToggle(connection.id, checked))}
              aria-label={`${group.displayName} ${t("providersPage.status")}`}
              style={{ display: "inline-flex", alignItems: "center" }}
            />
          )}
          {isLlmProvider && (
            <Button
              size="small"
              icon={<MaterialIcon name="play_circle" style={{ fontSize: 13, verticalAlign: "middle" }} />}
              loading={testing}
              onClick={onTest}
              style={{
                boxShadow: "none",
                display: "inline-flex",
                alignItems: "center",
                height: 24,
                lineHeight: "22px",
                padding: "0 8px",
              }}
            >
              {t("providersPage.test")}
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

type ProviderLobeIcon = ComponentType<{
  size?: number | string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}>;

const PROVIDER_ICON_ALIASES: Record<string, string> = {
  "amazon-q": "aws",
  antigravity: "antigravity",
  agy: "antigravity",
  clinepass: "cline",
  "codebuddy-cn": "tencent",
  qoder: "qoder",
  "cursor-api": "cursor",
  "opencode-go": "opencode",
  "opencode-zen": "opencode",
  "poe-web": "poe",
};

const LOBE_PROVIDER_ICONS: Record<string, ProviderLobeIcon> = {
  antigravity: AntigravityColorIcon,
  aws: AwsColorIcon,
  cline: ClineMonoIcon,
  qoder: QoderColorIcon,
  tencent: TencentColorIcon,
};

// These icons use `currentColor` for their primary mark. Keep that color aligned
// with the official dashboard treatment instead of letting an external SVG/image
// default to black on the dark card surface.
const LOBE_PROVIDER_ICON_COLORS: Record<string, string> = {
  aws: "#1677FF",
  qoder: "#1677FF",
};

function ProviderGlyph({ group }: { group: ProviderGroup }) {
  const [assetFailed, setAssetFailed] = useState(false);
  const iconId = (PROVIDER_ICON_ALIASES[group.provider.toLowerCase()] ?? group.provider).toLowerCase();
  const lobeIcon = LOBE_PROVIDER_ICONS[iconId];
  const lobeIconColor = LOBE_PROVIDER_ICON_COLORS[iconId] ?? group.color ?? "#1677FF";
  return (
    <span
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
        borderRadius: 10,
        background: group.color ? `${group.color}18` : "rgba(100, 116, 139, 0.14)",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      {lobeIcon && !group.iconUrl ? (
        createElement(lobeIcon, {
          size: 20,
          style: { flex: "none", color: lobeIconColor },
          "aria-label": group.provider,
        })
      ) : !assetFailed && (
        <img
          src={group.iconUrl || `/providers/${iconId}.svg`}
          alt=""
          width={20}
          height={20}
          style={{ objectFit: "contain" }}
          onError={() => setAssetFailed(true)}
        />
      )}
      {assetFailed && lobeIcon
        ? createElement(lobeIcon, { size: 20, style: { flex: "none", color: lobeIconColor }, "aria-label": group.provider })
        : assetFailed && (
            <Avatar size={24} style={{ background: group.color || "#64748B" }}>
              {group.textIcon || "AI"}
            </Avatar>
          )}
    </span>
  );
}

function ProviderCategoryDots({ group }: { group: ProviderGroup }) {
  const category = group.category;
  const label = CATEGORY_LABELS[category] ?? category;
  const color = CATEGORY_DOT_COLORS[category] ?? CATEGORY_DOT_COLORS.apikey;
  return (
    <Flex align="center" gap={3} style={{ flex: "none", paddingTop: 4 }} aria-label={`分类：${label}`}>
      <Tooltip title={label}>
        <span
          aria-label={label}
          style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: color, display: "block" }}
        />
      </Tooltip>
      {group.hasFree && (
        <Tooltip title={group.freeNote || "提供免费额度"}>
          <span
            aria-label="免费额度"
            style={{ width: 9, height: 9, borderRadius: "50%", backgroundColor: CATEGORY_DOT_COLORS.free, display: "block" }}
          />
        </Tooltip>
      )}
    </Flex>
  );
}

function ProviderRiskIndicator({
  variant,
  provider,
}: {
  variant?: ProviderGroup["riskNoticeVariant"];
  provider: string;
}) {
  const copy = {
    oauth: `${provider} 使用官方产品会话/OAuth，不属于官方授权的代理或路由方式。不建议高强度自主 Agent、长流程或大批量调用，上游可能限制或封禁账号。请自行承担使用风险。`,
    webCookie: `${provider} 通过网页会话 Cookie 认证。上游可能随时使会话失效，需要重新登录；不建议用于长期无人值守的任务。请自行承担使用风险。`,
    deprecated: `${provider} 已被上游停止维护，可能在没有通知的情况下停止工作。现有连接可能暂时可用，但建议迁移到替代 Provider。`,
    "embedded-service": `${provider} 的内置服务可能通过 DNS 重定向拦截该 Agent 的 HTTPS 流量。只有在接受相关服务条款和网络策略合规责任时才启用。`,
  }[variant ?? "oauth"];
  return (
    <Tooltip title={copy}>
      <span
        role="img"
        aria-label={`${provider} 使用注意`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 15,
          height: 15,
          borderRadius: "50%",
          color: "#d97706",
          border: "1px solid currentColor",
          fontSize: 10,
          lineHeight: 1,
          flex: "none",
        }}
      >
        <MaterialIcon name="help_outline" />
      </span>
    </Tooltip>
  );
}
