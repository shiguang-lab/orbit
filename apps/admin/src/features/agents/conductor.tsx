import {
  Card,
  Flex,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { conductorApi, type ConductorWorkflow } from "@/entities/api";
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

export function ConductorPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const conductorQuery = useQuery({
    queryKey: ["conductor-workflows"],
    queryFn: () => conductorApi.list(),
  });

  if (conductorQuery.isLoading) {
    return <PageSkeleton />;
  }

  const workflows = conductorQuery.data ?? [];

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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="account_tree" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("智能体任务编排器", "Agent Conductor & Workflows")}
                </Title>
                <Tag color="purple">{tt("DAG 拓扑编排", "DAG Orchestration")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "编排多智能体流水线任务（Planner → Coder → Reviewer → Tester），跨模型分工协同与流水线状态追溯。",
                  "Orchestrate multi-agent task pipelines (Planner → Coder → Reviewer → Tester) with cross-model collaboration and lifecycle tracking."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Workflows Table */}
      <Card title={tt("已编排任务流水线", "Orchestrated Workflows")} className={styles.sectionCard} size="small">
        <Table<ConductorWorkflow>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={workflows}
          columns={[
            {
              title: tt("流水线名称与描述", "Workflow Name & Description"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                    {record.description}
                  </div>
                </div>
              ),
            },
            {
              title: tt("拓扑阶段", "Topology Stages"),
              key: "steps",
              render: (_, record) => (
                <Flex align="center" gap={6} wrap>
                  {(record.steps || []).map((step, idx) => (
                    <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Tag color="blue" style={{ margin: 0 }}>
                        {step.role} ({step.agentId})
                      </Tag>
                      {idx < (record.steps?.length ?? 0) - 1 && <span style={{ color: "rgba(255,255,255,0.3)" }}>→</span>}
                    </span>
                  ))}
                </Flex>
              ),
            },
            {
              title: tt("状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "running" ? "processing" : "default"}>
                  {String(status || "idle").toUpperCase()}
                </Tag>
              ),
            },
            {
              title: tt("最近执行", "Last Run"),
              dataIndex: "lastRunAt",
              key: "lastRunAt",
              render: (time) => <Text type="secondary" style={{ fontSize: 12 }}>{time || tt("从未执行", "Never")}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default ConductorPage;
