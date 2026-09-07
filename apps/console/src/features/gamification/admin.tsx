import { Alert, Card, Table, Tag } from "antd";
import { useQuery } from "@tanstack/react-query";
import { gamificationApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

export default function GamificationAdminPage() {
  const { tt } = useI18n();
  const query = useQuery({ queryKey: ["gamification", "anomalies"], queryFn: gamificationApi.getAnomalies, refetchInterval: 30000 });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <Alert type="error" message={tt("反作弊数据加载失败", "Failed to load anomaly data")} description={String(query.error)} />;
  const rows = query.data?.anomalies ?? [];
  return <Card title={tt("积分异常监控", "Gamification anomaly monitor")}>
    <Table rowKey="apiKeyId" dataSource={rows} pagination={false} locale={{ emptyText: tt("未发现异常", "No anomalies detected") }} columns={[
      { title: tt("API Key", "API key"), dataIndex: "apiKeyId", render: (value: string) => <code>{value}</code> },
      { title: tt("最近一小时 XP", "XP last hour"), dataIndex: "xpLastHour" },
      { title: "Z-score", dataIndex: "zScore", render: (value: number) => <Tag color={value >= 3 ? "error" : "warning"}>{Number(value).toFixed(2)}</Tag> },
    ]} />
  </Card>;
}
