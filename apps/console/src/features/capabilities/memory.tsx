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
import { memoryApi, type MemoryBankItem } from "@/entities/api";
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

export function MemoryPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const memoryQuery = useQuery({
    queryKey: ["memory-banks-list"],
    queryFn: () => memoryApi.list(),
  });

  if (memoryQuery.isLoading) {
    return <PageSkeleton />;
  }

  const banks = memoryQuery.data ?? [];

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
                background: "rgba(236, 72, 153, 0.12)",
                color: "#ec4899",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="psychology" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("智能体持久记忆中心", "Agent Persistent Memory Hub")}
                </Title>
                <Tag color="pink">{tt("分层命名空间记忆", "Layered Namespace Memory")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理跨会话持久记忆库（用户偏好、项目上下文、架构决议），基于向量召回自动注入上下文。",
                  "Manage cross-session persistent memory stores (user preferences, project context, architectural decisions) with vector recall context injection."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Memory Banks Table */}
      <Card title={tt("已挂载长期记忆命名空间", "Mounted Memory Banks")} className={styles.sectionCard} size="small">
        <Table<MemoryBankItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={banks}
          columns={[
            {
              title: tt("记忆空间与命名空间", "Namespace & Bank"),
              key: "namespace",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.namespace}</Text>
                    <Tag color="blue">{record.id}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {record.description}
                  </div>
                </div>
              ),
            },
            {
              title: tt("已持久化条目", "Persisted Entries"),
              dataIndex: "totalEntries",
              key: "entries",
              render: (count) => <Tag color="purple">{count} {tt("条记录", "records")}</Tag>,
            },
            {
              title: tt("向量索引空间", "Vector Index Size"),
              dataIndex: "vectorIndexSizeKb",
              key: "size",
              render: (kb) => <Text style={{ fontSize: 12 }}>{(kb / 1024).toFixed(2)} MB</Text>,
            },
            {
              title: tt("最近召回命中", "Last Recalled"),
              dataIndex: "lastRecalledAt",
              key: "recalled",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default MemoryPage;
