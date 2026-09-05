import { useState } from "react";
import { Alert, Button, Card, Flex, Form, Input, InputNumber, Switch, Table, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { relayApi, type RelayTokenItem } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

export default function RelayPage() {
  const { tt } = useI18n();
  const [form] = Form.useForm();
  const [rawToken, setRawToken] = useState<string | null>(null);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["relay", "tokens"], queryFn: relayApi.list });
  const create = useMutation({ mutationFn: relayApi.create, onSuccess: (value) => { setRawToken(value.rawToken); form.resetFields(); void client.invalidateQueries({ queryKey: ["relay", "tokens"] }); } });
  const update = useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => relayApi.update(id, { enabled }), onSuccess: () => void client.invalidateQueries({ queryKey: ["relay", "tokens"] }) });
  const remove = useMutation({ mutationFn: relayApi.remove, onSuccess: () => void client.invalidateQueries({ queryKey: ["relay", "tokens"] }) });
  if (query.isLoading) return <PageSkeleton />;
  if (query.isError) return <Alert type="error" message={tt("Relay token 加载失败", "Failed to load relay tokens")} description={String(query.error)} />;
  return <Flex vertical gap={16}>
    <div><Typography.Title level={3} style={{ margin: 0 }}>{tt("Relay 代理", "Relay proxy")}</Typography.Title><Typography.Text type="secondary">{tt("为外部客户端创建受限的本地转发令牌。", "Create scoped relay tokens for external clients.")}</Typography.Text></div>
    <Card title={tt("创建令牌", "Create token")}>
      <Form form={form} layout="inline" onFinish={(values) => create.mutate({ name: values.name, description: values.description, maxRequestsPerMinute: values.maxRpm, maxRequestsPerDay: values.maxRpd })}>
        <Form.Item name="name" rules={[{ required: true }]}><Input placeholder={tt("名称", "Name")} /></Form.Item>
        <Form.Item name="description"><Input placeholder={tt("描述", "Description")} /></Form.Item>
        <Form.Item name="maxRpm" initialValue={60}><InputNumber min={1} placeholder="RPM" /></Form.Item>
        <Form.Item name="maxRpd" initialValue={10000}><InputNumber min={1} placeholder="RPD" /></Form.Item>
        <Button type="primary" htmlType="submit" loading={create.isPending}>{tt("创建", "Create")}</Button>
      </Form>
      {rawToken && <Alert style={{ marginTop: 12 }} type="success" message={tt("令牌仅显示一次，请立即保存", "Token shown once; save it now")} description={<code>{rawToken}</code>} closable onClose={() => setRawToken(null)} />}
      {create.isError && <Alert style={{ marginTop: 12 }} type="error" message={String(create.error)} />}
    </Card>
    <Card title={tt("令牌列表", "Tokens")}>
      <Table<RelayTokenItem> rowKey="id" dataSource={query.data ?? []} pagination={false} columns={[
        { title: tt("名称", "Name"), dataIndex: "name" },
        { title: tt("前缀", "Prefix"), dataIndex: "tokenPrefix", render: (v: string) => <code>{v}…</code> },
        { title: "RPM / RPD", render: (_, row) => `${row.maxRequestsPerMinute} / ${row.maxRequestsPerDay}` },
        { title: tt("启用", "Enabled"), dataIndex: "enabled", render: (enabled: boolean, row) => <Switch checked={enabled} onChange={(value) => update.mutate({ id: row.id, enabled: value })} /> },
        { title: tt("操作", "Actions"), render: (_, row) => <Button danger onClick={() => remove.mutate(row.id)} loading={remove.isPending}>{tt("删除", "Delete")}</Button> },
      ]} />
    </Card>
  </Flex>;
}
