import {
  Card,
  Flex,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { pluginsApi, type PluginItem } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

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

  const pluginsQuery = useQuery({
    queryKey: ["plugins-list"],
    queryFn: () => pluginsApi.list(),
  });

  if (pluginsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const plugins = pluginsQuery.data ?? [];

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
                  扩展插件生态中心
                </Title>
                <Tag color="purple">生命周期拦截器</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                管理请求前置注入防护、敏感数据 (PII) 脱敏、语义动态路由与响应后置转换插件。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Plugins Table */}
      <Card title="已安装网关插件列表" className={styles.sectionCard} size="small">
        <Table<PluginItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={plugins}
          columns={[
            {
              title: "插件名称与分类",
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
              title: "挂载 Hook 钩子点",
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
              title: "开发者",
              dataIndex: "author",
              key: "author",
              render: (author) => <Text style={{ fontSize: 12 }}>{author}</Text>,
            },
            {
              title: "启用开关",
              dataIndex: "enabled",
              key: "enabled",
              render: (enabled) => <Switch defaultChecked={enabled} />,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default PluginsPage;
