import {
  Card,
  Flex,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
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
}));

export function SettingsFeatureFlagsPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const flags = [
    {
      key: "ENABLE_REASONING_CACHE",
      label: tt("DeepSeek-R1 推理思考链缓存 (Reasoning Cache)", "DeepSeek-R1 Reasoning Token Cache"),
      enabled: true,
      desc: tt("自动提取并缓存思考标记，节省巨额推理 Token", "Automatically caches reasoning tokens to save costs"),
    },
    {
      key: "ENABLE_OMNIGLYPH",
      label: tt("OmniGlyph 视觉点阵文本压缩 (Context-as-Image)", "OmniGlyph Context-as-Image Compression"),
      enabled: true,
      desc: tt("将百万 Token 代码转换为超密像素图像单图输入", "Renders large codebases into dense micro-pixel bitmaps"),
    },
    {
      key: "ENABLE_A2A_MESH",
      label: tt("A2A 跨智能体异步通信总线 (Agent Mesh)", "A2A Inter-Agent Communication Mesh"),
      enabled: true,
      desc: tt("支持智能体之间点对点任务流转与协同", "Peer-to-peer asynchronous event mesh between agents"),
    },
    {
      key: "ENABLE_AUTO_FAILOVER",
      label: tt("智能断路器自动故障转移 (Circuit Breaker Failover)", "Circuit Breaker Auto-Failover"),
      enabled: true,
      desc: tt("在上游提供者故障或 429 时无缝切换备用链路", "Seamless fallback when upstream returns 429 or outages"),
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="flag" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("前沿实验性特性开关", "Feature Flags & Labs")}
                </Title>
                <Tag color="blue">{tt("灰度特性动态开关", "Dynamic Feature Toggles")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "实时开启或关闭前沿实验性功能（思考链缓存、OmniGlyph 图像压缩、A2A 总线）。",
                  "Toggle experimental features in realtime (Reasoning Cache, OmniGlyph, Agent Mesh)."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Flags Table */}
      <Card title={tt("功能开关列表", "Feature Flags")} className={styles.sectionCard} size="small">
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={flags}
          columns={[
            {
              title: tt("特性标识与描述", "Feature & Description"),
              key: "label",
              render: (_, record) => (
                <div>
                  <Text strong>{record.label}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    <code>{record.key}</code> · {record.desc}
                  </div>
                </div>
              ),
            },
            {
              title: tt("当前状态", "Status"),
              dataIndex: "enabled",
              key: "enabled",
              width: 100,
              render: (en) => (
                <Switch
                  defaultChecked={en}
                  onChange={(checked) => messageApi.success(tt(`特性开关已切换为: ${checked ? "开启" : "关闭"}`, `Feature flag toggled to: ${checked ? "Enabled" : "Disabled"}`))}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default SettingsFeatureFlagsPage;
