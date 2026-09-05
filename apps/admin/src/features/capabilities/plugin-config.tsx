import { useEffect } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Space, Switch, Typography } from "antd";
import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { pluginsApi, type PluginConfigField } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

function fieldControl(field: PluginConfigField) {
  if (field.type === "boolean") return <Switch />;
  if (field.type === "number") return <InputNumber min={field.min} max={field.max} style={{ width: "100%" }} />;
  if (field.type === "select") return <Select options={(field.enum ?? []).map((value) => ({ value, label: value }))} />;
  return <Input />;
}

export default function PluginConfigPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const { tt } = useI18n();
  const [form] = Form.useForm<Record<string, unknown>>();
  const query = useQuery({
    queryKey: ["plugin-config", name],
    queryFn: () => pluginsApi.getConfig(name),
    enabled: Boolean(name),
  });
  const save = useMutation({ mutationFn: (config: Record<string, unknown>) => pluginsApi.updateConfig(name, config) });

  useEffect(() => {
    if (!query.data) return;
    const values = { ...Object.fromEntries(Object.entries(query.data.configSchema).map(([key, field]) => [key, field.default])), ...query.data.config };
    form.setFieldsValue(values);
  }, [form, query.data]);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <Alert type="error" message={tt("插件配置加载失败", "Failed to load plugin configuration")} description={String(query.error)} />;
  if (!name || !query.data) return <Alert type="warning" message={tt("未找到插件", "Plugin not found")} />;

  const fields = Object.entries(query.data.configSchema);
  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Space>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/dashboard/plugins")}>{tt("返回插件列表", "Back to plugins")}</Button>
        <Typography.Title level={3} style={{ margin: 0 }}>{tt(`配置插件：${name}`, `Configure plugin: ${name}`)}</Typography.Title>
      </Space>
      <Card>
        {fields.length === 0 ? (
          <Typography.Text type="secondary">{tt("此插件没有可配置项。", "This plugin has no configurable settings.")}</Typography.Text>
        ) : (
          <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
            {fields.map(([key, field]) => (
              <Form.Item
                key={key}
                name={key}
                label={key}
                valuePropName={field.type === "boolean" ? "checked" : "value"}
                extra={field.description}
                rules={[{ required: field.default === undefined && field.type !== "boolean", message: tt("请输入配置值", "Enter a configuration value") }]}
              >
                {fieldControl(field)}
              </Form.Item>
            ))}
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={save.isPending}>{tt("保存配置", "Save configuration")}</Button>
            {save.isError && <Alert style={{ marginTop: 12 }} type="error" message={tt("配置保存失败", "Failed to save configuration")} description={String(save.error)} />}
            {save.isSuccess && <Alert style={{ marginTop: 12 }} type="success" message={tt("配置已保存", "Configuration saved")} />}
          </Form>
        )}
      </Card>
    </Space>
  );
}
