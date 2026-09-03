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
import { agentSkillsApi, type AgentSkillItem } from "@/entities/api";
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

export function AgentSkillsPage() {
  const { styles } = useStyles();

  const skillsQuery = useQuery({
    queryKey: ["agent-skills-list"],
    queryFn: () => agentSkillsApi.list(),
  });

  if (skillsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const skills = skillsQuery.data ?? [];

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
                background: "rgba(20, 184, 166, 0.12)",
                color: "#14b8a6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="share" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  智能体专业技能库
                </Title>
                <Tag color="teal">可插拔专业技能</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                管理面向特定领域（代码重构、SQL 查询分析、API 文档提取）的智能体预置指令与工具规则包。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Skills Table */}
      <Card title="已注册智能体技能清单" className={styles.sectionCard} size="small">
        <Table<AgentSkillItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={skills}
          columns={[
            {
              title: "技能名称与版本",
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">v{record.version}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {record.description}
                  </div>
                </div>
              ),
            },
            {
              title: "领域标签",
              dataIndex: "tags",
              key: "tags",
              render: (tags: string[]) => (
                <Flex gap={4} wrap>
                  {(tags || []).map((t) => (
                    <Tag key={t} color="cyan" style={{ margin: 0, fontSize: 10 }}>
                      {t}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: "作者",
              dataIndex: "author",
              key: "author",
              render: (author) => <Text style={{ fontSize: 12 }}>{author}</Text>,
            },
            {
              title: "启用状态",
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

export default AgentSkillsPage;
