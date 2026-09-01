import { Button, Card, Space, Typography, message } from "antd";
import { MaterialIcon } from "@/app/nav";
import { KIMI_CODING_PRESET } from "./constants";
import { combosApi } from "@/entities/api";
import { useState } from "react";

const { Text, Title } = Typography;

interface KimiComboPresetCardProps {
  alreadyCreated: boolean;
  onCreated?: () => void;
}

export function KimiComboPresetCard({ alreadyCreated, onCreated }: KimiComboPresetCardProps) {
  const [loading, setLoading] = useState(false);

  if (alreadyCreated) return null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      await combosApi.create(KIMI_CODING_PRESET);
      message.success("已成功添加 Kimi Coding 组合预设");
      onCreated?.();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "添加预设失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      size="small"
      style={{
        borderRadius: 8,
        borderColor: "#1783FF",
        background: "rgba(23, 131, 255, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space align="center" size={12}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(23, 131, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcon name="bolt" size={22} style={{ color: "#1783FF" }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, color: "#1783FF" }}>
              Kimi Coding 专属组合预设
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              一键添加官方优化的 Kimi 编程回退链条（Moonshot API → Kimi Coding → Kimi Web）
            </Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<MaterialIcon name="add" size={16} />}
          loading={loading}
          onClick={handleCreate}
          style={{ background: "#1783FF", borderColor: "#1783FF" }}
        >
          添加预设组合
        </Button>
      </div>
    </Card>
  );
}
