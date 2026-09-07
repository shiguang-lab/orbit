import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { combosApi } from "@/entities/api";
import { useI18n } from "@/i18n";

const { Text, Title } = Typography;

const useStyles = createStyles(({ token }) => ({
  statCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "12px 16px",
  },
  sectionCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  controlBox: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillQuaternary,
    padding: 12,
  },
}));

interface McpTool {
  name: string;
  description: string;
  scopes: string[];
  phase: number;
  auditLevel: "none" | "basic" | "full";
  sourceEndpoints?: string[];
}

interface McpAuditEntry {
  id: number;
  toolName: string;
  durationMs: number;
  apiKeyId: string | null;
  success: boolean;
  errorCode: string | null;
  createdAt: string;
}

export function McpDashboard() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const { tt } = useI18n();
  const queryClient = useQueryClient();

  const [toolFilter, setToolFilter] = useState("");
  const [successFilter, setSuccessFilter] = useState<string>("all");
  const [apiKeyFilter, setApiKeyFilter] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [selectedComboId, setSelectedComboId] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<"balanced" | "aggressive" | "conservative">("balanced");

  // Query MCP status
  const mcpStatusQuery = useQuery({
    queryKey: ["mcp-status-full"],
    queryFn: async () => {
      const res = await fetch("/api/mcp/status");
      if (!res.ok) throw new Error(tt("MCP 状态不可用", "MCP status unavailable"));
      return await res.json();
    },
    staleTime: 15_000,
  });

  // Query MCP Tools
  const mcpToolsQuery = useQuery({
    queryKey: ["mcp-tools-list"],
    queryFn: async () => {
      const res = await fetch("/api/mcp/tools");
      if (!res.ok) throw new Error(tt("MCP 工具目录不可用", "MCP tools catalog unavailable"));
      const json = await res.json();
      return Array.isArray(json.tools) ? (json.tools as McpTool[]) : [];
    },
    staleTime: 30_000,
  });

  // Query Combos
  const combosQuery = useQuery({
    queryKey: ["combos-for-mcp"],
    queryFn: combosApi.list,
    staleTime: 30_000,
  });

  const combos = combosQuery.data?.combos ?? [];
  const activeCombo = combos.find((c) => c.id === selectedComboId) || combos[0];

  // Query MCP Audit Logs
  const auditQuery = useQuery({
    queryKey: ["mcp-audit-logs", auditPage, toolFilter, successFilter, apiKeyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      params.set("offset", String((auditPage - 1) * 10));
      if (toolFilter) params.set("tool", toolFilter);
      if (successFilter !== "all") params.set("success", successFilter);
      if (apiKeyFilter) params.set("apiKeyId", apiKeyFilter);

      const res = await fetch(`/api/mcp/audit?${params.toString()}`);
      if (!res.ok) throw new Error(tt("MCP 审计日志不可用", "MCP audit logs unavailable"));
      return await res.json();
    },
    staleTime: 10_000,
  });

  // Resilience Mutation
  const applyResilience = useMutation({
    mutationFn: async (profile: string) => {
      const res = await fetch("/api/resilience", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (!res.ok) throw new Error(tt("应用韧性策略失败", "Failed to apply resilience profile"));
    },
    onSuccess: () => message.success(tt("韧性限流与熔断策略已生效", "Resilience and rate limit profile applied")),
    onError: (err) => message.error(err instanceof Error ? err.message : tt("应用失败", "Apply failed")),
  });

  // Reset Breakers Mutation
  const resetBreakers = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/monitoring/health", { method: "DELETE" });
      if (!res.ok) throw new Error(tt("重置熔断器失败", "Failed to reset circuit breakers"));
    },
    onSuccess: () => message.success(tt("所有提供商熔断器状态已重置恢复", "All provider circuit breakers reset")),
    onError: (err) => message.error(err instanceof Error ? err.message : tt("重置失败", "Reset failed")),
  });

  const status = mcpStatusQuery.data;
  const tools = mcpToolsQuery.data ?? [];
  const auditData = auditQuery.data ?? { entries: [], total: 0 };

  const formatDuration = (ms?: number | null) => {
    if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const auditColumns = [
    {
      title: tt("调用时间", "Invocation Time"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleString()}</Text>,
    },
    {
      title: tt("工具名称", "Tool Name"),
      dataIndex: "toolName",
      key: "toolName",
      render: (v: string) => (
        <Text code strong style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
    {
      title: tt("执行耗时", "Latency"),
      dataIndex: "durationMs",
      key: "durationMs",
      width: 100,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{v}ms</Text>,
    },
    {
      title: tt("结果状态", "Status"),
      dataIndex: "success",
      key: "success",
      width: 120,
      render: (succ: boolean, row: McpAuditEntry) => (
        <Tag color={succ ? "success" : "error"} style={{ margin: 0 }}>
          {succ ? tt("执行成功", "Success") : row.errorCode || tt("失败", "Failed")}
        </Tag>
      ),
    },
    {
      title: tt("鉴权密钥", "Auth Key"),
      dataIndex: "apiKeyId",
      key: "apiKeyId",
      width: 160,
      render: (v: string | null) => (
        <Text type="secondary" code style={{ fontSize: 11 }}>
          {v || "—"}
        </Text>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {/* 4 Metric Status Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("MCP 服务进程", "MCP Daemon Process")}
            </Text>
            <Flex align="center" gap={6} style={{ marginTop: 4 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: status?.online ? "#10B981" : "#EF4444",
                }}
              />
              <Text strong style={{ fontSize: 16 }}>
                {status?.online ? tt("正常在线", "Online") : tt("已离线", "Offline")}
              </Text>
            </Flex>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("进程 PID", "Process PID")}
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16 }}>
                  {status?.heartbeat?.pid ?? "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("持续运行时间", "Uptime")}
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16 }}>
              {status?.heartbeat?.uptimeMs != null ? formatDuration(status.heartbeat.uptimeMs) : "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("心跳响应延时", "Heartbeat Latency")}
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16, color: "#10B981" }}>
              {status?.heartbeat?.heartbeatAgeMs != null ? formatDuration(status.heartbeat.heartbeatAgeMs) : "—"}
            </Title>
          </div>
        </Col>
      </Row>

      {/* 24h Activity Analysis Card */}
      <Card size="small" className={styles.sectionCard} title={tt("MCP 24 小时活动分析", "MCP 24h Activity Analysis")}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Flex vertical gap={12}>
              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {tt("24小时总调用量", "24h Total Invocations")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20 }}>
                  {status?.activity?.totalCalls24h ?? "—"} {status?.activity?.totalCalls24h != null ? tt("次", "calls") : ""}
                </Title>
              </div>

              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {tt("调用成功率", "Success Rate")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20, color: "#10B981" }}>
                  {status?.activity?.successRate != null ? `${(status.activity.successRate * 100).toFixed(1)}%` : "—"}
                </Title>
              </div>

              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {tt("平均执行耗时", "Avg Execution Latency")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20 }}>
                  {status?.activity?.avgDurationMs != null ? `${status.activity.avgDurationMs} ms` : "—"}
                </Title>
              </div>
            </Flex>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ height: "100%", padding: 12, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                🔥 {tt("高频调用工具排行", "Top Invocated Tools")}
              </Text>
              <Flex vertical gap={8}>
                {(status?.activity?.topTools || []).map((t: { tool: string; count: number }) => (
                  <Flex key={t.tool} justify="space-between" align="center">
                    <Text code style={{ fontSize: 12 }}>
                      {t.tool}
                    </Text>
                    <Tag color="blue">{t.count} {tt("次", "calls")}</Tag>
                  </Flex>
                ))}
              </Flex>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ height: "100%", padding: 12, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                ⚙️ {tt("运行时配置与安全", "Runtime Config & Security")}
              </Text>
              <Flex vertical gap={6}>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>{tt("传输通道:", "Transport:")}</Text>
                  <Text code style={{ fontSize: 12 }}>{status?.transport || "—"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>{tt("权限范围审计:", "Scope Enforcement:")}</Text>
                  <Tag color="success">{tt("已强制校验", "Enforced")}</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>{tt("最近调用工具:", "Last Tool Called:")}</Text>
                  <Text code style={{ fontSize: 12 }}>{status?.activity?.lastCallTool || "—"}</Text>
                </Flex>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{tt("心跳管道路径:", "Heartbeat Socket:")}</Text>
                  <Text code style={{ fontSize: 11, wordBreak: "break-all" }}>
                    {status?.heartbeatPath || "—"}
                  </Text>
                </div>
              </Flex>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Operational Controls */}
      <Card size="small" className={styles.sectionCard} title={tt("MCP 运维与韧性管控", "MCP Operations & Resilience")}>
        <Row gutter={[12, 12]}>
          {/* Switch Combo */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("默认调度模型组合", "Default Routing Combo")}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("为 MCP 工具执行分派默认的主力模型组合", "Assign default combo for MCP tool execution")}
              </Text>
              <Flex gap={8}>
                <Select
                  style={{ flex: 1 }}
                  value={activeCombo?.id || ""}
                  onChange={setSelectedComboId}
                  options={combos.map((c) => ({
                    label: `${c.name} (${c.isActive !== false ? tt("活跃", "Active") : tt("已停用", "Disabled")})`,
                    value: c.id,
                  }))}
                />
                <Button
                  onClick={() => message.success(tt(`MCP 默认模型组合已切换为 ${activeCombo?.name}`, `MCP default combo switched to ${activeCombo?.name}`))}
                >
                  {tt("应用", "Apply")}
                </Button>
              </Flex>
            </div>
          </Col>

          {/* Resilience Profile */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("韧性与限流策略预设", "Resilience & Rate Limit Profile")}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("调节并发数、请求冷却与熔断重试敏感度", "Configure concurrency, cooldown and breaker thresholds")}
              </Text>
              <Flex gap={8}>
                <Select
                  style={{ flex: 1 }}
                  value={selectedProfile}
                  onChange={setSelectedProfile}
                  options={[
                    { label: tt("均衡模式", "Balanced"), value: "balanced" },
                    { label: tt("激进高吞吐", "Aggressive"), value: "aggressive" },
                    { label: tt("保守稳定", "Conservative"), value: "conservative" },
                  ]}
                />
                <Button
                  type="primary"
                  loading={applyResilience.isPending}
                  onClick={() => applyResilience.mutate(selectedProfile)}
                >
                  {tt("应用策略", "Apply Profile")}
                </Button>
              </Flex>
            </div>
          </Col>

          {/* Reset Circuit Breakers */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("提供商故障熔断器", "Provider Circuit Breakers")}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("若上游节点因网络抖动触发了熔断封锁，可手动一键恢复", "Manually reset breakers if triggered by upstream network jitter")}
              </Text>
              <Popconfirm
                title={tt("确认重置所有提供商熔断器状态？", "Confirm resetting all circuit breaker states?")}
                onConfirm={() => resetBreakers.mutate()}
              >
                <Button danger loading={resetBreakers.isPending} style={{ width: "100%" }}>
                  {tt("一键重置所有熔断器", "Reset All Breakers")}
                </Button>
              </Popconfirm>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tools and Scopes Table */}
      <Card size="small" className={styles.sectionCard} title={tt(`MCP 工具与权限范围清单 (${tools.length} 个工具)`, `MCP Tools & Permission Scopes (${tools.length} Tools)`)}>
        <Table
          size="small"
          rowKey="name"
          dataSource={tools}
          pagination={false}
          columns={[
            {
              title: tt("工具标识", "Tool Name"),
              dataIndex: "name",
              key: "name",
              render: (v: string) => <Text code strong style={{ fontSize: 12 }}>{v}</Text>,
            },
            {
              title: tt("描述说明", "Description"),
              dataIndex: "description",
              key: "description",
              render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
            },
            {
              title: tt("所需权限 Scope", "Required Scopes"),
              dataIndex: "scopes",
              key: "scopes",
              render: (sc: string[]) => (
                <Space size={4} wrap>
                  {sc.map((s) => (
                    <Tag key={s} color="blue" style={{ fontSize: 10 }}>{s}</Tag>
                  ))}
                </Space>
              ),
            },
            {
              title: tt("审计级别", "Audit Level"),
              dataIndex: "auditLevel",
              key: "auditLevel",
              width: 100,
              render: (lvl: string) => (
                <Tag color={lvl === "full" ? "purple" : lvl === "basic" ? "cyan" : "default"}>
                  {lvl}
                </Tag>
              ),
            },
          ]}
        />
      </Card>

      {/* Audit Log Table */}
      <Card size="small" className={styles.sectionCard} title={tt("MCP 工具调用审计日志", "MCP Tool Invocation Audit Logs")}>
        {/* Filters */}
        <Flex gap={8} wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder={tt("按工具名过滤...", "Filter by tool name...")}
            value={toolFilter}
            onChange={(e) => {
              setToolFilter(e.target.value);
              setAuditPage(1);
            }}
            style={{ width: 180 }}
          />
          <Select
            value={successFilter}
            onChange={(v) => {
              setSuccessFilter(v);
              setAuditPage(1);
            }}
            style={{ width: 130 }}
            options={[
              { label: tt("全部结果", "All Results"), value: "all" },
              { label: tt("执行成功", "Success"), value: "true" },
              { label: tt("执行失败", "Failed"), value: "false" },
            ]}
          />
          <Input
            placeholder={tt("按 API Key 过滤...", "Filter by API Key...")}
            value={apiKeyFilter}
            onChange={(e) => {
              setApiKeyFilter(e.target.value);
              setAuditPage(1);
            }}
            style={{ width: 180 }}
          />
          <Button
            icon={<MaterialIcon name="refresh" size={14} />}
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["mcp-audit-logs"] })}
          >
            {tt("刷新日志", "Refresh")}
          </Button>
        </Flex>

        <Table
          size="small"
          rowKey="id"
          loading={auditQuery.isLoading}
          dataSource={auditData.entries}
          columns={auditColumns}
          pagination={{
            current: auditPage,
            pageSize: 10,
            total: auditData.total,
            onChange: (p) => setAuditPage(p),
            showTotal: (total) => tt(`共 ${total} 条审计记录`, `Total ${total} entries`),
          }}
        />
      </Card>
    </Flex>
  );
}
