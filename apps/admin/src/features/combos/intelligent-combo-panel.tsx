import { useState } from "react";
import { Card, Col, Progress, Row, Segmented, Space, Tag, Typography, message } from "antd";
import { MaterialIcon } from "@/app/nav";
import { combosApi, type ComboItem } from "@/entities/api";
import { getStepDisplayName, getStepProvider, getStrategyDef } from "./constants";

const { Text, Title } = Typography;

const MODE_PACKS = [
  { value: "balanced", label: "平衡模式", icon: "balance", desc: "综合考量延迟、成功率与输出质量" },
  { value: "quality", label: "质量优先", icon: "verified", desc: "优先分发给评分最高的高质量模型" },
  { value: "speed", label: "极速优先", icon: "speed", desc: "优先分发给 P50/P95 延迟最低的节点" },
  { value: "cost", label: "成本优先", icon: "savings", desc: "优先选择定价最低廉的候选提供者" },
];

interface IntelligentComboPanelProps {
  combo: ComboItem;
  onComboUpdated?: (combo: ComboItem) => void;
}

export function IntelligentComboPanel({ combo, onComboUpdated }: IntelligentComboPanelProps) {
  const config = combo.config || {};
  const currentModePack = typeof config.modePack === "string" ? config.modePack : "balanced";
  const [saving, setSaving] = useState(false);

  const handleModePackChange = async (value: string) => {
    if (value === currentModePack) return;
    setSaving(true);
    try {
      const updated = await combosApi.patch(combo.id, {
        config: {
          ...config,
          modePack: value,
        },
      });
      message.success(`已切换为${MODE_PACKS.find((m) => m.value === value)?.label || value}`);
      onComboUpdated?.(updated);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "切换模式失败");
    } finally {
      setSaving(false);
    }
  };

  const models = combo.models || [];

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        borderColor: "rgba(139, 92, 246, 0.3)",
        background: "rgba(139, 92, 246, 0.02)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <Space align="center" size={8}>
            <MaterialIcon name="auto_awesome" size={20} style={{ color: "#8B5CF6" }} />
            <Title level={5} style={{ margin: 0 }}>
              智能路由控制台 · <code>{combo.name}</code>
            </Title>
            <Tag color="purple">{getStrategyDef(combo.strategy).label}</Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
            系统基于实时健康度探测、自愈评分与任务画像自主决策候选目标
          </Text>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 11, marginRight: 8 }}>
            决策模式包:
          </Text>
          <Segmented
            size="small"
            disabled={saving}
            value={currentModePack}
            options={MODE_PACKS.map((m) => ({
              value: m.value,
              label: (
                <Space size={4}>
                  <MaterialIcon name={m.icon} size={14} />
                  <span>{m.label}</span>
                </Space>
              ),
            }))}
            onChange={(val) => handleModePackChange(String(val))}
          />
        </div>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card size="small" title="候选模型池与权重分配" style={{ height: "100%", borderRadius: 6 }}>
            {models.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                当前池中尚未配置具体候选模型，系统将使用自动模型目录。
              </Text>
            ) : (
              <Space direction="vertical" style={{ width: "100%" }} size={8}>
                {models.map((m, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space size={6}>
                      <Tag style={{ margin: 0 }}>{getStepProvider(m) || "默认"}</Tag>
                      <Text code style={{ fontSize: 12 }}>
                        {getStepDisplayName(m)}
                      </Text>
                    </Space>
                    <div style={{ width: 120 }}>
                      <Progress
                        percent={m.weight || 100}
                        size="small"
                        format={(p) => `${p}%`}
                        strokeColor="#8B5CF6"
                      />
                    </div>
                  </div>
                ))}
              </Space>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card size="small" title="自愈与健康指标" style={{ height: "100%", borderRadius: 6 }}>
            <Space direction="vertical" style={{ width: "100%" }} size={10}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  自愈状态
                </Text>
                <Tag color="success">健康 (自愈活跃)</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  故障转移宽限窗口
                </Text>
                <Text strong style={{ fontSize: 12 }}>
                  {typeof config.fallbackDelayMs === "number" ? `${config.fallbackDelayMs}ms` : "0ms (即时)"}
                </Text>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  最大单请求重试
                </Text>
                <Text strong style={{ fontSize: 12 }}>
                  {typeof config.maxRetries === "number" ? config.maxRetries : 1} 次
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
