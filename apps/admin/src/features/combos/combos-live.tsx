import { useState, useMemo, useEffect } from "react";
import {
  Badge,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MaterialIcon } from "@/app/nav";
import { useThemeMode } from "@/theme/useThemeMode";
import { combosApi, providersApi, type ProviderConnection } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text, Paragraph } = Typography;

// ── Custom Flow Nodes ─────────────────────────────────────────────────────────

// 1. Request Entry Node
function FlowRequestNode({ data }: NodeProps) {
  const { comboName, strategy } = data as { comboName: string; strategy: string };
  const color = "#6366f1"; // Indigo

  return (
    <div
      style={{
        borderRadius: 12,
        border: `2px solid ${color}`,
        background: "#18181b",
        padding: "10px 14px",
        width: 140,
        boxSizing: "border-box",
        textAlign: "center",
        boxShadow: `0 0 14px ${color}30`,
        color: "#fff",
      }}
    >
      <Handle type="source" position={Position.Right} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color, marginBottom: 2 }}>
        REQUEST
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "monospace",
          color: "#f4f4f5",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={comboName}
      >
        {comboName || "Combo"}
      </div>
      <Tag color="purple" style={{ fontSize: 9, margin: "4px 0 0", padding: "0 4px" }}>
        {strategy || "cascade"}
      </Tag>
    </div>
  );
}

// 2. Strategy Routing Node
function FlowStrategyNode({ data }: NodeProps) {
  const { strategy } = data as { strategy: string };
  const color = "#8b5cf6";

  return (
    <div
      style={{
        borderRadius: 20,
        border: `1.5px solid ${color}`,
        background: "#18181b",
        padding: "8px 12px",
        width: 110,
        boxSizing: "border-box",
        textAlign: "center",
        color: "#fff",
        boxShadow: `0 0 10px ${color}25`,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: color, width: 6, height: 6 }} />
      <Flex align="center" justify="center" gap={4}>
        <MaterialIcon name="alt_route" size={13} style={{ color }} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>
          {strategy === "weighted" ? "加权分流" : strategy === "lowest-latency" ? "最低延迟" : "主备优先级"}
        </span>
      </Flex>
    </div>
  );
}

// 3. Provider Cascade Node
function FlowProviderCascadeNode({ data }: NodeProps) {
  const { provider, model, state, latencyMs, targetIndex, cbState } = data as {
    provider: string;
    model: string;
    state: "attempting" | "failed" | "succeeded" | "idle";
    latencyMs?: number;
    targetIndex: number;
    cbState?: string;
  };

  const isSuccess = state === "succeeded";
  const isFailed = state === "failed";
  const isAttempting = state === "attempting";

  const borderColor = isSuccess ? "#22c55e" : isFailed ? "#ef4444" : isAttempting ? "#f59e0b" : "rgba(255,255,255,0.15)";
  const glow = isSuccess
    ? "0 0 14px rgba(34, 197, 94, 0.35)"
    : isFailed
    ? "0 0 14px rgba(239, 68, 68, 0.35)"
    : isAttempting
    ? "0 0 14px rgba(245, 158, 11, 0.35)"
    : "none";

  return (
    <div
      style={{
        borderRadius: 12,
        border: `1.5px solid ${borderColor}`,
        background: "#18181b",
        padding: "10px 12px",
        width: 220,
        boxSizing: "border-box",
        boxShadow: glow,
        color: "#fff",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: borderColor, width: 6, height: 6 }} />
      <Handle type="source" position={Position.Right} style={{ background: borderColor, width: 6, height: 6 }} />

      <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
          <Tag color={isSuccess ? "green" : isFailed ? "red" : isAttempting ? "warning" : "default"} style={{ margin: 0, fontSize: 10, padding: "0 3px" }}>
            #{targetIndex + 1}
          </Tag>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 100,
            }}
            title={provider}
          >
            {provider}
          </span>
        </Flex>
        {isSuccess ? (
          <Tag color="success" style={{ margin: 0, fontSize: 10, padding: "0 3px" }}>200 OK</Tag>
        ) : isFailed ? (
          <Tag color="error" style={{ margin: 0, fontSize: 10, padding: "0 3px" }}>429 限流</Tag>
        ) : (
          <Tag style={{ margin: 0, fontSize: 10, padding: "0 3px" }}>待命</Tag>
        )}
      </Flex>

      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.55)",
          fontFamily: "monospace",
          marginBottom: 6,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={model}
      >
        {model}
      </div>

      <Flex justify="space-between" align="center">
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
          {latencyMs ? `${latencyMs}ms` : "—"}
        </span>
        {cbState && cbState !== "CLOSED" && (
          <Tag color="magenta" style={{ fontSize: 9, margin: 0, padding: "0 3px" }}>
            CB: {cbState}
          </Tag>
        )}
      </Flex>
    </div>
  );
}

// 4. Response Terminal Node
function FlowResponseNode({ data }: NodeProps) {
  const { outcome, latencyMs, resolvedProvider } = data as {
    outcome: "succeeded" | "failed";
    latencyMs?: number;
    resolvedProvider?: string;
  };
  const isSuccess = outcome === "succeeded";
  const color = isSuccess ? "#22c55e" : "#ef4444";

  return (
    <div
      style={{
        borderRadius: 12,
        border: `2px solid ${color}`,
        background: "#18181b",
        padding: "10px 14px",
        width: 140,
        boxSizing: "border-box",
        textAlign: "center",
        boxShadow: `0 0 14px ${color}30`,
        color: "#fff",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, width: 8, height: 8 }} />
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color, marginBottom: 2 }}>
        RESPONSE (200)
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#f4f4f5",
          marginBottom: 2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={resolvedProvider}
      >
        {resolvedProvider || "Resolved"}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
        {latencyMs != null ? `${latencyMs} ms` : "—"}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  request: FlowRequestNode,
  strategy: FlowStrategyNode,
  target: FlowProviderCascadeNode,
  response: FlowResponseNode,
};

// ── Styles ───────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    height: "calc(100vh - 88px)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflow: "hidden",
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
    flexShrink: 0,
  },
  canvasCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    flex: "1 1 0%",
    minHeight: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    "& .react-flow": {
      width: "100%",
      height: "100%",
      flex: "1 1 0%",
      minHeight: 0,
    },
    "& .react-flow__controls": {
      boxShadow: token.boxShadowSecondary,
      borderRadius: 8,
      overflow: "hidden",
      border: `1px solid ${token.colorBorderSecondary}`,
      background: token.colorBgElevated,
    },
    "& .react-flow__controls-button": {
      background: token.colorBgElevated,
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      color: token.colorText,
      fill: token.colorText,
      "&:hover": {
        background: token.colorFillSecondary,
      },
      "& svg": {
        fill: "currentColor",
      },
    },
  },
  fleetCard: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillQuaternary,
    padding: "16px 20px",
  },
}));

export function CombosLivePage() {
  const { styles } = useStyles();
  const { mode } = useThemeMode();
  const [messageApi, contextHolder] = message.useMessage();

  // State
  const [selectedComboId, setSelectedComboId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cascade" | "fleet">("cascade");
  // The dashboard currently consumes the local HTTP snapshot APIs. Do not claim a
  // WebSocket connection until a real subscription is established.
  const isLiveConnected = false;

  // Simulation modal
  const [simulateModalVisible, setSimulateModalVisible] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [testPrompt, setTestPrompt] = useState("Explain quantum computing in one sentence.");
  const [testResult, setTestResult] = useState<import("@shiguang-gateway/contracts").ComboTestResponse | null>(null);

  // 1. Fetch Combos
  const combosQuery = useQuery({
    queryKey: ["combos-list"],
    queryFn: async () => {
      const res = await combosApi.list();
      return Array.isArray(res?.combos) ? res.combos : [];
    },
    staleTime: 30_000,
  });
  const combos = combosQuery.data ?? [];

  // Auto-select first combo
  useEffect(() => {
    if (combos.length > 0 && !selectedComboId) {
      setSelectedComboId(combos[0].id);
    }
  }, [combos, selectedComboId]);

  // 2. Fetch Provider Connections
  const connectionsQuery = useQuery({
    queryKey: ["providers-connections"],
    queryFn: async () => {
      const res = await providersApi.list({ limit: 100 });
      return Array.isArray(res?.connections) ? res.connections : [];
    },
    staleTime: 30_000,
  });
  const connections = connectionsQuery.data ?? [];
  const connectionMap = useMemo(() => {
    const map = new Map<string, ProviderConnection>();
    for (const c of connections) map.set(c.id, c);
    return map;
  }, [connections]);

  const activeCombo = useMemo(() => {
    return combos.find((c) => c.id === selectedComboId) || combos[0] || null;
  }, [combos, selectedComboId]);

  // Convert Active Combo into ReactFlow Graph ({ nodes, edges })
  const { nodes, edges } = useMemo(() => {
    if (!activeCombo) return { nodes: [] as Node[], edges: [] as Edge[] };

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    const models = activeCombo.models || [];

    const X_STEP = 260;

    // 1. Request Node
    flowNodes.push({
      id: "node-request",
      type: "request",
      position: { x: 0, y: 0 },
      data: { comboName: activeCombo.name, strategy: activeCombo.strategy || "cascade" },
    });

    // 2. Strategy Node
    flowNodes.push({
      id: "node-strategy",
      type: "strategy",
      position: { x: 180, y: 0 },
      data: { strategy: activeCombo.strategy || "cascade" },
    });

    flowEdges.push({
      id: "edge-req-strat",
      source: "node-request",
      target: "node-strategy",
      style: { stroke: "#6366f1", strokeWidth: 2 },
      animated: true,
    });

    // 3. Target Cascade Nodes (horizontal cascade matching Shiguang Gateway)
    let prevId = "node-strategy";
    // Show active targets in pipeline (top 3-5 or full list)
    const displayModels = models.slice(0, 6);

    displayModels.forEach((m: any, idx: number) => {
      const stepModel = m.model || m.name || m.comboName || `model-${idx}`;
      const stepConnId = m.connectionId || "";
      const conn = connectionMap.get(stepConnId) || {
        provider: typeof stepModel === "string" ? stepModel.split("/")[0] || "custom" : "custom",
        name: typeof stepModel === "string" ? stepModel : `Step ${idx + 1}`,
      };

      const nodeId = `node-target-${idx}`;
      const result = testResult?.results?.find((item) => item.connectionId === stepConnId || item.model === stepModel);
      const state = result?.status === "ok" ? "succeeded" : result?.status === "error" ? "failed" : "idle";

      flowNodes.push({
        id: nodeId,
        type: "target",
        position: { x: (idx + 1) * X_STEP + 80, y: 0 },
        data: {
          provider: conn.name || String(stepModel),
          model: String(stepModel),
          state,
          latencyMs: result?.latencyMs,
          targetIndex: idx,
          cbState: undefined,
        },
      });

      flowEdges.push({
        id: `edge-${prevId}-${nodeId}`,
        source: prevId,
        target: nodeId,
        style: {
          stroke: state === "succeeded" ? "#22c55e" : state === "failed" ? "#ef4444" : "rgba(255,255,255,0.2)",
          strokeWidth: state === "succeeded" ? 2.5 : 1.5,
        },
        animated: state === "succeeded",
      });

      prevId = nodeId;
    });

    // 4. Terminal Response Node
    const responseX = (displayModels.length + 1) * X_STEP + 80;
    flowNodes.push({
      id: "node-response",
      type: "response",
      position: { x: responseX, y: 0 },
      data: {
        outcome: testResult?.resolvedBy ? "succeeded" : "failed",
        latencyMs: testResult?.results?.find((item) => item.status === "ok")?.latencyMs,
        resolvedProvider: testResult?.resolvedBy || "尚未执行真实测试",
      },
    });

    flowEdges.push({
      id: `edge-${prevId}-response`,
      source: prevId,
      target: "node-response",
      style: { stroke: testResult?.resolvedBy ? "#22c55e" : "rgba(255,255,255,0.2)", strokeWidth: 2.5 },
      animated: Boolean(testResult?.resolvedBy),
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [activeCombo, connectionMap, testResult]);

  // Fleet Statistics (matching Shiguang Gateway's 3 sets: active / error / inactive)
  const fleetStats = useMemo(() => {
    const healthyList: string[] = [];
    const errorList: string[] = [];
    const inactiveList: string[] = [];

    for (const conn of connections) {
      const name = conn.name || conn.provider;
      if (conn.isBanned || conn.status === "error" || conn.rateLimitedUntil) {
        errorList.push(name);
      } else if (conn.isActive !== false) {
        healthyList.push(name);
      } else {
        inactiveList.push(name);
      }
    }

    return {
      healthyList,
      errorList,
      inactiveList,
      total: connections.length,
    };
  }, [connections]);

  const handleRunSimulation = async () => {
    if (!activeCombo) return;
    setSimulating(true);
    try {
      const result = await combosApi.test(activeCombo.name, testPrompt);
      setTestResult(result);
      const passed = result.results?.filter((item) => item.status === "ok").length ?? 0;
      if (passed > 0) {
        messageApi.success(`组合 [${activeCombo.name}] 真实测试完成：${passed}/${result.results?.length ?? 0} 个目标可用`);
        setSimulateModalVisible(false);
      } else {
        messageApi.error(`组合 [${activeCombo.name}] 真实测试失败：没有目标返回可用响应`);
      }
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "组合真实测试失败");
    } finally {
      setSimulating(false);
    }
  };

  if (combosQuery.isLoading && combos.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header Card */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <div>
            <Flex align="center" gap={10}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(168, 85, 247, 0.12)",
                  color: "#A855F7",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcon name="account_tree" size={22} />
              </div>
              <div>
                <Flex align="center" gap={8}>
                  <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                    组合工作室 (Combos Live Studio)
                  </Title>
                  <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                    <Badge status="processing" color="#22C55E" style={{ marginRight: 4 }} />
                    {isLiveConnected ? "WS 实时在线" : "本地实时快照"}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  基于 ReactFlow 全链路可视化组合路由决策、上游故障熔断 (Circuit Breaker) 与降级切流流水线
                </Text>
              </div>
            </Flex>
          </div>

          <Space size={10}>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="cascade">
                <Space size={4}>
                  <MaterialIcon name="schema" size={14} />
                  <span>流式拓扑</span>
                </Space>
              </Radio.Button>
              <Radio.Button value="fleet">
                <Space size={4}>
                  <MaterialIcon name="grid_view" size={14} />
                  <span>集群总览</span>
                </Space>
              </Radio.Button>
            </Radio.Group>

            <Select
              value={selectedComboId}
              onChange={setSelectedComboId}
              style={{ minWidth: 200 }}
              placeholder="选择要观测的组合"
              options={combos.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.models?.length || 0} 个模型)`,
              }))}
            />

            <Button
              type="primary"
              icon={<MaterialIcon name="play_arrow" size={16} />}
              onClick={() => setSimulateModalVisible(true)}
            >
              真实测试
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Main Studio Canvas Card */}
      {viewMode === "cascade" ? (
        <Card
          className={styles.canvasCard}
          styles={{
            body: {
              padding: 0,
              height: "100%",
              flex: "1 1 0%",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          {!activeCombo ? (
            <div style={{ padding: 48, textAlign: "center", margin: "auto" }}>
              <Empty description="暂无可用组合，请先在「组合」页面创建路由组合" />
            </div>
          ) : (
            <div style={{ width: "100%", height: "100%", flex: "1 1 0%", minHeight: 0, position: "relative" }}>
              <ReactFlow
                key={activeCombo.id}
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                colorMode={mode === "dark" ? "dark" : "light"}
                fitView
                fitViewOptions={{ padding: 0.22 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                style={{ width: "100%", height: "100%" }}
              >
                <Background color={mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} gap={16} size={1} />
                <Controls position="bottom-right" />
              </ReactFlow>
            </div>
          )}
        </Card>
      ) : (
        /* Fleet Overview Mode: Exact match with Shiguang Gateway's active/error/inactive pill aggregation */
        <Card className={styles.canvasCard} styles={{ body: { padding: "24px 28px", minHeight: 480 } }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Active Set */}
            {fleetStats.healthyList.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: 8,
                  }}
                >
                  活跃提供商 · {fleetStats.healthyList.length} 个
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {fleetStats.healthyList.map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: 12,
                        padding: "4px 12px",
                        borderRadius: 16,
                        fontWeight: 500,
                        backgroundColor: "rgba(34, 197, 94, 0.15)",
                        color: "#22c55e",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Error / Degraded Set */}
            {fleetStats.errorList.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: 8,
                  }}
                >
                  异常 / 熔断提供商 · {fleetStats.errorList.length} 个
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {fleetStats.errorList.map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: 12,
                        padding: "4px 12px",
                        borderRadius: 16,
                        fontWeight: 500,
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Set */}
            {fleetStats.inactiveList.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "rgba(255,255,255,0.45)",
                    marginBottom: 8,
                  }}
                >
                  空闲 / 待命中 · {fleetStats.inactiveList.length} 个
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {fleetStats.inactiveList.map((p) => (
                    <span
                      key={p}
                      style={{
                        fontSize: 12,
                        padding: "4px 12px",
                        borderRadius: 16,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Simulation Request Modal */}
      <Modal
        open={simulateModalVisible}
        onCancel={() => setSimulateModalVisible(false)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="play_arrow" size={20} style={{ color: "#A855F7" }} />
            <span>真实调用组合流水线</span>
          </Flex>
        }
        onOk={handleRunSimulation}
        confirmLoading={simulating}
        okText="开始演练"
        width={560}
      >
        <div style={{ marginTop: 12 }}>
          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            向选中的组合{" "}
            <Text strong>
              {activeCombo?.name}
            </Text>{" "}
            发送真实健康检查请求，结果来自本地网关及各目标 provider；不会伪造成功状态。
          </Paragraph>

          <div style={{ marginTop: 12 }}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
              测试请求 Prompt:
            </Text>
            <Input.TextArea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default CombosLivePage;
