import { Alert, Card, Descriptions, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

type VersionInfo = { version?: string; build?: string; commit?: string; runtime?: string; [key: string]: unknown };

export default function ChangelogPage() {
  const { tt } = useI18n();
  const query = useQuery({ queryKey: ["system", "version"], queryFn: () => api<VersionInfo>("/system/version") });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <Alert type="error" message={tt("版本信息加载失败", "Failed to load release information")} description={String(query.error)} />;
  const value = query.data ?? {};
  return <Card title={tt("版本与变更", "Version and changes")}>
    <Descriptions bordered column={1}>
      <Descriptions.Item label={tt("版本", "Version")}>{String(value.version ?? "—")}</Descriptions.Item>
      <Descriptions.Item label={tt("构建", "Build")}>{String(value.build ?? "—")}</Descriptions.Item>
      <Descriptions.Item label={tt("提交", "Commit")}>{String(value.commit ?? "—")}</Descriptions.Item>
      <Descriptions.Item label={tt("Runtime", "Runtime")}>{String(value.runtime ?? "独立 ShiguangGateway runtime")}</Descriptions.Item>
    </Descriptions>
    <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
      {tt("发布说明由本地 control-api 提供；部署时不依赖官方 Shiguang Gateway 网络。", "Release metadata is served by the local control-api; deployment does not depend on the official Shiguang Gateway network.")}
    </Typography.Paragraph>
  </Card>;
}
