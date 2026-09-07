import { useState, useEffect, useMemo, useRef } from "react";
import {
  Button,
  Card,
  Col,
  Collapse,
  Flex,
  Input,
  Popconfirm,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon, NAV_SECTIONS } from "@/app/nav";
import type { NavSection, NavItem } from "@/app/nav";
import { settingsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n, translate } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  presetCard: {
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    border: `1px solid ${token.colorBorderSecondary}`,
    "&:hover": {
      borderColor: token.colorPrimary,
      transform: "translateY(-2px)",
      boxShadow: token.boxShadowSecondary,
    },
  },
  presetActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  itemRow: {
    padding: "9px 14px",
    borderRadius: 8,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s",
    "&:hover": {
      background: token.colorFillAlter,
      borderColor: token.colorBorder,
    },
  },
  itemRowDragging: {
    opacity: 0.35,
    borderStyle: "dashed",
    borderColor: token.colorBorder,
  },
  itemRowDropTarget: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
    boxShadow: `0 0 0 1px ${token.colorPrimary}`,
  },
  dragHandle: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 28,
    borderRadius: 4,
    cursor: "grab",
    color: token.colorTextTertiary,
    transition: "color 0.15s, background-color 0.15s",
    userSelect: "none",
    flexShrink: 0,
    "&:hover": {
      color: token.colorPrimary,
      background: token.colorPrimaryBg,
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  dragHandleDisabled: {
    cursor: "not-allowed",
    color: token.colorTextDisabled,
    "&:hover": {
      color: token.colorTextDisabled,
      background: "transparent",
    },
  },
  sectionHeaderRow: {
    width: "100%",
    paddingRight: 8,
    borderRadius: 6,
    transition: "all 0.2s",
  },
  sectionHeaderDropTarget: {
    outline: `2px dashed ${token.colorPrimary}`,
    background: token.colorPrimaryBg,
    borderRadius: 6,
  },
  sectionHeaderDragging: {
    opacity: 0.4,
  },
}));

interface SidebarPreset {
  id: string;
  nameZh: string;
  nameEn: string;
  icon: string;
  descZh: string;
  descEn: string;
  tagZh: string;
  tagEn: string;
  hiddenItems: string[];
}

const PRESETS: SidebarPreset[] = [
  {
    id: "all",
    nameZh: "全部功能 (All)",
    nameEn: "All Features",
    icon: "select_all",
    descZh: "展开所有导航分类与工具，适合全功能探索与系统运维",
    descEn: "Show all sections and tools for complete exploration and operations",
    tagZh: "完整视图",
    tagEn: "Complete",
    hiddenItems: [],
  },
  {
    id: "essentials",
    nameZh: "新手路径 (Essentials)",
    nameEn: "Essentials",
    icon: "star",
    descZh: "仅保留核心日常路径，高级调试与排障工具依然可通过搜索访问",
    descEn: "Core beginner path. Advanced tools remain searchable via command palette",
    tagZh: "推荐新手",
    tagEn: "Recommended",
    hiddenItems: [
      "playground",
      "logs",
      "batch",
      "batch-files",
      "translator",
      "combos",
      "quota",
      "analytics",
      "costs",
      "cache",
      "runtime",
      "resilience-connections",
      "mcp",
      "a2a",
      "memory",
      "skills",
      "agent-skills",
      "chaos-config",
      "plugins",
      "leaderboard",
      "media",
      "tokens",
    ],
  },
  {
    id: "minimal",
    nameZh: "极简日常 (Minimal)",
    nameEn: "Minimal",
    icon: "minimize",
    descZh: "仅显示模型端点、提供商、日志、健康度与基础系统设置",
    descEn: "Core endpoints, providers, logs, health, and basic system settings only",
    tagZh: "极简清爽",
    tagEn: "Minimal",
    hiddenItems: [
      "conductor",
      "agent-bridge",
      "traffic-inspector",
      "discovery",
      "api-endpoints",
      "webhooks",
      "proxy",
      "analytics-combo-health",
      "analytics-utilization",
      "analytics-compression",
      "analytics-search",
      "analytics-evals",
      "provider-stats",
      "costs-budget",
      "costs-free-tiers",
      "free-provider-rankings",
      "radar",
      "logs-proxy",
      "logs-console",
      "logs-timeline",
      "runtime",
      "resilience-connections",
      "audit",
      "audit-mcp",
      "audit-a2a",
      "translator",
      "search-tools",
      "chaos-config",
      "skills",
      "plugins",
      "leaderboard",
      "profile",
      "tokens",
      "media",
      "batch",
      "batch-files",
      "context-settings",
      "context-combos",
      "context-caveman",
      "context-rtk",
      "context-headroom",
      "context-session-dedup",
      "context-ccr",
      "context-llmlingua",
      "context-lite",
      "context-aggressive",
      "context-ultra",
      "context-omniglyph",
      "compression-studio",
      "compression-exclusions",
      "cli-code",
      "cli-agents",
      "acp-agents",
      "cloud-agents",
      "embedded-services",
    ],
  },
  {
    id: "developer",
    nameZh: "开发者模式 (Developer)",
    nameEn: "Developer",
    icon: "code",
    descZh: "聚焦模型路由、上下文压缩、CLI/ACP 智能体与协议转换工具",
    descEn: "Focused on model routing, compression, CLI/ACP agents, and developer tools",
    tagZh: "研发专用",
    tagEn: "Dev Mode",
    hiddenItems: [
      "audit",
      "audit-mcp",
      "audit-a2a",
      "radar",
      "free-provider-rankings",
      "leaderboard",
      "batch",
      "batch-files",
      "media",
      "profile",
      "tokens",
      "costs-quota-share",
      "settings-security",
      "settings-access-tokens",
      "settings-feature-flags",
    ],
  },
  {
    id: "admin",
    nameZh: "系统管理 (Admin)",
    nameEn: "System Admin",
    icon: "admin_panel_settings",
    descZh: "聚焦系统监控、日志流审计、配额预算、安全防御与系统设置",
    descEn: "Focused on system monitoring, log audit, quotas, security, and infrastructure",
    tagZh: "运维审计",
    tagEn: "Admin Mode",
    hiddenItems: [
      "playground",
      "cli-code",
      "cli-agents",
      "context-caveman",
      "context-rtk",
      "context-combos",
      "context-headroom",
      "context-session-dedup",
      "context-ccr",
      "context-llmlingua",
      "context-lite",
      "context-aggressive",
      "context-ultra",
      "context-omniglyph",
      "compression-studio",
      "compression-exclusions",
      "agent-bridge",
      "translator",
      "search-tools",
    ],
  },
];

const PROTECTED_ITEMS = new Set(["endpoints", "providers", "settings-sidebar", "settings-general"]);

export function SettingsSidebarPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { locale, isZh, tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["sidebar-settings-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const [activePreset, setActivePreset] = useState<string>("all");
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => NAV_SECTIONS.map((s) => s.key));
  const [itemOrder, setItemOrder] = useState<Record<string, string[]>>({});
  const [hiddenGroupLabels, setHiddenGroupLabels] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [openSectionKeys, setOpenSectionKeys] = useState<string[]>(() => NAV_SECTIONS.map((s) => s.key));

  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data as any;
      setHiddenItems(new Set(Array.isArray(s.hiddenSidebarItems) ? s.hiddenSidebarItems : []));
      setActivePreset(s.sidebarActivePreset || "all");

      const rawSectionOrder = Array.isArray(s.sidebarSectionOrder) && s.sidebarSectionOrder.length > 0
        ? s.sidebarSectionOrder
        : NAV_SECTIONS.map((sec) => sec.key);
      setSectionOrder(rawSectionOrder);

      setItemOrder(s.sidebarItemOrder && typeof s.sidebarItemOrder === "object" ? s.sidebarItemOrder : {});
      setHiddenGroupLabels(new Set(Array.isArray(s.hiddenSidebarGroupLabels) ? s.hiddenSidebarGroupLabels : []));
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (updated: any) => settingsApi.updateSettings(updated),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sidebar-settings-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存侧边栏设置失败", "Failed to save sidebar settings")),
  });

  const totalItemCount = useMemo(() => {
    return NAV_SECTIONS.reduce((acc, s) => acc + s.items.length, 0);
  }, []);

  const visibleItemCount = useMemo(() => {
    return NAV_SECTIONS.reduce((acc, s) => {
      return acc + s.items.filter((i) => !hiddenItems.has(i.key)).length;
    }, 0);
  }, [hiddenItems]);

  const handleApplyPreset = (preset: SidebarPreset) => {
    setActivePreset(preset.id);
    const newHidden = new Set(preset.hiddenItems);
    setHiddenItems(newHidden);
    saveMutation.mutate({
      sidebarActivePreset: preset.id,
      hiddenSidebarItems: Array.from(newHidden),
    });
    messageApi.success(tt(`已切换至 ${preset.nameZh} 预设视图`, `Switched to ${preset.nameEn} preset view`));
  };

  const handleToggleItem = (key: string) => {
    if (PROTECTED_ITEMS.has(key)) {
      messageApi.warning(tt("核心系统模块（端点、提供商、侧边栏设置）受系统保护，不可隐藏", "Core system modules (endpoints, providers, sidebar settings) are protected and cannot be hidden"));
      return;
    }
    const next = new Set(hiddenItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setHiddenItems(next);
    setActivePreset("custom");
    saveMutation.mutate({
      hiddenSidebarItems: Array.from(next),
      sidebarActivePreset: "custom",
    });
  };

  const handleToggleSectionLabel = (secKey: string) => {
    const next = new Set(hiddenGroupLabels);
    if (next.has(secKey)) {
      next.delete(secKey);
      messageApi.success(tt("已恢复显示该分组文本标题", "Restored section header text"));
    } else {
      next.add(secKey);
      messageApi.success(tt("已在侧边栏中隐藏该分组文本标题", "Hidden section header text in sidebar"));
    }
    setHiddenGroupLabels(next);
    saveMutation.mutate({
      hiddenSidebarGroupLabels: Array.from(next),
    });
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sectionOrder.length) return;
    const newOrder = [...sectionOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;
    setSectionOrder(newOrder);
    setActivePreset("custom");
    saveMutation.mutate({ sidebarSectionOrder: newOrder, sidebarActivePreset: "custom" });
  };

  // Item drag-and-drop state
  const [draggingItem, setDraggingItem] = useState<{ secKey: string; index: number; key: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ secKey: string; index: number; key: string } | null>(null);
  const draggingItemRef = useRef<{ secKey: string; index: number; key: string } | null>(null);

  const resetItemDragState = () => {
    draggingItemRef.current = null;
    setDraggingItem(null);
    setDragOverItem(null);
  };

  const handleItemDragStart = (e: React.DragEvent, secKey: string, index: number, key: string, disabled: boolean) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    const itemInfo = { secKey, index, key };
    draggingItemRef.current = itemInfo;
    setDraggingItem(itemInfo);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };

  const handleItemDragEnd = () => {
    resetItemDragState();
  };

  const handleItemDragOver = (e: React.DragEvent, secKey: string, index: number, key: string) => {
    e.preventDefault();
    const active = draggingItemRef.current;
    if (!active) return;
    if (active.secKey !== secKey || active.index === index) return;
    e.dataTransfer.dropEffect = "move";
    setDragOverItem({ secKey, index, key });
  };

  const handleItemDrop = (e: React.DragEvent, secKey: string, dropIndex: number, currentItems: NavItem[]) => {
    e.preventDefault();
    const active = draggingItemRef.current;
    resetItemDragState();

    if (!active || active.secKey !== secKey || active.index === dropIndex) return;

    const currentKeys = currentItems.map((i) => i.key);
    const [removed] = currentKeys.splice(active.index, 1);
    currentKeys.splice(dropIndex, 0, removed);

    const nextItemOrder = { ...itemOrder, [secKey]: currentKeys };
    setItemOrder(nextItemOrder);
    setActivePreset("custom");
    saveMutation.mutate({ sidebarItemOrder: nextItemOrder, sidebarActivePreset: "custom" });
    messageApi.success(tt("菜单排序已保存", "Menu item order saved"));
  };

  // Section drag-and-drop state
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null);
  const [dragOverSectionIndex, setDragOverSectionIndex] = useState<number | null>(null);
  const draggingSectionIndexRef = useRef<number | null>(null);

  const resetSectionDragState = () => {
    draggingSectionIndexRef.current = null;
    setDraggingSectionIndex(null);
    setDragOverSectionIndex(null);
  };

  const handleSectionDragStart = (e: React.DragEvent, index: number, secKey: string, disabled: boolean) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    draggingSectionIndexRef.current = index;
    setDraggingSectionIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", secKey);
  };

  const handleSectionDragEnd = () => {
    resetSectionDragState();
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const activeIndex = draggingSectionIndexRef.current;
    if (activeIndex === null || activeIndex === index) return;
    e.dataTransfer.dropEffect = "move";
    setDragOverSectionIndex(index);
  };

  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = draggingSectionIndexRef.current;
    resetSectionDragState();

    if (fromIndex === null || fromIndex === dropIndex) return;

    const newOrder = orderedSections.map((s) => s.key);
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(dropIndex, 0, removed);

    setSectionOrder(newOrder);
    setActivePreset("custom");
    saveMutation.mutate({ sidebarSectionOrder: newOrder, sidebarActivePreset: "custom" });
    messageApi.success(tt("分组排序已保存", "Section order saved"));
  };

  const handleSetSectionAllVisible = (sec: NavSection, visible: boolean) => {
    const next = new Set(hiddenItems);
    sec.items.forEach((i) => {
      if (PROTECTED_ITEMS.has(i.key)) return;
      if (visible) {
        next.delete(i.key);
      } else {
        next.add(i.key);
      }
    });
    setHiddenItems(next);
    setActivePreset("custom");
    saveMutation.mutate({ hiddenSidebarItems: Array.from(next), sidebarActivePreset: "custom" });
    const secTitle = translate(locale, `nav.section.${sec.key}`, sec.title);
    messageApi.success(tt(`已${visible ? "显示" : "隐藏"} ${secTitle} 分组下的所有项`, `${visible ? "Shown" : "Hidden"} all items under ${secTitle}`));
  };

  const handleResetDefaults = () => {
    const defaultSections = NAV_SECTIONS.map((s) => s.key);
    setHiddenItems(new Set());
    setActivePreset("all");
    setSectionOrder(defaultSections);
    setItemOrder({});
    setHiddenGroupLabels(new Set());
    setOpenSectionKeys(defaultSections);
    saveMutation.mutate({
      sidebarActivePreset: "all",
      hiddenSidebarItems: [],
      sidebarSectionOrder: defaultSections,
      sidebarItemOrder: {},
      hiddenSidebarGroupLabels: [],
    });
    messageApi.success(tt("已恢复为系统默认侧边栏布局", "Restored to default sidebar layout"));
  };

  const sectionRank = new Map(sectionOrder.map((key, index) => [key, index]));
  const orderedSections = [...NAV_SECTIONS].sort((a, b) => {
    const rankA = sectionRank.get(a.key) ?? sectionOrder.length + NAV_SECTIONS.indexOf(a);
    const rankB = sectionRank.get(b.key) ?? sectionOrder.length + NAV_SECTIONS.indexOf(b);
    return rankA - rankB;
  });

  const queryClean = searchQuery.trim().toLowerCase();

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(14, 165, 233, 0.12)",
                color: "#0ea5e9",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="view_sidebar" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("导航菜单与侧边栏定制", "Sidebar & Menu Customization")}
                </Title>
                <Tag color="cyan">
                  {tt(`当前呈现 ${visibleItemCount} / ${totalItemCount} 项`, `${visibleItemCount} / ${totalItemCount} Visible`)}
                </Tag>
                <Tag color="blue">{activePreset.toUpperCase()}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "自定义智枢管理控制台侧栏的分组排序、页面可见性与角色预设，所有改动即时生效并写入配置。",
                  "Customize Shiguang Gateway admin sidebar grouping, sorting, visibility, and role presets. All changes take effect immediately."
                )}
              </Text>
            </div>
          </Flex>

          <Space>
            <Button
              icon={<MaterialIcon name={openSectionKeys.length === 0 ? "unfold_more" : "unfold_less"} size={16} />}
              onClick={() => {
                if (openSectionKeys.length === 0) {
                  setOpenSectionKeys(NAV_SECTIONS.map((s) => s.key));
                } else {
                  setOpenSectionKeys([]);
                }
              }}
            >
              {openSectionKeys.length === 0 ? tt("全部展开", "Expand All") : tt("全部折叠", "Collapse All")}
            </Button>
            <Popconfirm
              title={tt("确定要重置所有侧边栏设置吗？", "Reset all sidebar settings?")}
              description={tt("将恢复全量默认分组、顺序与全部可见性。", "This will restore default grouping, ordering, and full visibility.")}
              onConfirm={handleResetDefaults}
              okText={tt("确认重置", "Confirm Reset")}
              cancelText={tt("取消", "Cancel")}
            >
              <Button icon={<MaterialIcon name="restart_alt" size={16} />}>
                {tt("恢复默认", "Reset to Default")}
              </Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      <Card title={tt("侧边栏角色预设方案 (Presets)", "Sidebar Role Presets")} className={styles.sectionCard} size="small">
        <Row gutter={[12, 12]}>
          {PRESETS.map((p) => {
            const isActive = activePreset === p.id;
            return (
              <Col xs={24} sm={12} md={p.id === "all" ? 4 : 5} key={p.id}>
                <div
                  className={`${styles.presetCard} ${isActive ? styles.presetActive : ""}`}
                  style={{ padding: "12px 14px", height: "100%" }}
                  onClick={() => handleApplyPreset(p)}
                >
                  <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                    <Flex align="center" gap={8}>
                      <MaterialIcon name={p.icon} size={20} style={{ color: isActive ? "#0ea5e9" : "inherit" }} />
                      <Text strong style={{ fontSize: 13 }}>{isZh ? p.nameZh : p.nameEn}</Text>
                    </Flex>
                    <Tag color={isActive ? "blue" : "default"}>{isZh ? p.tagZh : p.tagEn}</Tag>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    {isZh ? p.descZh : p.descEn}
                  </Text>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card className={styles.sectionCard} size="small">
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Input
            prefix={<MaterialIcon name="search" size={16} style={{ color: "#8c8c8c" }} />}
            placeholder={tt(
              "搜索菜单名称、路径或关键词（例如：压缩、端点、缓存、智能体...）",
              "Search menu name, route path, or keywords (e.g., cache, endpoints, providers)..."
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ maxWidth: 460 }}
          />
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt(
                `共 ${orderedSections.length} 个主分类，包含 ${totalItemCount} 个功能页面`,
                `${orderedSections.length} main categories, ${totalItemCount} pages in total`
              )}
            </Text>
          </Space>
        </Flex>
      </Card>

      <Card title={tt("侧边栏分组与子页面精细控制", "Sidebar Sections & Item Visibility")} className={styles.sectionCard} size="small">
        <Collapse
          activeKey={openSectionKeys}
          onChange={(keys) => setOpenSectionKeys(keys as string[])}
          items={orderedSections
            .map((sec, secIdx) => {
              const rawItems = sec.items || [];
              const customOrder = itemOrder[sec.key];
              let sortedItems = rawItems;
              if (customOrder && customOrder.length > 0) {
                const rank = new Map(customOrder.map((k, i) => [k, i]));
                sortedItems = [...rawItems].sort(
                  (a, b) => (rank.get(a.key) ?? rawItems.indexOf(a)) - (rank.get(b.key) ?? rawItems.indexOf(b))
                );
              }

              const sectionTitle = translate(locale, `nav.section.${sec.key}`, sec.title);

              const filteredItems = queryClean
                ? sortedItems.filter((item) => {
                    const itemLabel = translate(locale, `nav.item.${item.key}`, item.label);
                    return (
                      itemLabel.toLowerCase().includes(queryClean) ||
                      item.label.toLowerCase().includes(queryClean) ||
                      item.key.toLowerCase().includes(queryClean) ||
                      item.to.toLowerCase().includes(queryClean) ||
                      sectionTitle.toLowerCase().includes(queryClean)
                    );
                  })
                : sortedItems;

              if (queryClean && filteredItems.length === 0) {
                return null;
              }

              const visibleCount = sortedItems.filter((i) => !hiddenItems.has(i.key)).length;
              const isGroupLabelHidden = hiddenGroupLabels.has(sec.key);
              const sectionDragDisabled = Boolean(queryClean) || orderedSections.length < 2;
              const isSectionDragged = draggingSectionIndex === secIdx;
              const isSectionDropTarget = dragOverSectionIndex === secIdx && draggingSectionIndex !== secIdx;

              return {
                key: sec.key,
                label: (
                  <div
                    className={`${styles.sectionHeaderRow} ${isSectionDragged ? styles.sectionHeaderDragging : ""} ${isSectionDropTarget ? styles.sectionHeaderDropTarget : ""}`}
                    onDragOver={(e) => handleSectionDragOver(e, secIdx)}
                    onDrop={(e) => handleSectionDrop(e, secIdx)}
                  >
                    <Flex justify="space-between" align="center" wrap gap={8}>
                      <Flex align="center" gap={8}>
                        <div
                          draggable={!sectionDragDisabled}
                          onDragStart={(e) => handleSectionDragStart(e, secIdx, sec.key, sectionDragDisabled)}
                          onDragEnd={handleSectionDragEnd}
                          className={`${styles.dragHandle} ${sectionDragDisabled ? styles.dragHandleDisabled : ""}`}
                          title={
                            sectionDragDisabled
                              ? (queryClean ? tt("搜索状态下不可拖动排序", "Drag reordering disabled while searching") : tt("单项不可拖动", "Cannot drag single item"))
                              : tt("按住并拖动以调整分类顺序", "Drag to reorder section")
                          }
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MaterialIcon name="drag_indicator" size={18} />
                        </div>
                        <MaterialIcon name={sec.icon || "folder"} size={18} />
                        <Text strong style={{ fontSize: 14 }}>{sectionTitle}</Text>
                        <Tag color={visibleCount > 0 ? "blue" : "default"}>
                          {tt(`${visibleCount} / ${sortedItems.length} 可见`, `${visibleCount} / ${sortedItems.length} Visible`)}
                        </Tag>
                        {isGroupLabelHidden && <Tag color="warning">{tt("分组标题已隐藏", "Title Hidden")}</Tag>}
                      </Flex>
                      <Space onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="small"
                          onClick={() => handleSetSectionAllVisible(sec, true)}
                        >
                          {tt("全显", "Show All")}
                        </Button>
                        <Button
                          size="small"
                          onClick={() => handleSetSectionAllVisible(sec, false)}
                        >
                          {tt("全隐", "Hide All")}
                        </Button>
                        <Tooltip title={tt("隐藏/显示该分组在侧栏的文本标题", "Toggle section header text visibility in the sidebar")}>
                          <Button
                            size="small"
                            type={isGroupLabelHidden ? "primary" : "default"}
                            danger={isGroupLabelHidden}
                            onClick={() => handleToggleSectionLabel(sec.key)}
                          >
                            {isGroupLabelHidden ? tt("显示分组标题", "Show Title") : tt("隐藏分组标题", "Hide Title")}
                          </Button>
                        </Tooltip>
                        <Button
                          size="small"
                          disabled={secIdx === 0}
                          icon={<MaterialIcon name="arrow_upward" size={14} />}
                          onClick={() => handleMoveSection(secIdx, "up")}
                        />
                        <Button
                          size="small"
                          disabled={secIdx === orderedSections.length - 1}
                          icon={<MaterialIcon name="arrow_downward" size={14} />}
                          onClick={() => handleMoveSection(secIdx, "down")}
                        />
                      </Space>
                    </Flex>
                  </div>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredItems.map((item, itemIdx) => {
                      const isHidden = hiddenItems.has(item.key);
                      const isProtected = PROTECTED_ITEMS.has(item.key);
                      const localizedItemLabel = translate(locale, `nav.item.${item.key}`, item.label);
                      const itemDragDisabled = Boolean(queryClean) || sortedItems.length < 2;
                      const isItemDragged = draggingItem?.secKey === sec.key && draggingItem?.index === itemIdx;
                      const isItemDropTarget =
                        dragOverItem?.secKey === sec.key &&
                        dragOverItem?.index === itemIdx &&
                        draggingItem?.index !== itemIdx;

                      return (
                        <div
                          key={item.key}
                          className={`${styles.itemRow} ${isItemDragged ? styles.itemRowDragging : ""} ${isItemDropTarget ? styles.itemRowDropTarget : ""}`}
                          onDragOver={(e) => handleItemDragOver(e, sec.key, itemIdx, item.key)}
                          onDrop={(e) => handleItemDrop(e, sec.key, itemIdx, sortedItems)}
                        >
                          <Flex justify="space-between" align="center" wrap gap={8}>
                            <Flex align="center" gap={10}>
                              <div
                                draggable={!itemDragDisabled}
                                onDragStart={(e) => handleItemDragStart(e, sec.key, itemIdx, item.key, itemDragDisabled)}
                                onDragEnd={handleItemDragEnd}
                                className={`${styles.dragHandle} ${itemDragDisabled ? styles.dragHandleDisabled : ""}`}
                                title={
                                  itemDragDisabled
                                    ? (queryClean ? tt("搜索状态下不可拖动排序", "Drag reordering disabled while searching") : tt("单项不可拖动", "Cannot drag single item"))
                                    : tt("按住并拖动以调整菜单顺序", "Drag to reorder menu item")
                                }
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MaterialIcon name="drag_indicator" size={18} />
                              </div>

                              <MaterialIcon name={item.icon || "circle"} size={18} />
                              <div>
                                <Flex align="center" gap={8}>
                                  <Text strong={!isHidden} type={isHidden ? "secondary" : undefined} style={{ fontSize: 13 }}>
                                    {localizedItemLabel}
                                  </Text>
                                  {isProtected && <Tag color="gold" style={{ fontSize: 10 }}>{tt("系统核心保护", "Protected")}</Tag>}
                                  {isHidden && <Tag style={{ fontSize: 10 }}>{tt("已隐藏", "Hidden")}</Tag>}
                                </Flex>
                                <code style={{ fontSize: 11, opacity: 0.65 }}>{item.to}</code>
                              </div>
                            </Flex>

                            <Space size={12}>
                              <Switch
                                checked={!isHidden}
                                disabled={isProtected}
                                onChange={() => handleToggleItem(item.key)}
                              />
                            </Space>
                          </Flex>
                        </div>
                      );
                    })}
                  </div>
                ),
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
      </Card>
    </div>
  );
}

export default SettingsSidebarPage;
