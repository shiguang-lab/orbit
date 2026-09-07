import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Drawer,
  Flex,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { trafficInspectorApi, type TrafficInspectorRecord } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  payloadBox: {
    background: "#09090b",
    color: "#f4f4f5",
    borderRadius: 8,
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: 11,
    lineHeight: 1.5,
    maxHeight: 280,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
  },
}));

export function TrafficInspectorPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const [selectedRecord, setSelectedRecord] = useState<TrafficInspectorRecord | null>(null);

  const trafficQuery = useQuery({
    queryKey: ["traffic-inspector-records"],
    queryFn: () => trafficInspectorApi.list(20),
    refetchInterval: 5000,
  });

  if (trafficQuery.isLoading) {
    return <PageSkeleton />;
  }

  const records = trafficQuery.data ?? [];

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
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
              <MaterialIcon name="network_check" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("实时流量检查器与探针", "Live Traffic Inspector")}
                </Title>
                <Tag color="cyan">{tt("实时抓包与报文审计", "Live Sniffer & Audit")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "实时捕获流经网关的请求与响应 Payload、压缩衰减指标、响应耗时及上游 Token 计费。",
                  "Inspect live request and response payloads, compression metrics, latency, and upstream token usage."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            onClick={() => void trafficQuery.refetch()}
          >
            {tt("刷新流量", "Refresh Traffic")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Requests Table */}
      <Card title={tt("最新网关抓包流", "Live Request Sniffer")} className={styles.sectionCard} size="small">
        <Table<TrafficInspectorRecord>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={records}
          columns={[
            {
              title: tt("请求时间", "Timestamp"),
              dataIndex: "timestamp",
              key: "timestamp",
              width: 110,
              render: (t) => <Text style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: tt("请求方法与路径", "Method & Path"),
              key: "path",
              render: (_, record) => (
                <Flex align="center" gap={6}>
                  <Tag color="blue" style={{ margin: 0 }}>{record.method}</Tag>
                  <code style={{ fontSize: 12 }}>{record.path}</code>
                </Flex>
              ),
            },
            {
              title: tt("目标模型", "Target Model"),
              dataIndex: "model",
              key: "model",
              render: (m) => <Text strong style={{ fontSize: 12 }}>{m}</Text>,
            },
            {
              title: tt("状态 / 耗时", "Status / Latency"),
              key: "status",
              render: (_, record) => (
                <Flex align="center" gap={6}>
                  <Badge status={record.status === 200 ? "success" : "error"} />
                  <span>{record.status}</span>
                  <Tag style={{ margin: 0, fontSize: 11 }}>{record.durationMs}ms</Tag>
                </Flex>
              ),
            },
            {
              title: tt("Token / 压缩节省", "Tokens / Savings"),
              key: "tokens",
              render: (_, record) => (
                <div>
                  <div style={{ fontSize: 11 }}>Prompt: {record.promptTokens} | Output: {record.completionTokens}</div>
                  {record.compressed && (
                    <Tag color="green" style={{ margin: 0, fontSize: 10 }}>{record.compressionSavings}</Tag>
                  )}
                </div>
              ),
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              width: 100,
              render: (_, record) => (
                <Button
                  size="small"
                  type="link"
                  icon={<MaterialIcon name="visibility" size={14} />}
                  onClick={() => setSelectedRecord(record)}
                >
                  {tt("探查", "Inspect")}
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* 3. Detail Drawer */}
      <Drawer
        title={`${tt("流量探针详情", "Traffic Inspector Details")} — ${selectedRecord?.id || ""}`}
        open={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        width={600}
      >
        {selectedRecord && (
          <Space orientation="vertical" size={14} style={{ width: "100%" }}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("请求 Payload (Request Body):", "Request Payload (Request Body):")}
              </Text>
              <pre className={styles.payloadBox}>
                {JSON.stringify(selectedRecord.requestPayload, null, 2)}
              </pre>
            </div>

            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("响应 Payload (Response Body):", "Response Payload (Response Body):")}
              </Text>
              <pre className={styles.payloadBox}>
                {JSON.stringify(selectedRecord.responsePayload, null, 2)}
              </pre>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default TrafficInspectorPage;
