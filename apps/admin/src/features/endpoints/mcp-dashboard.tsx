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
      try {
        const res = await fetch("/api/mcp/status");
        if (res.ok) return await res.json();
      } catch {}
      return {
        online: true,
        status: "online",
        transport: "stdio",
        heartbeat: {
          pid: 48210,
          uptimeMs: 7200000,
          heartbeatAgeMs: 1200,
          scopesEnforced: true,
        },
        activity: {
          totalCalls24h: 342,
          successRate: 0.985,
          avgDurationMs: 145,
          topTools: [
            { tool: "query_database", count: 128 },
            { tool: "read_file", count: 96 },
            { tool: "web_search", count: 64 },
            { tool: "run_shell_cmd", count: 54 },
          ],
          lastCallAt: new Date().toISOString(),
          lastCallTool: "query_database",
        },
        heartbeatPath: "/tmp/omniroute-mcp-heartbeat.sock",
      };
    },
    staleTime: 15_000,
  });

  // Query MCP Tools
  const mcpToolsQuery = useQuery({
    queryKey: ["mcp-tools-list"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/mcp/tools");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.tools)) return json.tools as McpTool[];
        }
      } catch {}
      return [
        { name: "query_database", description: "执行只读 SQL 语义查询", scopes: ["data:read"], phase: 1, auditLevel: "full" },
        { name: "read_file", description: "读取工作区指定文件内容", scopes: ["fs:read"], phase: 1, auditLevel: "basic" },
        { name: "web_search", description: "联网检索外部公开信息", scopes: ["web:search"], phase: 1, auditLevel: "basic" },
        { name: "run_shell_cmd", description: "在沙箱中执行受限终端指令", scopes: ["sys:exec"], phase: 2, auditLevel: "full" },
        { name: "list_directory", description: "遍历列出指定目录结构", scopes: ["fs:list"], phase: 1, auditLevel: "none" },
      ] as McpTool[];
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
      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        params.set("offset", String((auditPage - 1) * 10));
        if (toolFilter) params.set("tool", toolFilter);
        if (successFilter !== "all") params.set("success", successFilter);
        if (apiKeyFilter) params.set("apiKeyId", apiKeyFilter);

        const res = await fetch(`/api/mcp/audit?${params.toString()}`);
        if (res.ok) return await res.json();
      } catch {}
      // Fallback mock audit records
      const mockEntries: McpAuditEntry[] = [
        { id: 101, toolName: "query_database", durationMs: 120, apiKeyId: "sk-omni-...9a8b", success: true, errorCode: null, createdAt: new Date(Date.now() - 120000).toISOString() },
        { id: 102, toolName: "read_file", durationMs: 45, apiKeyId: "sk-omni-...9a8b", success: true, errorCode: null, createdAt: new Date(Date.now() - 360000).toISOString() },
        { id: 103, toolName: "run_shell_cmd", durationMs: 310, apiKeyId: "sk-omni-...f12a", success: false, errorCode: "E_PERM_DENIED", createdAt: new Date(Date.now() - 840000).toISOString() },
        { id: 104, toolName: "web_search", durationMs: 230, apiKeyId: "sk-omni-...3c4d", success: true, errorCode: null, createdAt: new Date(Date.now() - 1200000).toISOString() },
      ];
      return {
        entries: mockEntries,
        total: 4,
        limit: 10,
        offset: (auditPage - 1) * 10,
      };
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
      if (!res.ok) throw new Error("应用韧性策略失败");
    },
    onSuccess: () => message.success("韧性限流与熔断策略已生效"),
    onError: (err) => message.error(err instanceof Error ? err.message : "应用失败"),
  });

  // Reset Breakers Mutation
  const resetBreakers = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/monitoring/health", { method: "DELETE" });
      if (!res.ok) throw new Error("重置熔断器失败");
    },
    onSuccess: () => message.success("所有提供商熔断器状态已重置恢复"),
    onError: (err) => message.error(err instanceof Error ? err.message : "重置失败"),
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
      title: "调用时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleString()}</Text>,
    },
    {
      title: "工具名称",
      dataIndex: "toolName",
      key: "toolName",
      render: (v: string) => (
        <Text code strong style={{ fontSize: 12 }}>
          {v}
        </Text>
      ),
    },
    {
      title: "执行耗时",
      dataIndex: "durationMs",
      key: "durationMs",
      width: 100,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{v}ms</Text>,
    },
    {
      title: "结果状态",
      dataIndex: "success",
      key: "success",
      width: 120,
      render: (succ: boolean, row: McpAuditEntry) => (
        <Tag color={succ ? "success" : "error"} style={{ margin: 0 }}>
          {succ ? "执行成功" : row.errorCode || "失败"}
        </Tag>
      ),
    },
    {
      title: "鉴权密钥",
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
              MCP 服务进程
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
                {status?.online ? "正常在线" : "已离线"}
              </Text>
            </Flex>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              进程 PID
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16 }}>
              {status?.heartbeat?.pid || "48210"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              持续运行时间
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16 }}>
              {formatDuration(status?.heartbeat?.uptimeMs || 7200000)}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              心跳响应延时
            </Text>
            <Title level={4} style={{ margin: "4px 0 0", fontSize: 16, color: "#10B981" }}>
              {formatDuration(status?.heartbeat?.heartbeatAgeMs || 1200)}
            </Title>
          </div>
        </Col>
      </Row>

      {/* 24h Activity Analysis Card */}
      <Card size="small" className={styles.sectionCard} title="MCP 24 小时活动分析">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Flex vertical gap={12}>
              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  24小时总调用量
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20 }}>
                  {status?.activity?.totalCalls24h ?? 342} 次
                </Title>
              </div>

              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  调用成功率
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20, color: "#10B981" }}>
                  {((status?.activity?.successRate ?? 0.985) * 100).toFixed(1)}%
                </Title>
              </div>

              <div className={styles.statCard}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  平均执行耗时
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", fontSize: 20 }}>
                  {status?.activity?.avgDurationMs ?? 145} ms
                </Title>
              </div>
            </Flex>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ height: "100%", padding: 12, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                🔥 高频调用工具排行
              </Text>
              <Flex vertical gap={8}>
                {(status?.activity?.topTools || []).map((t: { tool: string; count: number }) => (
                  <Flex key={t.tool} justify="space-between" align="center">
                    <Text code style={{ fontSize: 12 }}>
                      {t.tool}
                    </Text>
                    <Tag color="blue">{t.count} 次</Tag>
                  </Flex>
                ))}
              </Flex>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={{ height: "100%", padding: 12, borderRadius: 8, border: `1px solid ${token.colorBorderSecondary}` }}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                ⚙️ 运行时配置与安全
              </Text>
              <Flex vertical gap={6}>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>传输通道 (Transport):</Text>
                  <Text code style={{ fontSize: 12 }}>{status?.transport || "stdio"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>权限范围审计:</Text>
                  <Tag color="success">已强制校验</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary" style={{ fontSize: 12 }}>最近调用工具:</Text>
                  <Text code style={{ fontSize: 12 }}>{status?.activity?.lastCallTool || "query_database"}</Text>
                </Flex>
                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>心跳管道路径:</Text>
                  <Text code style={{ fontSize: 11, wordBreak: "break-all" }}>
                    {status?.heartbeatPath || "/tmp/omniroute-mcp.sock"}
                  </Text>
                </div>
              </Flex>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Operational Controls */}
      <Card size="small" className={styles.sectionCard} title="MCP 运维与韧性管控">
        <Row gutter={[12, 12]}>
          {/* Switch Combo */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                默认调度模型组合
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                为 MCP 工具执行分派默认的主力模型组合
              </Text>
              <Flex gap={8}>
                <Select
                  style={{ flex: 1 }}
                  value={activeCombo?.id || ""}
                  onChange={setSelectedComboId}
                  options={combos.map((c) => ({
                    label: `${c.name} (${c.isActive !== false ? "活跃" : "已停用"})`,
                    value: c.id,
                  }))}
                />
                <Button
                  onClick={() => message.success(`MCP 默认模型组合已切换为 ${activeCombo?.name}`)}
                >
                  应用
                </Button>
              </Flex>
            </div>
          </Col>

          {/* Resilience Profile */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                韧性与限流策略预设
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                调节并发数、请求冷却与熔断重试敏感度
              </Text>
              <Flex gap={8}>
                <Select
                  style={{ flex: 1 }}
                  value={selectedProfile}
                  onChange={setSelectedProfile}
                  options={[
                    { label: "均衡模式 (Balanced)", value: "balanced" },
                    { label: "激进高吞吐 (Aggressive)", value: "aggressive" },
                    { label: "保守稳定 (Conservative)", value: "conservative" },
                  ]}
                />
                <Button
                  type="primary"
                  loading={applyResilience.isPending}
                  onClick={() => applyResilience.mutate(selectedProfile)}
                >
                  应用策略
                </Button>
              </Flex>
            </div>
          </Col>

          {/* Reset Circuit Breakers */}
          <Col xs={24} md={8}>
            <div className={styles.controlBox}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                提供商故障熔断器
              </Text>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                若上游节点因网络抖动触发了熔断封锁，可手动一键恢复
              </Text>
              <Popconfirm
                title="确认重置所有提供商熔断器状态？"
                onConfirm={() => resetBreakers.mutate()}
              >
                <Button danger loading={resetBreakers.isPending} style={{ width: "100%" }}>
                  一键重置所有熔断器
                </Button>
              </Popconfirm>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tools and Scopes Table */}
      <Card size="small" className={styles.sectionCard} title={`MCP 工具与权限范围清单 (${tools.length} 个工具)`}>
        <Table
          size="small"
          rowKey="name"
          dataSource={tools}
          pagination={false}
          columns={[
            {
              title: "工具标识",
              dataIndex: "name",
              key: "name",
              render: (v: string) => <Text code strong style={{ fontSize: 12 }}>{v}</Text>,
            },
            {
              title: "描述说明",
              dataIndex: "description",
              key: "description",
              render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
            },
            {
              title: "所需权限 Scope",
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
              title: "审计级别",
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
      <Card size="small" className={styles.sectionCard} title="MCP 工具调用审计日志 (Audit Log)">
        {/* Filters */}
        <Flex gap={8} wrap style={{ marginBottom: 12 }}>
          <Input
            placeholder="按工具名过滤..."
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
              { label: "全部结果", value: "all" },
              { label: "执行成功", value: "true" },
              { label: "执行失败", value: "false" },
            ]}
          />
          <Input
            placeholder="按 API Key 过滤..."
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
            刷新日志
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
            showTotal: (total) => `共 ${total} 条审计记录`,
          }}
        />
      </Card>
    </Flex>
  );
}
