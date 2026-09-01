import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Flex,
  Modal,
  Progress,
  Row,
  Slider,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { MaterialIcon } from "@/app/nav";

const { Title, Text } = Typography;

interface ProviderWindowCostRow {
  apiKeyKey: string;
  apiKeyId: string | null;
  apiKeyName: string;
  requests: number;
  totalTokens: number;
  costUsd: number;
  limitUsd: number | null;
  limitPeriod: string | null;
  limitUsedPercent: number | null;
  budgetResetAt: string | null;
  lastUsed: string | null;
}

interface ProviderWindowCostPayload {
  provider: string;
  connectionId: string | null;
  windowStartAt: string;
  windowResetAt: string | null;
  windowSource: "provider_weekly_reset" | "fallback_rolling_7d";
  windowStartSource:
    | "recorded_reset_event"
    | "observed_snapshot_reset"
    | "inferred_from_reset_at"
    | "fallback_rolling_7d";
  quotaName: string | null;
  quotaUsedPercent: number | null;
  quotaRemainingPercent: number | null;
  totalCostUsd: number;
  estimatedFullQuotaUsd: number | null;
  rows: ProviderWindowCostRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  connection: any;
  providerLabel: string;
  accountLabel: string;
}

function formatUsd(value: number | null | undefined): string {
  const numeric = Number(value || 0);
  const abs = Math.abs(numeric);
  const digits = abs > 0 && abs < 0.01 ? 6 : abs < 1 ? 4 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(numeric);
}

function formatDateTime(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return fallback;
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProviderUsdCostModal({
  open,
  onClose,
  connection,
  providerLabel,
  accountLabel,
}: Props) {
  const [payload, setPayload] = useState<ProviderWindowCostPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatedPercent, setSimulatedPercent] = useState(25);

  useEffect(() => {
    if (!open || !connection?.provider) return;
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ provider: String(connection.provider) });
        if (connection.id) params.set("connectionId", String(connection.id));
        const response = await fetch(`/api/usage/provider-window-costs?${params.toString()}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${response.status}`);
        }
        const data = (await response.json()) as ProviderWindowCostPayload;
        if (alive) setPayload(data);
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : "加载 USD 成本明细失败");
          setPayload(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [open, connection?.id, connection?.provider]);

  const maxCost = useMemo(
    () => Math.max(...(payload?.rows || []).map((row) => row.costUsd), 0),
    [payload]
  );
  const simulatedUsd =
    payload?.estimatedFullQuotaUsd !== null && payload?.estimatedFullQuotaUsd !== undefined
      ? (payload.estimatedFullQuotaUsd * simulatedPercent) / 100
      : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Flex align="center" gap={8}>
          <MaterialIcon name="attach_money" size={20} style={{ color: "#10B981" }} />
          <div>
            <span style={{ fontSize: 16, fontWeight: 600 }}>USD 成本明细与额度估算</span>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              {providerLabel} · {accountLabel || connection?.id}
            </Text>
          </div>
        </Flex>
      }
      footer={null}
      width={680}
      destroyOnClose
    >
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <Spin tip="正在计算周期内 USD 消耗明细..." />
          </div>
        ) : error ? (
          <Alert type="error" showIcon message={error} style={{ margin: "16px 0" }} />
        ) : payload ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* KPI Summary 4-Col */}
            <Row gutter={[10, 10]}>
              <Col span={6}>
                <Card size="small" style={{ background: "rgba(128,128,128,0.04)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    窗口总消耗
                  </Text>
                  <Title level={4} style={{ margin: "2px 0 0", color: "#10B981" }}>
                    {formatUsd(payload.totalCostUsd)}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: "rgba(128,128,128,0.04)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    配额已消耗
                  </Text>
                  <Title level={4} style={{ margin: "2px 0 0" }}>
                    {payload.quotaUsedPercent !== null && payload.quotaUsedPercent !== undefined
                      ? `${payload.quotaUsedPercent.toFixed(1)}%`
                      : "n/a"}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: "rgba(128,128,128,0.04)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    满额估算价值
                  </Text>
                  <Title level={4} style={{ margin: "2px 0 0" }}>
                    {payload.estimatedFullQuotaUsd === null
                      ? "n/a"
                      : formatUsd(payload.estimatedFullQuotaUsd)}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" style={{ background: "rgba(128,128,128,0.04)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    消耗 Key 数量
                  </Text>
                  <Title level={4} style={{ margin: "2px 0 0" }}>
                    {payload.rows.length}
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* Window Timeline & Simulator Slider */}
            <Card size="small" style={{ background: "rgba(128,128,128,0.02)" }}>
              <Flex justify="space-between" align="center" wrap gap={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  统计窗口: {formatDateTime(payload.windowStartAt, "未知")} →{" "}
                  {formatDateTime(payload.windowResetAt, "未知")}
                </Text>
                <Tag color="cyan" style={{ margin: 0 }}>
                  {payload.windowSource === "provider_weekly_reset"
                    ? `按${payload.quotaName || "周配额"}重置`
                    : "7天滚动周期"}
                </Tag>
              </Flex>

              <div style={{ marginTop: 16 }}>
                <Flex justify="space-between" align="center">
                  <Text strong style={{ fontSize: 12 }}>
                    配额价值交互模拟器:
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: "#3b82f6" }}>
                    {simulatedPercent}% 额度 ≈{" "}
                    {simulatedUsd === null ? "n/a" : formatUsd(simulatedUsd)}
                  </Text>
                </Flex>
                <Slider
                  min={1}
                  max={100}
                  step={1}
                  value={simulatedPercent}
                  onChange={setSimulatedPercent}
                  disabled={payload.estimatedFullQuotaUsd === null}
                  style={{ margin: "8px 0 0" }}
                />
              </div>
            </Card>

            {/* Breakdown per API Key */}
            <div>
              <Text strong style={{ fontSize: 13, marginBottom: 8, display: "block" }}>
                各 API Key 消耗明细:
              </Text>
              {payload.rows.length === 0 ? (
                <Empty description="该周期内暂无 API Key 消耗明细记录" style={{ margin: "24px 0" }} />
              ) : (
                <Space direction="vertical" size={8} style={{ width: "100%" }}>
                  {payload.rows.map((row) => {
                    const barPercent = maxCost > 0 ? Math.max(4, (row.costUsd / maxCost) * 100) : 0;
                    return (
                      <Card
                        key={row.apiKeyKey}
                        size="small"
                        style={{ padding: "8px 12px", background: "rgba(128,128,128,0.03)" }}
                      >
                        <Flex justify="space-between" align="flex-start">
                          <div>
                            <Text strong style={{ fontSize: 13 }}>
                              {row.apiKeyName}
                            </Text>
                            <div style={{ marginTop: 2 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {row.requests.toLocaleString()} 次请求 ·{" "}
                                {row.totalTokens.toLocaleString()} Tokens
                              </Text>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <Text strong style={{ fontSize: 13, color: "#10B981" }}>
                              {formatUsd(row.costUsd)}
                            </Text>
                            {row.limitUsd ? (
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  已用 {row.limitUsedPercent?.toFixed(1)}% / 上限{" "}
                                  {formatUsd(row.limitUsd)}
                                </Text>
                              </div>
                            ) : (
                              <div>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  无 USD 预算限制
                                </Text>
                              </div>
                            )}
                          </div>
                        </Flex>
                        <Progress
                          percent={barPercent}
                          showInfo={false}
                          size="small"
                          strokeColor="#10B981"
                          style={{ margin: "6px 0 0" }}
                        />
                      </Card>
                    );
                  })}
                </Space>
              )}
            </div>
          </Space>
        ) : null}
      </div>
    </Modal>
  );
}

export default ProviderUsdCostModal;
