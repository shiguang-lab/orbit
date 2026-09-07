import { useEffect } from "react";
import { Alert, Button, Card, Form, InputNumber, Typography, message } from "antd";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cacheConfigApi, type CacheConfig } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  card: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  formRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  input: { width: 128 },
}));

const MIN_TTL_MS = 100;
const MAX_TTL_MS = 60000;

export function SettingsCachePage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<CacheConfig>();

  const configQuery = useQuery({
    queryKey: ["settings-cache-config"],
    queryFn: cacheConfigApi.get,
  });

  useEffect(() => {
    if (configQuery.data) form.setFieldsValue(configQuery.data);
  }, [configQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (values: CacheConfig) => cacheConfigApi.update(values),
    onSuccess: (saved) => {
      form.setFieldsValue(saved);
      void queryClient.invalidateQueries({ queryKey: ["settings-cache-config"] });
      messageApi.success(tt("缓存设置已保存", "Cache settings saved"));
    },
    onError: () => messageApi.error(tt("保存缓存设置失败", "Failed to save cache settings")),
  });

  if (configQuery.isLoading) return <PageSkeleton />;
  if (configQuery.isError || !configQuery.data) {
    return (
      <div className={styles.page}>
        {contextHolder}
        <Alert
          type="error"
          showIcon
          message={tt("加载缓存设置失败", "Failed to load cache settings")}
          action={
            <Button size="small" onClick={() => void configQuery.refetch()}>
              {tt("重试", "Retry")}
            </Button>
          }
        />
      </div>
    );
  }

  const config = configQuery.data;

  return (
    <div className={styles.page}>
      {contextHolder}
      <Card
        className={styles.card}
        title={tt("缓存设置", "Cache Settings")}
        styles={{ body: { padding: 24 } }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={config}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Text strong>{tt("模型目录缓存 TTL", "Model Catalog Cache TTL")}</Text>
          <div style={{ marginTop: 4, marginBottom: 16 }}>
            <Text type="secondary">
              {tt(
                "模型目录响应在刷新前缓存的时间。",
                "How long model catalog responses are cached before refreshing.",
              )}
            </Text>
          </div>
          <div className={styles.formRow}>
            <Form.Item
              name="modelCatalogCacheTtlMs"
              label={tt("模型目录缓存 TTL（毫秒）", "Model catalog cache TTL in milliseconds")}
              rules={[
                { required: true, message: tt("请输入 TTL", "Enter a TTL") },
                {
                  type: "number",
                  min: MIN_TTL_MS,
                  max: MAX_TTL_MS,
                  message: tt(
                    `请输入 ${MIN_TTL_MS} 到 ${MAX_TTL_MS} 之间的整数`,
                    `Enter an integer between ${MIN_TTL_MS} and ${MAX_TTL_MS}`,
                  ),
                },
              ]}
            >
              <InputNumber
                className={styles.input}
                min={MIN_TTL_MS}
                max={MAX_TTL_MS}
                step={100}
                addonAfter="ms"
              />
            </Form.Item>
            <Form.Item label=" ">
              <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                {saveMutation.isPending
                  ? tt("正在保存...", "Saving...")
                  : tt("保存", "Save")}
              </Button>
            </Form.Item>
          </div>
        </Form>
      </Card>
    </div>
  );
}

export default SettingsCachePage;
