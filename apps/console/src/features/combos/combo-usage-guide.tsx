import { useState } from "react";
import { Button, Card, Space, Steps, Typography, theme } from "antd";
import { MaterialIcon } from "@/app/nav";

const { Text, Title, Paragraph } = Typography;

export const COMBO_USAGE_GUIDE_STORAGE_KEY = "shiguangGateway:combos:hide-usage-guide";

const COMBO_WIZARD_STEPS = [
  {
    step: 1,
    icon: "badge",
    title: "命名您的组合",
    desc: "为您的组合指定唯一名称，以便在路由规则中识别",
  },
  {
    step: 2,
    icon: "hub",
    title: "添加模型",
    desc: "选择 AI 模型并排列其故障转移优先级顺序",
  },
  {
    step: 3,
    icon: "route",
    title: "选择策略",
    desc: "选择请求在模型之间的分发方式 — 提供 13 种策略",
  },
  {
    step: 4,
    icon: "check_circle",
    title: "审查并保存",
    desc: "审查您的配置并激活组合",
  },
];

interface ComboUsageGuideProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onCreateCombo?: () => void;
}

export function ComboUsageGuide({ forceOpen = false, onClose, onCreateCombo }: ComboUsageGuideProps) {
  const { token } = theme.useToken();
  const [hidden, setHidden] = useState(() => {
    return localStorage.getItem(COMBO_USAGE_GUIDE_STORAGE_KEY) === "1";
  });

  if (hidden && !forceOpen) return null;

  const handleHide = () => {
    setHidden(true);
    onClose?.();
  };

  const handleHideForever = () => {
    localStorage.setItem(COMBO_USAGE_GUIDE_STORAGE_KEY, "1");
    setHidden(true);
    onClose?.();
  };

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        borderColor: "rgba(139, 92, 246, 0.25)",
        background: "rgba(139, 92, 246, 0.02)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(139, 92, 246, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MaterialIcon name="tips_and_updates" size={18} style={{ color: "#8B5CF6" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <Title level={5} style={{ margin: 0, fontSize: 14 }}>
              组合入门指南
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              创建模型组合以智能路由 AI 流量
            </Text>
          </div>
        </div>

        <Space size={4}>
          <Button size="small" type="text" onClick={handleHide} style={{ fontSize: 12 }}>
            隐藏
          </Button>
          <Button size="small" type="text" onClick={handleHideForever} style={{ fontSize: 12 }}>
            不再显示
          </Button>
        </Space>
      </div>

      {/* 4 Steps Flow using Ant Design Steps component */}
      <div
        style={{
          borderRadius: 6,
          border: `1px solid ${token.colorBorderSecondary}`,
          background: token.colorFillAlter,
          padding: "12px 16px",
          marginBottom: 12,
        }}
      >
        <Steps
          size="small"
          current={-1}
          items={COMBO_WIZARD_STEPS.map((s) => ({
            title: (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  verticalAlign: "middle",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    background: "rgba(139, 92, 246, 0.12)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <MaterialIcon name={s.icon} size={13} style={{ color: "#8B5CF6" }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}>
                  {s.title}
                </span>
              </span>
            ),
            description: (
              <span style={{ fontSize: 11, color: token.colorTextSecondary, lineHeight: "16px", display: "block", marginTop: 2 }}>
                {s.desc}
              </span>
            ),
            icon: (
              <span
                style={{
                  display: "inline-flex",
                  width: 22,
                  height: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "rgba(139, 92, 246, 0.12)",
                  color: "#8B5CF6",
                  fontSize: 11,
                  fontWeight: 600,
                  lineHeight: 1,
                }}
              >
                {s.step}
              </span>
            ),
          }))}
        />
      </div>

      {/* How to call this combo info callout */}
      <div
        style={{
          marginTop: 12,
          borderRadius: 6,
          border: "1px solid rgba(139, 92, 246, 0.2)",
          background: "rgba(139, 92, 246, 0.04)",
          padding: "10px 14px",
        }}
      >
        <Text strong style={{ fontSize: 12, color: "#8B5CF6", display: "block", marginBottom: 4 }}>
          如何调用此组合
        </Text>
        <Paragraph type="secondary" style={{ fontSize: 11, lineHeight: "18px", margin: 0 }}>
          将组合的精确名称作为 <code>model</code> 传入发起调用，例如 <code>model: "my-combo"</code>（或 <code>combo/my-combo</code>）。
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 11, lineHeight: "18px", margin: "3px 0 0" }}>
          <code>auto</code> 和 <code>auto/*</code> 是独立的零配置路由器，不会使用您自定义的组合（除非组合名称本身就叫 auto）。
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 11, lineHeight: "18px", margin: "3px 0 0" }}>
          <code>openrouter/auto</code> 是真实的 OpenRouter 付费产品（Auto Best Available），并非智枢别名 — 如需排除可在 设置 → 路由 → 隐藏付费模型 中配置。
        </Paragraph>

      </div>

      {/* Bottom Action */}
      {onCreateCombo && (
        <Space align="center" size={12} style={{ marginTop: 14 }}>
          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            onClick={onCreateCombo}
            style={{
              background: "#8B5CF6",
              borderColor: "#8B5CF6",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            创建您的第一个组合
          </Button>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            或点击上方「+ 新建组合」
          </Text>
        </Space>
      )}
    </Card>
  );
}
