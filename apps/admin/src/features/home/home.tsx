import { createElement, useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Badge, Button, Card, Col, Empty, Flex, Row, Space, Typography } from "antd";
import { Background, Controls, Handle, Position, ReactFlow, useNodesState, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Scrollbar } from "@shiguang2/components/esm/scrollbar";
import AntigravityColorIcon from "@lobehub/icons/es/Antigravity/components/Color";
import DeepSeekColorIcon from "@lobehub/icons/es/DeepSeek/components/Color";
import GeminiColorIcon from "@lobehub/icons/es/Gemini/components/Color";
import KimiColorIcon from "@lobehub/icons/es/Kimi/components/Color";
import OpenCodeAvatarIcon from "@lobehub/icons/es/OpenCode/components/Avatar";
import QoderColorIcon from "@lobehub/icons/es/Qoder/components/Color";
import SenseNovaColorIcon from "@lobehub/icons/es/SenseNova/components/Color";
import VolcengineColorIcon from "@lobehub/icons/es/Volcengine/components/Color";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { api, providersApi, settingsApi, type ProviderCatalogEntry, type ProviderConnection, type ProviderNode } from "@/entities/api";
import { useLiveRequests } from "@/entities/live";
import { useI18n } from "@/i18n";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const useStyles = createStyles(({ token }) => ({
  page: { width: "100%" },
  banner: { minHeight: 76, borderRadius: token.borderRadiusLG, padding: "14px 18px" },
  bannerCopy: { minWidth: 0, flex: 1 },
  quickCard: { background: token.colorBgContainer, borderColor: token.colorBorderSecondary },
  quickStep: { height: "100%", border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadius, padding: 14, background: token.colorFillQuaternary },
  quickIcon: { width: 32, height: 32, borderRadius: token.borderRadius, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" },
  topologyCard: { height: "100%", minHeight: 460 },
  topologyCanvas: { height: 420, minHeight: 420, position: "relative", overflow: "hidden", padding: 0, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}`, borderRadius: token.borderRadiusLG },
  topologyControls: {
    "&.react-flow__controls": {
      background: token.colorBgElevated,
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: token.borderRadius,
      boxShadow: "none",
      overflow: "hidden",
    },
    "&& .react-flow__controls-button": {
      width: 22,
      height: 22,
      padding: 3,
      background: token.colorBgElevated,
      color: token.colorTextSecondary,
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
    },
    "&& .react-flow__controls-button:last-child": { borderBottom: 0 },
    "&& .react-flow__controls-button:hover": {
      background: token.colorFillSecondary,
      color: token.colorPrimary,
    },
    "&& .react-flow__controls-button svg": { width: 10, height: 10, fill: "currentColor", maxWidth: 10, maxHeight: 10 },
  },
  recentCard: { height: "100%", minHeight: 460 },
  recentList: { height: 390, minHeight: 0 },
  recentRow: { display: "grid", gridTemplateColumns: "8px minmax(0, 1fr) auto auto", alignItems: "center", gap: 8, padding: "9px 6px", borderBottom: `1px solid ${token.colorBorderSecondary}` },
  dot: { width: 7, height: 7, borderRadius: "50%" },
}));

type Metric = { lastRequestAt?: string | null; lastStatus?: number | null };
type RecentRow = { id?: string; timestamp?: string; status?: number; model?: string; provider?: string; tokens?: { in?: number; out?: number }; error?: string | null; active?: boolean };
type Activity = { lastProvider?: string; errorProvider?: string };
type ProviderState = "active" | "recent" | "error" | "idle";

function isError(connection: ProviderConnection) { const status = connection.testStatus || "unknown"; if (connection.isActive === false) return false; if (status === "unavailable") return connection.rateLimitedUntil ? new Date(connection.rateLimitedUntil).getTime() > Date.now() : true; return status === "error" || status === "expired"; }
function providerState(connection: ProviderConnection, _metric?: Metric, activity?: Activity, activeProviders?: Set<string>): ProviderState { const id = connection.provider.toLowerCase(); if (activeProviders?.has(id)) return "active"; if (activity?.errorProvider?.toLowerCase() === id) return "error"; if (connection.isActive === false) return "idle"; if (isError(connection)) return "error"; if (activity?.lastProvider?.toLowerCase() === id) return "recent"; return "active"; }
function ago(value?: string) { if (!value) return ""; const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000)); if (seconds < 60) return `${seconds}s`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`; return `${Math.floor(seconds / 86400)}d`; }

const PROVIDER_ICON_ALIASES: Record<string, string> = { "amazon-q": "aws", agy: "antigravity", antigravity: "antigravity", qoder: "qoder", clinepass: "cline", "codebuddy-cn": "tencent", "cursor-api": "cursor", "opencode-go": "opencode", "opencode-zen": "opencode" };
// The local runtime does not expose the static
// provider catalog endpoint. Keep the same registry display metadata locally so
// topology labels never fall back to a connection name such as "main".
const TOPOLOGY_PROVIDER_METADATA: Record<string, { name: string; icon?: string; color: string }> = {
  opencode: { name: "OpenCode Free", icon: "opencode", color: "#E87040" },
  "volcengine-coding-plan": { name: "Volcengine Ark Coding Plan", icon: "volcengine", color: "#FF6A00" },
  agy: { name: "Antigravity CLI", icon: "antigravity", color: "#F59E0B" },
  sensenova: { name: "SenseNova", icon: "sensenova", color: "#0066FF" },
  "free-ai": { name: "Free.ai", icon: "freeai", color: "#16A34A" },
  nara: { name: "NaraRouter", icon: "nara", color: "#EC4899" },
  "gemini-web": { name: "Gemini Web (Free)", icon: "gemini", color: "#4285F4" },
  lmarena: { name: "Arena (Free)", icon: "lmarena", color: "#FF6B6B" },
  "deepseek-web": { name: "DeepSeek Web", icon: "deepseek", color: "#4D6BFE" },
  "kimi-web": { name: "Kimi Web", icon: "kimi", color: "#2563EB" },
  qoder: { name: "Qoder", icon: "qoder", color: "#6366F1" },
  "chatgpt-web": { name: "ChatGPT Web (Codex)", icon: "chatgpt", color: "#10A37F" },
};
type TopologyProviderIcon = ComponentType<any>;
const TOPOLOGY_PROVIDER_ICONS: Record<string, TopologyProviderIcon> = {
  agy: AntigravityColorIcon,
  qoder: QoderColorIcon,
  opencode: OpenCodeAvatarIcon,
  "volcengine-coding-plan": VolcengineColorIcon,
  sensenova: SenseNovaColorIcon,
  "gemini-web": GeminiColorIcon,
  "deepseek-web": DeepSeekColorIcon,
  "kimi-web": KimiColorIcon,
};
const RINGS: Array<[number, number, number]> = [[8, 210, 132], [14, 370, 233], [20, 530, 334], [26, 690, 435], [32, 850, 536], [38, 1010, 637]];

type TopologyNodeData = { label: string; providerId: string; icon?: string; iconUrl?: string; color: string; state: ProviderState; active: boolean };
type RouterNodeData = { activeCount: number };

function ProviderTopologyNode({ data }: NodeProps<Node<TopologyNodeData>>) {
  const stateColor = data.state === "error" ? "#ef4444" : data.active ? data.color : data.state === "idle" ? "#64748b" : "#22c55e";
  const dotColor = data.state === "error" ? "#ef4444" : data.active ? data.color : data.state === "recent" ? "#f59e0b" : "#22c55e";
  const textColor = data.state === "error" ? "#ef4444" : data.active ? data.color : data.state === "idle" ? "var(--ant-color-text)" : "#22c55e";
  const Icon = TOPOLOGY_PROVIDER_ICONS[data.providerId];
  return <div style={{ minWidth: 156, display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", border: `2px solid ${stateColor}`, borderRadius: 9, background: "var(--ant-color-bg-elevated)", boxShadow: `0 0 12px ${stateColor}28`, cursor: "pointer" }}>
    {(["top", "bottom", "left", "right"] as const).map((position) => <Handle key={position} id={position} type="target" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position] as Position} style={{ opacity: 0, width: 1, height: 1 }} />)}
    <Avatar size={24} src={Icon ? undefined : (data.iconUrl || (data.icon ? `/providers/${data.icon}.svg` : `/providers/${data.providerId}.svg`))} style={{ flex: "none", background: `${data.color}22`, color: data.color, fontSize: 10 }}>{Icon ? createElement(Icon, { size: 17, "aria-label": data.providerId }) : data.providerId.slice(0, 2).toUpperCase()}</Avatar>
    <div style={{ minWidth: 0, flex: 1 }}><Typography.Text ellipsis={{ tooltip: data.label }} style={{ display: "block", fontSize: 12, fontWeight: 600, color: textColor }}>{data.label}</Typography.Text></div>
    <Badge color={dotColor} />
  </div>;
}

function RouterTopologyNode({ data }: NodeProps<Node<RouterNodeData>>) {
  return <div style={{ minWidth: 148, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", border: "2px solid #1677ff", borderRadius: 12, background: "var(--ant-color-bg-elevated)", boxShadow: "0 0 24px #1677ff28" }}>
    {(["top", "bottom", "left", "right"] as const).map((position) => <Handle key={position} id={position} type="source" position={Position[position[0].toUpperCase() + position.slice(1) as keyof typeof Position] as Position} style={{ opacity: 0, width: 1, height: 1 }} />)}
    <MaterialIcon name="bolt" size={19} style={{ color: "#1677ff" }} /><Typography.Text strong style={{ color: "#1677ff" }}>智枢</Typography.Text>{data.activeCount > 0 && <Badge count={data.activeCount} color="#1677ff" size="small" />}
  </div>;
}

const topologyNodeTypes = { provider: ProviderTopologyNode, router: RouterTopologyNode };
function getHandles(angle: number, cx: number) { const rel = (((angle + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (rel < Math.PI / 4 || rel > (7 * Math.PI) / 4) return { sourceHandle: "top", targetHandle: "bottom" }; if (rel > (3 * Math.PI) / 4 && rel < (5 * Math.PI) / 4) return { sourceHandle: "bottom", targetHandle: "top" }; return cx > 0 ? { sourceHandle: "right", targetHandle: "left" } : { sourceHandle: "left", targetHandle: "right" }; }

function ProviderTopologyGraph({ providers, metrics, activity, activeProviders, catalog, providerNodes, navigate, controlsClassName }: { providers: ProviderConnection[]; metrics: Record<string, Metric>; activity?: Activity; activeProviders: Set<string>; catalog: Map<string, ProviderCatalogEntry>; providerNodes: Map<string, ProviderNode>; navigate: (path: string) => void; controlsClassName: string }) {
  const { nodes: layoutNodes, edges } = useMemo(() => {
    const sorted = [...providers].sort((a, b) => {
      const rank = (connection: ProviderConnection) => {
        if (activeProviders.has(connection.provider.toLowerCase())) return 0;
        const state = providerState(connection, metrics[connection.provider], activity, activeProviders);
        return state === "error" ? 1 : state === "recent" ? 2 : state === "active" ? 3 : 4;
      };
      return rank(a) - rank(b) || a.provider.localeCompare(b.provider);
    });
    const nodes: Node[] = [{ id: "router", type: "router", position: { x: -74, y: -22 }, data: { activeCount: activeProviders.size }, draggable: true }];
    const edges: Edge[] = [];
    let index = 0;
    for (const [capacity, rx, ry] of RINGS) {
      const count = Math.min(capacity, sorted.length - index);
      for (let i = 0; i < count; i += 1) {
        const connection = sorted[index++];
        const state = providerState(connection, metrics[connection.provider], activity, activeProviders);
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
        const cx = rx * Math.cos(angle); const cy = ry * Math.sin(angle); const handles = getHandles(angle, cx);
        const providerId = connection.provider.toLowerCase();
        const provider = catalog.get(providerId) || catalog.get(PROVIDER_ICON_ALIASES[providerId] || providerId);
        const metadata = provider || TOPOLOGY_PROVIDER_METADATA[providerId];
        const active = activeProviders.has(providerId);
        const color = metadata?.color ?? "#1677ff";
        const nodeId = `provider-${providerId}`;
        const providerNode = providerNodes.get(providerId);
        nodes.push({ id: nodeId, type: "provider", position: { x: cx - 78, y: cy - 14 }, data: { label: metadata?.name || providerNode?.name || providerId, providerId, icon: metadata?.icon || provider?.icon || PROVIDER_ICON_ALIASES[providerId], iconUrl: providerNode?.iconUrl, color, state, active } satisfies TopologyNodeData, draggable: true });
        const stroke = state === "error" ? "#ef4444" : active ? "#22c55e" : state === "recent" ? "#f59e0b" : state === "active" ? "#22c55e" : "#64748b";
        edges.push({ id: `edge-${nodeId}`, source: "router", target: nodeId, sourceHandle: handles.sourceHandle, targetHandle: handles.targetHandle, animated: active || state === "error", style: { stroke, strokeWidth: active ? 2.5 : state === "error" ? 2 : 1.5, opacity: state === "idle" ? .3 : .75 } });
      }
      if (index >= sorted.length) break;
    }
    return { nodes, edges };
  }, [providers, metrics, activity, activeProviders, catalog, providerNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  useEffect(() => {
    setNodes((current) => {
      const positions = new Map(current.map((node) => [node.id, node.position]));
      return layoutNodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position }));
    });
  }, [layoutNodes, setNodes]);
  return <div style={{ width: "100%", height: "100%" }}><ReactFlow key={providers.map((provider) => provider.provider).join(",")} nodes={nodes} edges={edges} nodeTypes={topologyNodeTypes} onNodesChange={onNodesChange} fitView fitViewOptions={{ padding: .22, duration: 0 }} minZoom={.08} maxZoom={2} nodesDraggable nodesConnectable={false} elementsSelectable={false} onNodeClick={(_, node) => { if (node.type === "provider") navigate(`/dashboard/providers/${(node.data as TopologyNodeData).providerId}`); }} proOptions={{ hideAttribution: true }}><Background gap={32} size={1} color="var(--ant-color-border-secondary)" /><Controls className={controlsClassName} showInteractive={false} /></ReactFlow></div>;
}

export default function HomePage() {
  const { styles } = useStyles(); const navigate = useNavigate();
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState<string[]>(() => { try { return typeof window === "undefined" ? [] : JSON.parse(window.localStorage.getItem("shiguangGateway-home-banners-dismissed") ?? "[]") as string[]; } catch { return []; } });
  const [showQuickStart, setShowQuickStart] = useState(true); const [showTopology, setShowTopology] = useState(true);
  const settingsQuery = useQuery({ queryKey: ["settings", "home"], queryFn: settingsApi.sidebar, staleTime: 60_000 });
  useEffect(() => { if (typeof settingsQuery.data?.showQuickStartOnHome === "boolean") setShowQuickStart(settingsQuery.data.showQuickStartOnHome); if (typeof settingsQuery.data?.showProviderTopologyOnHome === "boolean") setShowTopology(settingsQuery.data.showProviderTopologyOnHome); }, [settingsQuery.data]);
  const providersQuery = useQuery({ queryKey: ["home", "providers"], queryFn: () => providersApi.list(), staleTime: 15_000, refetchInterval: 30_000 });
  const providerNodesQuery = useQuery({ queryKey: ["home", "provider-nodes"], queryFn: providersApi.listNodes, staleTime: 300_000 });
  const catalogQuery = useQuery({ queryKey: ["home", "provider-catalog"], queryFn: providersApi.catalog, staleTime: 300_000 });
  const metricsQuery = useQuery({ queryKey: ["home", "provider-metrics"], queryFn: () => api<{ metrics: Record<string, Metric>; topology?: Activity }>("/provider-metrics"), enabled: showTopology, staleTime: 2_000, refetchInterval: 3_000 });
  const recentQuery = useQuery({ queryKey: ["home", "recent-requests"], queryFn: () => api<RecentRow[]>("/usage/call-logs?limit=60&excludeTests=1"), enabled: showTopology, staleTime: 2_000, refetchInterval: 3_000 });
  const versionQuery = useQuery({ queryKey: ["home", "version"], queryFn: () => api<{ latest?: string; updateAvailable?: boolean }>("/system/version"), staleTime: 60_000 });
  const { activeRequests } = useLiveRequests({ enabled: showTopology });
  const connections = providersQuery.data?.connections ?? []; const metrics = metricsQuery.data?.metrics ?? {}; const activity = metricsQuery.data?.topology;
  const activeProviders = useMemo(() => new Set(activeRequests.map((request) => request.provider.toLowerCase()).filter(Boolean)), [activeRequests]);
  const catalog = useMemo(() => new Map((catalogQuery.data?.categories ?? []).flatMap((category) => category.providers.map((provider) => [provider.id.toLowerCase(), provider] as const))), [catalogQuery.data]);
  const providerNodes = useMemo(() => new Map((providerNodesQuery.data?.nodes ?? []).flatMap((node) => [[node.id.toLowerCase(), node] as const, ...(node.prefix ? [[node.prefix.toLowerCase(), node] as const] : [])])), [providerNodesQuery.data]);
  const grouped = useMemo(() => { const map = new Map<string, ProviderConnection>(); for (const connection of connections) if (connection.isActive !== false && !map.has(connection.provider)) map.set(connection.provider, connection); return Array.from(map.values()); }, [connections]);
  const topologySummary = useMemo(() => {
    const states = grouped.map((connection) => providerState(connection, metrics[connection.provider], activity, activeProviders));
    return { valid: states.filter((state) => state !== "error").length, errors: states.filter((state) => state === "error").length };
  }, [grouped, metrics, activity, activeProviders]);
  const banners = [
    { id: "kimi", color: "#1677ff", icon: <span style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#1783ff18" }}><img src="/providers/kimi.svg" alt="Kimi" width={29} height={29} style={{ display: "block", background: "#fff", borderRadius: 7, padding: 4, boxSizing: "border-box" }} /></span>, title: t("home.banner.kimiTitle"), description: t("home.banner.kimiDescription"), note: t("home.banner.kimiNote"), link: "https://platform.kimi.ai?track_id=track-8197581fdd7d4139a0f562e4a03c3798&aff=shiguangGateway", linkText: t("home.banner.kimiAction") },
    { id: "cheaper", color: "#16a34a", icon: <span style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#31f88918", color: "#31f889" }}><span style={{ width: 21, height: 21, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid #31f88999" }}><MaterialIcon name="add" size={15} /></span></span>, title: t("home.banner.cheaperTitle"), description: t("home.banner.cheaperDescription"), note: t("home.banner.cheaperNote"), link: "https://link.shiguangGateway.online/cheaper", linkText: t("home.banner.cheaperAction") },
    { id: "copilot", color: "#1677ff", icon: <span style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#007acc18", color: "#007acc" }}><MaterialIcon name="extension" /></span>, title: t("home.banner.copilotTitle"), description: t("home.banner.copilotDescription"), note: t("home.banner.copilotNote"), link: "https://link.shiguangGateway.online/vsx", linkText: t("home.banner.copilotAction") },
  ];
  if (providersQuery.isLoading && !providersQuery.data) {
    return <PageSkeleton />;
  }
  return <div className={styles.page}><Space direction="vertical" size={16} style={{ width: "100%" }}>
    {versionQuery.data?.updateAvailable && <Alert type="info" showIcon message={t("home.updateAvailable", { version: versionQuery.data.latest ?? "" })} description={t("home.updateDescription")} />}
    {banners.filter((banner) => !dismissed.includes(banner.id)).map((banner) => <Alert key={banner.id} showIcon className={styles.banner} style={{ borderColor: `${banner.color}66`, background: `${banner.color}12` }} icon={banner.icon} message={<Flex align="center" gap={12}><div className={styles.bannerCopy}><Typography.Text strong>{banner.title}</Typography.Text><br /><Typography.Text type="secondary" ellipsis>{banner.description}</Typography.Text></div><Space><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}><a href={banner.link} target="_blank" rel="noreferrer">{banner.linkText} <MaterialIcon name="open_in_new" size={16} /></a><Typography.Text type="secondary" style={{ fontSize: 10, opacity: .7 }}>{banner.note}</Typography.Text></div><Button type="text" size="small" icon={<MaterialIcon name="close" />} onClick={() => setDismissed((previous) => { const next = [...previous, banner.id]; try { window.localStorage.setItem("shiguangGateway-home-banners-dismissed", JSON.stringify(next)); } catch { /* optional */ } return next; })} aria-label={t("home.close")} /></Space></Flex>} />)}
    {showQuickStart && <Card className={styles.quickCard} title={<Typography.Title level={4} style={{ margin: 0 }}>{t("home.quickStart")}</Typography.Title>}><Row gutter={[12, 12]}>{[[<MaterialIcon name="vpn_key" />, t("home.stepApiKey"), <>{t("home.stepApiKeyBefore")} <a onClick={() => navigate("/dashboard/api-manager")}>{t("nav.item.api-manager")}</a> {t("home.stepApiKeyAfter")}</>], [<MaterialIcon name="dns" />, t("home.stepProvider"), <>{t("home.stepProviderBefore")} <a onClick={() => navigate("/dashboard/providers")}>{t("nav.item.providers")}</a> {t("home.stepProviderAfter")}</>], [<MaterialIcon name="link" />, t("home.stepClient"), <>{t("home.stepClientBefore")} <Typography.Text code>{window.location.origin}/v1</Typography.Text>.</>], [<MaterialIcon name="dashboard" />, t("home.stepMonitor"), <>{t("home.stepMonitorBefore")} <a onClick={() => navigate("/dashboard/logs")}>{t("nav.item.logs")}</a> {t("home.stepMonitorAnd")} <a onClick={() => navigate("/dashboard/analytics")}>{t("nav.item.analytics")}</a>.</>]].map(([icon, title, description], index) => <Col xs={24} md={12} key={index}><div className={styles.quickStep}><Flex gap={10}><span className={styles.quickIcon} style={{ background: index === 0 ? "#ef444422" : index === 1 ? "#22c55e22" : index === 2 ? "#3b82f622" : "#f59e0b22", color: index === 0 ? "#ef4444" : index === 1 ? "#22c55e" : index === 2 ? "#3b82f6" : "#f59e0b" }}>{icon}</span><div><Typography.Text strong>{title}</Typography.Text><div><Typography.Text type="secondary">{description}</Typography.Text></div></div></Flex></div></Col>)}</Row></Card>}
    {showTopology && <Row gutter={[12, 12]} align="stretch"><Col xs={24} lg={16}><Card className={styles.topologyCard} title={t("home.topology")} extra={<Space size={12} wrap><Typography.Text type="secondary">{t("home.validCount", { count: topologySummary.valid })} · {t("home.errorCount", { count: topologySummary.errors })}</Typography.Text><Typography.Text type="secondary"><Badge status="success" /> {t("home.active")}</Typography.Text><Typography.Text type="secondary"><Badge status="warning" /> {t("home.recent")}</Typography.Text><Typography.Text type="secondary"><Badge status="error" /> {t("home.error")}</Typography.Text></Space>}><div className={styles.topologyCanvas}>{grouped.length === 0 ? <Empty description={t("home.noProviders")} /> : <ProviderTopologyGraph providers={grouped} metrics={metrics} activity={activity} activeProviders={activeProviders} catalog={catalog} providerNodes={providerNodes} navigate={navigate} controlsClassName={styles.topologyControls} />}</div></Card></Col><Col xs={24} lg={8}><Card className={styles.recentCard} title={<span style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: 1 }}>{t("home.recentRequests")}</span>} extra={<Button type="link" onClick={() => navigate("/dashboard/logs")}>{t("home.viewAll")}</Button>}>{recentQuery.isLoading ? <Typography.Text type="secondary">{t("home.loading")}</Typography.Text> : (recentQuery.data ?? []).length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("home.noRequests")} /> : <Scrollbar className={styles.recentList} scrollX={false}><div>{(recentQuery.data ?? []).map((row, index) => { const error = row.active ? false : Boolean(row.error) || (row.status != null && row.status >= 400); return <div className={styles.recentRow} key={row.id ?? index}><span className={styles.dot} style={{ background: row.active ? "#1677ff" : error ? "#ef4444" : "#22c55e" }} /><Typography.Text ellipsis={{ tooltip: row.model }} style={{ fontFamily: "monospace", fontSize: 12 }}>{row.model || "—"}</Typography.Text><Typography.Text style={{ fontSize: 12, color: error ? "#ef4444" : "#22c55e" }}>{row.tokens?.in ?? 0}↑ {row.tokens?.out ?? 0}↓</Typography.Text><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.active ? "•••" : ago(row.timestamp)}</Typography.Text></div>; })}</div></Scrollbar>}</Card></Col></Row>}
  </Space></div>;
}
