import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Segmented,
  Skeleton,
  Space,
  Typography,
  message,
} from "antd";
import { MaterialIcon } from "@/app/nav";
import { AutoComboCatalog } from "./auto-combo-catalog";
import { KimiComboPresetCard } from "./kimi-combo-preset-card";
import { ComboUsageGuide } from "./combo-usage-guide";
import { ComboCard } from "./combo-card";
import { ComboModal } from "./combo-modal";
import { TestResultsModal } from "./test-results-modal";
import { ProxyModal } from "./proxy-modal";
import { IntelligentComboPanel } from "./intelligent-combo-panel";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import {
  hasKimiCodingPreset,
  isIntelligentStrategy,
  getStepDisplayName,
  getStepProvider,
} from "./constants";
import {
  combosApi,
  type ComboBuilderOptions,
  type ComboItem,
  type ComboMetrics,
  type ComboTestResponse,
} from "@/entities/api";
import { useI18n } from "@/i18n";

const { Title } = Typography;

export function CombosPage() {
  const { tt } = useI18n();
  const [loading, setLoading] = useState(true);
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [metrics, setMetrics] = useState<Record<string, ComboMetrics>>({});
  const [builderOptions, setBuilderOptions] = useState<ComboBuilderOptions | null>(null);
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [proxyAssignments, setProxyAssignments] = useState<Record<string, string>>({});

  // Filter & Search
  const [filter, setFilter] = useState<"all" | "intelligent" | "deterministic">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [forceShowGuide, setForceShowGuide] = useState(false);

  // Recently created alert
  const [recentlyCreated, setRecentlyCreated] = useState<ComboItem | null>(null);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<ComboItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Test modal
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingComboName, setTestingComboName] = useState<string>("");
  const [testResults, setTestResults] = useState<ComboTestResponse | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [activeTestingId, setActiveTestingId] = useState<string | null>(null);

  // Proxy modal
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [proxyTargetCombo, setProxyTargetCombo] = useState<ComboItem | null>(null);

  // Load all initial data
  const loadCombosData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [listRes, metricsRes, optsRes, compRes, proxyRes] = await Promise.allSettled([
        combosApi.list(),
        combosApi.metrics(),
        combosApi.builderOptions(),
        combosApi.compression(),
        combosApi.proxyAssignments(),
      ]);

      if (listRes.status === "fulfilled") {
        setCombos(listRes.value.combos || []);
      }
      if (metricsRes.status === "fulfilled") {
        const m = metricsRes.value.metrics;
        if (m && typeof m === "object") {
          setMetrics(m as Record<string, ComboMetrics>);
        }
      }
      if (optsRes.status === "fulfilled") {
        setBuilderOptions(optsRes.value);
      }
      if (compRes.status === "fulfilled") {
        setCompressionEnabled(Boolean(compRes.value?.enabled));
      }
      if (proxyRes.status === "fulfilled") {
        const raw = proxyRes.value as unknown as {
          assignments?: Record<string, string>;
          items?: Array<{ scopeId?: string; proxyId?: string | null }>;
        };
        if (raw?.assignments && typeof raw.assignments === "object") {
          setProxyAssignments(raw.assignments);
        } else if (Array.isArray(raw?.items)) {
          const map: Record<string, string> = {};
          for (const it of raw.items) {
            if (it.scopeId && it.proxyId) {
              map[it.scopeId] = it.proxyId;
            }
          }
          setProxyAssignments(map);
        } else {
          setProxyAssignments({});
        }
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载组合数据失败");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadCombosData(true);
  }, []);

  // Filtered Combos
  const filteredCombos = useMemo(() => {
    return combos.filter((c) => {
      const isIntelligent = isIntelligentStrategy(c.strategy);
      if (filter === "intelligent" && !isIntelligent) return false;
      if (filter === "deterministic" && isIntelligent) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchDesc = (c.description || "").toLowerCase().includes(q);
        const matchModels = (c.models || []).some((m) => {
          const dName = getStepDisplayName(m).toLowerCase();
          const pId = (getStepProvider(m) || "").toLowerCase();
          return dName.includes(q) || pId.includes(q);
        });
        if (!matchName && !matchDesc && !matchModels) return false;
      }

      return true;
    });
  }, [combos, filter, searchQuery]);

  // Counts for filter bar
  const intelligentCount = useMemo(
    () => combos.filter((c) => isIntelligentStrategy(c.strategy)).length,
    [combos],
  );
  const deterministicCount = useMemo(
    () => combos.filter((c) => !isIntelligentStrategy(c.strategy)).length,
    [combos],
  );

  // Active / Disabled toggle
  const handleToggleActive = async (combo: ComboItem, nextActive: boolean) => {
    // Optimistic update
    setCombos((prev) =>
      prev.map((c) => (c.id === combo.id ? { ...c, isActive: nextActive } : c)),
    );
    try {
      await combosApi.update(combo.id, { isActive: nextActive });
      message.success(`组合 "${combo.name}" 已${nextActive ? "启用" : "停用"}`);
    } catch (err) {
      // Revert on error
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, isActive: combo.isActive } : c)),
      );
      message.error(err instanceof Error ? err.message : "切换状态失败");
    }
  };

  // Compression mode change
  const handleCompressionChange = async (combo: ComboItem, mode: string) => {
    const updatedConfig = {
      ...(combo.config || {}),
      compressionMode: mode,
    };
    try {
      await combosApi.update(combo.id, { config: updatedConfig });
      setCombos((prev) =>
        prev.map((c) => (c.id === combo.id ? { ...c, config: updatedConfig } : c)),
      );
      message.success(`已更新组合 "${combo.name}" 的提示词压缩模式`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新压缩配置失败");
    }
  };

  // Delete Combo
  const handleDeleteCombo = async (combo: ComboItem) => {
    try {
      await combosApi.remove(combo.id);
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
      message.success(`组合 "${combo.name}" 已删除`);
      if (recentlyCreated?.id === combo.id) {
        setRecentlyCreated(null);
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除组合失败");
    }
  };

  // Duplicate Combo
  const handleDuplicateCombo = async (combo: ComboItem) => {
    try {
      const copyName = `${combo.name}-copy`;
      const created = await combosApi.create({
        ...combo,
        id: undefined,
        name: copyName,
        createdAt: undefined,
        updatedAt: undefined,
      });
      setCombos((prev) => [...prev, created]);
      setRecentlyCreated(created);
      message.success(`已成功复制并创建组合 "${copyName}"`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "复制组合失败");
    }
  };

  // Drag and drop reordering
  const [comboDragIndex, setComboDragIndex] = useState<number | null>(null);
  const [comboDragOverIndex, setComboDragOverIndex] = useState<number | null>(null);
  const comboDragIndexRef = useRef<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const resetComboDragState = () => {
    comboDragIndexRef.current = null;
    setComboDragIndex(null);
    setComboDragOverIndex(null);
  };

  const handleComboDragStart = (e: React.DragEvent, index: number) => {
    if (savingOrder || filter !== "all" || searchQuery.trim() || filteredCombos.length < 2) {
      e.preventDefault();
      return;
    }
    comboDragIndexRef.current = index;
    setComboDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", filteredCombos[index]?.id || `${index}`);
  };

  const handleComboDragEnd = () => {
    resetComboDragState();
  };

  const handleComboDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const activeDragIndex = comboDragIndexRef.current ?? comboDragIndex;
    if (activeDragIndex === null || activeDragIndex === index) return;
    e.dataTransfer.dropEffect = "move";
    setComboDragOverIndex(index);
  };

  const handleComboDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = comboDragIndexRef.current ?? comboDragIndex;
    resetComboDragState();

    if (fromIndex === null || fromIndex === dropIndex) return;

    const sourceCombo = filteredCombos[fromIndex];
    const targetCombo = filteredCombos[dropIndex];
    if (!sourceCombo || !targetCombo) return;

    const nextList = [...combos];
    const sIdx = nextList.findIndex((c) => c.id === sourceCombo.id);
    const tIdx = nextList.findIndex((c) => c.id === targetCombo.id);
    if (sIdx === -1 || tIdx === -1) return;

    const [removed] = nextList.splice(sIdx, 1);
    nextList.splice(tIdx, 0, removed);

    setCombos(nextList);
    setSavingOrder(true);

    try {
      const comboIds = nextList.map((c) => c.id);
      await combosApi.reorder(comboIds);
      message.success("组合排序已保存");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "重排序保存失败");
      loadCombosData();
    } finally {
      setSavingOrder(false);
    }
  };

  // Test Combo
  const handleTestCombo = async (combo: ComboItem) => {
    setTestingComboName(combo.name);
    setActiveTestingId(combo.id);
    setTestLoading(true);
    try {
      const res = await combosApi.test(combo.name);
      setTestResults(res);
      setTestModalOpen(true);
    } catch (err) {
      setTestResults({
        error: err instanceof Error ? err.message : "测试组合请求失败",
      });
      setTestModalOpen(true);
    } finally {
      setTestLoading(false);
      setActiveTestingId(null);
    }
  };

  // Save (Create or Update)
  const handleSaveCombo = async (data: Partial<ComboItem>) => {
    setSaving(true);
    try {
      if (editingCombo?.id) {
        const updated = await combosApi.update(editingCombo.id, data);
        setCombos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        message.success(`组合 "${updated.name}" 已更新`);
      } else {
        const created = await combosApi.create(data);
        setCombos((prev) => [...prev, created]);
        setRecentlyCreated(created);
        message.success(`组合 "${created.name}" 已创建`);
      }
      setModalOpen(false);
      setEditingCombo(null);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存组合失败");
    } finally {
      setSaving(false);
    }
  };

  const hasKimi = hasKimiCodingPreset(combos);
  const firstIntelligentCombo = useMemo(
    () => combos.find((c) => isIntelligentStrategy(c.strategy)),
    [combos],
  );

  if (loading && combos.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <Flex vertical gap={16}>
      {/* Top Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 20 }}>
            {tt("模型组合", "Model Combos")}
          </Title>
          <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            {tt(
              "创建支持权重路由、故障自动回退与智能自愈的模型虚拟聚合管道",
              "Create virtual aggregation pipelines with weighted routing, auto-failover, and self-healing"
            )}
          </Typography.Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={<MaterialIcon name="help_outline" size={16} />}
            onClick={() => setForceShowGuide((prev) => !prev)}
          >
            {forceShowGuide ? tt("收起使用指南", "Hide Guide") : tt("查看使用指南", "Usage Guide")}
          </Button>

          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
            onClick={() => {
              setEditingCombo(null);
              setModalOpen(true);
            }}
          >
            {tt("新建组合", "Create Combo")}
          </Button>
        </Space>
      </Flex>

      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {/* Usage Guide */}
        <ComboUsageGuide
          forceOpen={forceShowGuide}
          onClose={() => setForceShowGuide(false)}
          onCreateCombo={() => {
            setEditingCombo(null);
            setModalOpen(true);
          }}
        />

        {/* Auto Combo Catalog */}
        <AutoComboCatalog
          onComboCreated={() => {
            loadCombosData();
          }}
        />

        {/* Kimi Preset Card */}
        <KimiComboPresetCard
          alreadyCreated={hasKimi}
          onCreated={loadCombosData}
        />

        {/* Recently Created Quick Test Banner */}
        {recentlyCreated && (
          <Alert
            type="info"
            showIcon
            message={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {tt(`刚刚创建了组合 ${recentlyCreated.name}，建议立即进行链路可用性测试。`, `Created combo ${recentlyCreated.name}. Recommend running a test now.`)}
                </span>
                <Space>
                  <Button
                    size="small"
                    type="primary"
                    icon={<MaterialIcon name="play_arrow" size={14} />}
                    onClick={() => handleTestCombo(recentlyCreated)}
                    loading={activeTestingId === recentlyCreated.id}
                  >
                    {tt("立即测试", "Test Now")}
                  </Button>
                  <Button size="small" type="text" onClick={() => setRecentlyCreated(null)}>
                    {tt("忽略", "Dismiss")}
                  </Button>
                </Space>
              </div>
            }
          />
        )}

        {/* Search & Filter Bar */}
        <Card size="small" style={{ borderRadius: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <Segmented
              value={filter}
              options={[
                { label: `${tt("全部", "All")} (${combos.length})`, value: "all" },
                { label: `${tt("智能路由", "Intelligent")} (${intelligentCount})`, value: "intelligent" },
                { label: `${tt("确定性路由", "Deterministic")} (${deterministicCount})`, value: "deterministic" },
              ]}
              onChange={(val) => setFilter(val as any)}
            />

            <Input
              placeholder={tt("按名称、描述或候选模型搜索...", "Search by name, description, or model...")}
              prefix={<MaterialIcon name="search" size={16} style={{ color: "#9CA3AF" }} />}
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 280 }}
            />
          </div>
        </Card>

        {/* Intelligent Combo Panel (when intelligent filter is chosen) */}
        {filter === "intelligent" && firstIntelligentCombo && (
          <IntelligentComboPanel
            combo={firstIntelligentCombo}
            onComboUpdated={(updated) => {
              setCombos((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            }}
          />
        )}

        {/* Combos List */}
        {loading ? (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {[1, 2, 3].map((i) => (
              <Card key={i} size="small" style={{ borderRadius: 8 }}>
                <Skeleton
                  active
                  avatar={{ shape: "square", size: 34 }}
                  paragraph={{ rows: 1, width: ["30%", "60%"] }}
                  title={{ width: "20%" }}
                />
              </Card>
            ))}
          </Space>
        ) : filteredCombos.length === 0 ? (
          <Card style={{ borderRadius: 8, padding: "24px 0" }}>
            <Empty
              description={
                searchQuery
                  ? tt("未找到匹配的组合", "No matching combos found")
                  : tt("尚未创建任何模型组合，点击下方按钮开始创建", "No combos created yet. Click below to start.")
              }
            >
              {searchQuery ? (
                <Button onClick={() => setSearchQuery("")}>{tt("清空搜索词", "Clear Search")}</Button>
              ) : (
                <Button
                  type="primary"
                  icon={<MaterialIcon name="add" size={16} />}
                  onClick={() => {
                    setEditingCombo(null);
                    setModalOpen(true);
                  }}
                >
                  {tt("创建第一个组合", "Create First Combo")}
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            {filteredCombos.map((combo, idx) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                metrics={metrics[combo.name] || null}
                compressionEnabled={compressionEnabled}
                hasProxy={Boolean(proxyAssignments[combo.name])}
                testing={activeTestingId === combo.id}
                dragDisabled={
                  savingOrder ||
                  filter !== "all" ||
                  Boolean(searchQuery.trim()) ||
                  filteredCombos.length < 2
                }
                isDragged={comboDragIndex === idx}
                isDropTarget={comboDragOverIndex === idx && comboDragIndex !== idx}
                onDragStart={(e) => handleComboDragStart(e, idx)}
                onDragEnd={handleComboDragEnd}
                onDragOver={(e) => handleComboDragOver(e, idx)}
                onDrop={(e) => handleComboDrop(e, idx)}
                onToggleActive={(active) => handleToggleActive(combo, active)}
                onCompressionChange={(mode) => handleCompressionChange(combo, mode)}
                onTest={() => handleTestCombo(combo)}
                onDuplicate={() => handleDuplicateCombo(combo)}
                onProxy={() => {
                  setProxyTargetCombo(combo);
                  setProxyModalOpen(true);
                }}
                onEdit={() => {
                  setEditingCombo(combo);
                  setModalOpen(true);
                }}
                onDelete={() => handleDeleteCombo(combo)}
              />
            ))}
          </Space>
        )}
      </Space>

      {/* Modals */}
      <ComboModal
        open={modalOpen}
        combo={editingCombo}
        builderOptions={builderOptions}
        onClose={() => {
          setModalOpen(false);
          setEditingCombo(null);
        }}
        onSave={handleSaveCombo}
        loading={saving}
      />

      <TestResultsModal
        open={testModalOpen}
        comboName={testingComboName}
        results={testResults}
        loading={testLoading}
        onClose={() => setTestModalOpen(false)}
        onReTest={() => {
          const target = combos.find((c) => c.name === testingComboName);
          if (target) {
            handleTestCombo(target);
          }
        }}
      />

      <ProxyModal
        open={proxyModalOpen}
        combo={proxyTargetCombo}
        onClose={() => {
          setProxyModalOpen(false);
          setProxyTargetCombo(null);
        }}
        onSaved={(newProxyId) => {
          if (proxyTargetCombo?.id) {
            setProxyAssignments((prev) => {
              const next = { ...prev };
              if (newProxyId) {
                next[proxyTargetCombo.id] = newProxyId;
                if (proxyTargetCombo.name) next[proxyTargetCombo.name] = newProxyId;
              } else {
                delete next[proxyTargetCombo.id];
                if (proxyTargetCombo.name) delete next[proxyTargetCombo.name];
              }
              return next;
            });
          }
          // Silent background sync without loading flicker
          loadCombosData(false);
        }}
      />
    </Flex>
  );
}

export default CombosPage;

