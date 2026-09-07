import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { compressionExclusionsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text, Paragraph } = Typography;

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

export function CompressionExclusionsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const exclusionsQuery = useQuery({
    queryKey: ["compression-exclusions"],
    queryFn: () => compressionExclusionsApi.getExclusions(),
  });

  const [rawText, setRawText] = useState("");

  useEffect(() => {
    if (exclusionsQuery.data) {
      setRawText(exclusionsQuery.data.join("\n"));
    }
  }, [exclusionsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (patterns: string[]) => compressionExclusionsApi.saveExclusions(patterns),
    onSuccess: () => {
      messageApi.success(tt("压缩排除规则已保存并热重载", "Exclusion rules saved and hot-reloaded"));
      void queryClient.invalidateQueries({ queryKey: ["compression-exclusions"] });
    },
    onError: () => messageApi.error(tt("保存排除项失败", "Failed to save exclusion rules")),
  });

  if (exclusionsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const handleSave = () => {
    const list = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    saveMutation.mutate(list);
  };

  const parsedList = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

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
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="block" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("压缩排除规则与白名单", "Compression Exclusion Rules")}
                </Title>
                <Tag color="error">{tt("黑白名单机制", "Blocklist & Whitelist")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置必须跳过任何压缩算子、严格原样透传的模型 ID、Provider 前缀或通配符规则（支持 * 通配）。",
                  "Configure model IDs, provider prefixes, or wildcard patterns that must bypass compression and be forwarded intact."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveMutation.isPending}
            onClick={handleSave}
          >
            {tt("保存排除规则", "Save Rules")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Editor Card */}
      <Card title={tt("排除项匹配规则列表", "Exclusion Match Rules")} className={styles.sectionCard} size="small">
        <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 10 }}>
          {tt(
            "当客户端请求的模型名称与以下任一模式匹配时，网关将自动旁路所有压缩引擎。例如：openai/o1-preview 或 */*-embed*（每行一条规则）。",
            "When the model name requested matches any of the patterns below, all compression engines will be bypassed. E.g.: openai/o1-preview or */*-embed* (one rule per line)."
          )}
        </Paragraph>

        <Input.TextArea
          rows={8}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`openai/o1-preview\nanthropic/claude-3-opus\n*/*-embed*`}
          style={{ fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}
        />

        <div>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
            {tt("已解析生效规则", "Active Rules")} ({parsedList.length} {tt("条", "rules")})：
          </Text>
          <Space wrap size={6}>
            {parsedList.map((p, idx) => (
              <Tag key={idx} color="red" style={{ padding: "3px 8px", fontSize: 12 }}>
                {p}
              </Tag>
            ))}
          </Space>
        </div>
      </Card>
    </div>
  );
}

export default CompressionExclusionsPage;
