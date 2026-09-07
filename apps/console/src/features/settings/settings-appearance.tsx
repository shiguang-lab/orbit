import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Radio,
  Row,
  Select,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { settingsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
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
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  colorOption: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    display: "inline-block",
    marginRight: 8,
    verticalAlign: "middle",
  },
}));

export function SettingsAppearancePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-appearance-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("界面与外观偏好设置已更新", "Appearance preferences updated"));
      void queryClient.invalidateQueries({ queryKey: ["settings-appearance-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存外观设置失败", "Failed to save appearance settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="palette" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("外观与主题定制", "Appearance & Theme")}
                </Title>
                <Tag color="purple">{tt("极客深色与卡片排版", "Dark Mode & Cards")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "自定义管理控制台深浅色模式、品牌主色调、首页拓扑与快速入门卡片显隐控制。",
                  "Customize theme mode, accent color, home dashboard modules, and code syntax highlighting."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveMutation.isPending}
            onClick={() => form.submit()}
          >
            {tt("保存外观设置", "Save Appearance")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          themeMode: s.themeMode || "dark",
          primaryColor: s.primaryColor || "#3B82F6",
          showQuickStartOnHome: s.showQuickStartOnHome ?? true,
          showProviderTopologyOnHome: s.showProviderTopologyOnHome ?? true,
          homeRecentRequestsLimit: s.homeRecentRequestsLimit || 20,
          compactLayout: s.compactLayout ?? false,
          enableAnimations: s.enableAnimations ?? true,
          codeBlockTheme: s.codeBlockTheme || "vscDarkPlus",
        }}
        onFinish={handleSave}
      >
        <Flex vertical gap={12}>
          {/* 2. Theme Options */}
          <Card title={tt("全局配色与主题风格", "Theme & Palette")} className={styles.sectionCard} size="small">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label={tt("主题明暗模式", "Theme Mode")} name="themeMode">
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="dark">
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="dark_mode" size={14} /> {tt("深色模式 (Dark)", "Dark Mode")}
                      </Flex>
                    </Radio.Button>
                    <Radio.Button value="light">
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="light_mode" size={14} /> {tt("浅色模式 (Light)", "Light Mode")}
                      </Flex>
                    </Radio.Button>
                    <Radio.Button value="system">
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="settings_brightness" size={14} /> {tt("跟随系统", "Follow System")}
                      </Flex>
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={tt("系统主品牌强调色", "Primary Accent Color")} name="primaryColor">
                  <Select
                    options={[
                      { label: tt("智枢科技蓝 (#3B82F6)", "Orbit Blue (#3B82F6)"), value: "#3B82F6" },
                      { label: tt("极客深靛青 (#6366F1)", "Indigo (#6366F1)"), value: "#6366F1" },
                      { label: tt("灵动赛博紫 (#A855F7)", "Cyber Purple (#A855F7)"), value: "#A855F7" },
                      { label: tt("极光森林绿 (#10B981)", "Forest Green (#10B981)"), value: "#10B981" },
                      { label: tt("琥珀活力橙 (#F59E0B)", "Amber Orange (#F59E0B)"), value: "#F59E0B" },
                      { label: tt("赤红火焰色 (#EF4444)", "Flame Red (#EF4444)"), value: "#EF4444" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item label={tt("表格紧凑模式 (Compact Mode)", "Table Compact Mode")} name="compactLayout" valuePropName="checked">
                  <Switch checkedChildren={tt("已开启紧凑", "Compact")} unCheckedChildren={tt("标准行距", "Standard")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={tt("启用平滑渐变过渡动画", "Smooth Transition Animations")} name="enableAnimations" valuePropName="checked">
                  <Switch checkedChildren={tt("开启平滑动画", "Enabled")} unCheckedChildren={tt("关闭降低开销", "Disabled")} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* 3. Home Dashboard Customization */}
          <Card title={tt("首页仪表盘模块展示控制", "Home Dashboard Modules")} className={styles.sectionCard} size="small">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={tt("在首页展示「快速入门」向导卡片", "Show Quick Start Card on Home")}
                  name="showQuickStartOnHome"
                  valuePropName="checked"
                  tooltip={tt("包含 API 密钥创建、提供商添加与客户端配置 4 步指引", "Guide with API key creation, provider setup, and client configs")}
                >
                  <Switch checkedChildren={tt("显示快速入门", "Show")} unCheckedChildren={tt("隐藏", "Hide")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={tt("在首页展示「模型提供商交互式拓扑大图」", "Show Interactive Provider Topology on Home")}
                  name="showProviderTopologyOnHome"
                  valuePropName="checked"
                  tooltip={tt("基于 ReactFlow 渲染的环形动态连通性与健康状态拓扑图", "Render dynamic connectivity and health topology graph")}
                >
                  <Switch checkedChildren={tt("显示拓扑图", "Show")} unCheckedChildren={tt("隐藏", "Hide")} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={tt("首页「最近请求」展示数量上限", "Recent Requests Display Limit on Home")}
                  name="homeRecentRequestsLimit"
                  tooltip={tt("控制首页右侧或底部最近实时请求流日志条数", "Max number of live request entries shown on home")}
                >
                  <Select
                    options={[
                      { label: tt("显示最近 10 条", "Show 10 entries"), value: 10 },
                      { label: tt("显示最近 20 条 (推荐)", "Show 20 entries (Recommended)"), value: 20 },
                      { label: tt("显示最近 50 条", "Show 50 entries"), value: 50 },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={tt("代码片段高亮语法配色", "Code Block Syntax Highlight Theme")} name="codeBlockTheme">
                  <Select
                    options={[
                      { label: "VSCode Dark Plus", value: "vscDarkPlus" },
                      { label: "One Dark Pro", value: "oneDark" },
                      { label: "Dracula", value: "dracula" },
                      { label: "GitHub Dark", value: "githubDark" },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Flex>
      </Form>
    </div>
  );
}

export default SettingsAppearancePage;
