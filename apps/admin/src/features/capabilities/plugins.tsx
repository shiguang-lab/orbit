import {
  Card,
  Button,
  Flex,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { pluginsApi, type PluginItem } from "@/entities/api";
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
}));

export function PluginsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const client = useQueryClient();

  const pluginsQuery = useQuery({
    queryKey: ["plugins-list"],
    queryFn: () => pluginsApi.list(),
  });

  if (pluginsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const plugins = pluginsQuery.data ?? [];
  const toggle = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => enabled ? pluginsApi.activate(name) : pluginsApi.deactivate(name),
    onSuccess: () => void client.invalidateQueries({ queryKey: ["plugins-list"] }),
  });

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
                background: "rgba(139, 92, 246, 0.12)",
                color: "#8b5cf6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="extension" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("扩展插件生态中心", "Extension Plugin Ecosystem")}
                </Title>
                <Tag color="purple">{tt("生命周期拦截器", "Lifecycle Interceptors")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理请求前置注入防护、敏感数据 (PII) 脱敏、语义动态路由与响应后置转换插件。",
                  "Manage pre-request guardrails, PII masking, semantic routing, and post-response transformation plugins."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Plugins Table */}
      <Card title={tt("已安装网关插件列表", "Installed Gateway Plugins")} className={styles.sectionCard}>
        <Table<PluginItem>
          rowKey="id"
          pagination={false}
          dataSource={plugins}
          columns={[
            {
              title: tt("插件名称与分类", "Plugin Name & Category"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">v{record.version}</Tag>
                    <Tag color="purple">{record.category.toUpperCase()}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {record.description}
                  </div>
                </div>
              ),
            },
            {
              title: tt("挂载 Hook 钩子点", "Mounted Hook Points"),
              dataIndex: "hooks",
              key: "hooks",
              render: (hooks: string[]) => (
                <Flex gap={4} wrap>
                  {(hooks || []).map((h) => (
                    <Tag key={h} color="cyan" style={{ margin: 0, fontSize: 10 }}>
                      {h}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: tt("开发者", "Author"),
              dataIndex: "author",
              key: "author",
              render: (author) => <Text style={{ fontSize: 12 }}>{author}</Text>,
            },
            {
              title: tt("启用开关", "Enabled"),
              dataIndex: "enabled",
              key: "enabled",
              render: (enabled, record) => <Switch checked={Boolean(enabled)} loading={toggle.isPending && toggle.variables?.name === record.name} onChange={(value) => toggle.mutate({ name: record.name, enabled: value })} />,
            },
            {
              title: tt("配置", "Configure"),
              key: "config",
              render: (_, record) => <Button type="link"><Link to={`/dashboard/plugins/${encodeURIComponent(record.name)}/config`}>{tt("配置", "Configure")}</Link></Button>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default PluginsPage;
