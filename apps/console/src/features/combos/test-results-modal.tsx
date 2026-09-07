import { useMemo } from "react";
import { Alert, Button, Flex, Modal, Space, Table, Tag, Typography, theme } from "antd";
import { createStyles } from "antd-style";
import { Scrollbar } from "@shiguang2/components/esm/scrollbar";
import { MaterialIcon } from "@/app/nav";
import type { ComboTestResponse, ComboTestResultItem } from "@/entities/api";

const { Text, Paragraph } = Typography;

interface TestResultsModalProps {
  open: boolean;
  onClose: () => void;
  comboName: string;
  results: ComboTestResponse | null;
  loading?: boolean;
  onReTest?: () => void;
}

const useStyles = createStyles(({ token }) => ({
  modalTitle: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  kpiBox: {
    boxSizing: "border-box",
    borderRadius: 8,
    padding: "10px 14px",
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  codeSnippet: {
    boxSizing: "border-box",
    fontFamily: "monospace",
    fontSize: 11,
    padding: "6px 10px",
    borderRadius: 4,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    maxHeight: 120,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
}));

export function TestResultsModal({
  open,
  onClose,
  comboName,
  results,
  loading = false,
  onReTest,
}: TestResultsModalProps) {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const items: ComboTestResultItem[] = results?.results ?? [];
  const isSuccess = Boolean(results?.resolvedBy) && !results?.error;

  const totalLatencyMs = useMemo(
    () => items.reduce((sum, it) => sum + (typeof it.latencyMs === "number" ? it.latencyMs : 0), 0),
    [items]
  );
  const resolvedProvider =
    typeof results?.resolvedByTarget?.provider === "string"
      ? results.resolvedByTarget.provider
      : undefined;
  const resolvedConnectionId =
    typeof results?.resolvedByTarget?.connectionId === "string"
      ? results.resolvedByTarget.connectionId
      : undefined;

  const columns = [
    {
      title: "调度顺位 / 目标节点",
      key: "target",
      width: 320,
      render: (_: unknown, record: ComboTestResultItem, index: number) => (
        <Space size={6} align="center" wrap={false} style={{ maxWidth: "100%" }}>
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: record.status === "ok" ? "rgba(16, 185, 129, 0.15)" : token.colorFillSecondary,
              color: record.status === "ok" ? "#10B981" : token.colorTextSecondary,
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <Text code strong style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            {record.model}
          </Text>
          {record.provider && (
            <Tag style={{ fontSize: 10, margin: 0, flexShrink: 0 }}>{record.provider}</Tag>
          )}
          {record.connectionId && (
            <Text type="secondary" style={{ fontSize: 10, flexShrink: 0, whiteSpace: "nowrap" }}>
              账户 {record.connectionId.slice(0, 8)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "执行状态",
      key: "status",
      width: 120,
      render: (_: unknown, record: ComboTestResultItem) => {
        if (record.status === "ok") return <Tag color="success" style={{ margin: 0, whiteSpace: "nowrap" }}>成功 (200 OK)</Tag>;
        if (record.status === "skipped") return <Tag color="default" style={{ margin: 0, whiteSpace: "nowrap" }}>跳过 / 未命中</Tag>;
        return <Tag color="error" style={{ margin: 0, whiteSpace: "nowrap" }}>失败 / 降级</Tag>;
      },
    },
    {
      title: "耗时",
      dataIndex: "latencyMs",
      key: "latencyMs",
      width: 85,
      render: (val?: number) => (val !== undefined ? <Text strong style={{ fontSize: 12 }}>{val}ms</Text> : "—"),
    },
    {
      title: "响应结果 / 诊断错误",
      key: "details",
      render: (_: unknown, record: ComboTestResultItem) => {
        if (record.error) {
          return (
            <div style={{ color: "#EF4444", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
              <MaterialIcon name="error_outline" size={14} style={{ flexShrink: 0 }} />
              <span style={{ wordBreak: "break-all" }}>{record.error}</span>
            </div>
          );
        }
        if (record.responseText) {
          return (
            <Paragraph
              ellipsis={{ rows: 1, expandable: true, symbol: "展开完整响应" }}
              style={{ fontSize: 11, margin: 0, color: token.colorTextSecondary }}
            >
              {record.responseText}
            </Paragraph>
          );
        }
        return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
      },
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={960}
      style={{ maxWidth: "95vw" }}
      title={
        <div className={styles.modalTitle}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: isSuccess ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcon
              name={isSuccess ? "check_circle" : "error"}
              size={16}
              style={{ color: isSuccess ? "#10B981" : "#EF4444" }}
            />
          </div>
          <span style={{ fontSize: 15, fontWeight: 600 }}>组合健康测试结果</span>
          <Tag color="purple" style={{ marginLeft: 4, fontSize: 11 }}>
            {comboName}
          </Tag>
        </div>
      }
      footer={
        <Flex align="center" justify="space-between">
          <Text type="secondary" style={{ fontSize: 11 }}>
            测试请求不计入正式账单，仅用于探活与路由链路校验
          </Text>
          <Space>
            {onReTest && (
              <Button icon={<MaterialIcon name="refresh" size={14} />} onClick={onReTest} loading={loading}>
                再次测试
              </Button>
            )}
            <Button type="primary" onClick={onClose}>
              关闭
            </Button>
          </Space>
        </Flex>
      }
    >
      <Flex vertical gap={12} style={{ marginTop: 12 }}>
        {results?.error ? (
          <Alert
            type="error"
            showIcon
            message="测试请求失败"
            description={results.error}
          />
        ) : isSuccess ? (
          <div className={styles.kpiBox}>
            <Flex align="center" justify="space-between" wrap gap={12}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  最终命中并成功响应的目标节点:
                </Text>
                <Space size={6} style={{ marginTop: 2 }}>
                  <Text code strong style={{ fontSize: 13, color: "#10B981" }}>
                    {results?.resolvedBy}
                  </Text>
                  {resolvedProvider && (
                    <Tag style={{ margin: 0, fontSize: 10 }}>{resolvedProvider}</Tag>
                  )}
                  {resolvedConnectionId && (
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      账户 {resolvedConnectionId.slice(0, 8)}
                    </Text>
                  )}
                </Space>
              </div>

              {totalLatencyMs > 0 && (
                <div style={{ textAlign: "right" }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    端到端测试耗时:
                  </Text>
                  <Text strong style={{ fontSize: 14 }}>
                    {totalLatencyMs}ms
                  </Text>
                </div>
              )}
            </Flex>
          </div>
        ) : null}

        <div>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            调度链路执行明细:
          </Text>
          <Scrollbar scrollX={false} style={{ maxHeight: 460 }}>
            <Table
              dataSource={items}
              columns={columns}
              rowKey={(record, idx) => `${record.model}-${record.provider}-${idx}`}
              pagination={false}
              size="small"
              loading={loading}
              locale={{ emptyText: "暂无执行明细记录" }}
            />
          </Scrollbar>
        </div>
      </Flex>
    </Modal>
  );
}

export default TestResultsModal;
