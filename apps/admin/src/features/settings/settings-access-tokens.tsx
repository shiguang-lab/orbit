import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Flex, Form, Input, Popconfirm, Select, Spin, Table, Tag, Typography, message } from "antd";
import { createStyles } from "antd-style";
import { Link } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { api } from "@/entities/api";
import { useI18n } from "@/i18n";

const { Title, Text, Paragraph } = Typography;

interface AccessTokenItem {
  id: string;
  name: string;
  scope: "read" | "write" | "admin";
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

const useStyles = createStyles(({ token }) => ({
  page: { width: "100%", display: "flex", flexDirection: "column", gap: 12 },
  headerCard: { borderRadius: 8, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
  sectionCard: { borderRadius: 8, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
  secretBox: {
    borderRadius: 8,
    border: `1px solid ${token.colorSuccessBorder}`,
    background: token.colorSuccessBg,
    padding: "12px 16px",
    marginTop: 12,
  },
}));

const SCOPE_TAG_COLORS: Record<string, string> = {
  read: "blue",
  write: "orange",
  admin: "red",
};

export function SettingsAccessTokensPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const [tokens, setTokens] = useState<AccessTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<{ tokens?: AccessTokenItem[] }>("/cli/tokens");
      setTokens(data?.tokens ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tt("获取访问令牌列表失败", "Failed to load access tokens"));
    } finally {
      setLoading(false);
    }
  }, [tt]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  const handleCreateToken = async (values: { name: string; scope: "read" | "write" | "admin"; expiresInDays?: string | number }) => {
    if (!values.name?.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: values.name.trim(),
        scope: values.scope || "read",
      };
      if (values.expiresInDays && Number(values.expiresInDays) > 0) {
        body.expiresInDays = Number(values.expiresInDays);
      }
      const data = await api<{ token?: string; error?: string }>("/cli/tokens", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (data?.token) {
        setNewSecret(data.token);
        form.resetFields();
        messageApi.success(tt("访问令牌创建成功", "Access token created"));
        await loadTokens();
      }
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : tt("创建访问令牌失败", "Failed to create access token"));
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    try {
      await api(`/cli/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
      messageApi.success(tt("访问令牌已撤销", "Access token revoked"));
      await loadTokens();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : tt("撤销访问令牌失败", "Failed to revoke token"));
    }
  };

  const handleCopySecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret);
      messageApi.success(tt("令牌已复制到剪贴板", "Token copied to clipboard"));
    } catch {
      messageApi.warning(tt("复制失败，请手动选取复制", "Failed to copy, please copy manually"));
    }
  };

  const columns = [
    {
      title: tt("名称", "Name"),
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: tt("权限范围", "Scope"),
      dataIndex: "scope",
      key: "scope",
      width: 120,
      render: (scope: string) => (
        <Tag color={SCOPE_TAG_COLORS[scope] || "default"}>
          {scope}
        </Tag>
      ),
    },
    {
      title: tt("前缀", "Prefix"),
      dataIndex: "tokenPrefix",
      key: "tokenPrefix",
      width: 130,
      render: (prefix: string) => <code style={{ fontSize: 12 }}>{prefix}</code>,
    },
    {
      title: tt("状态", "Status"),
      key: "status",
      width: 110,
      render: (_: unknown, record: AccessTokenItem) => {
        const revoked = Boolean(record.revokedAt);
        return <Tag color={revoked ? "default" : "success"}>{revoked ? tt("已撤销", "Revoked") : tt("生效中", "Active")}</Tag>;
      },
    },
    {
      title: tt("最后使用", "Last Used"),
      dataIndex: "lastUsedAt",
      key: "lastUsedAt",
      width: 160,
      render: (time: string | null) => (time ? new Date(time).toLocaleString() : "—"),
    },
    {
      title: tt("过期时间", "Expires At"),
      dataIndex: "expiresAt",
      key: "expiresAt",
      width: 160,
      render: (time: string | null) => (time ? new Date(time).toLocaleString() : tt("永久", "Never")),
    },
    {
      title: tt("操作", "Actions"),
      key: "actions",
      width: 90,
      render: (_: unknown, record: AccessTokenItem) => {
        if (record.revokedAt) return <Text type="secondary">—</Text>;
        return (
          <Popconfirm
            title={tt("确认撤销此访问令牌？", "Revoke this access token?")}
            description={tt("撤销后使用此令牌的 CLI 远程管理设备将立即失去权限。", "Devices using this CLI token will lose access immediately.")}
            onConfirm={() => void handleRevokeToken(record.id)}
            okText={tt("撤销", "Revoke")}
            cancelText={tt("取消", "Cancel")}
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger size="small">
              {tt("撤销", "Revoke")}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header Info */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcon name="key" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>{tt("CLI 访问令牌", "CLI Access Tokens")}</Title>
                <Tag color="blue">{tt("远程管理", "Remote CLI")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("用于通过 omniroute CLI 命令行远程管理本服务的限定权限令牌。不同于模型调用 API 密钥。", "Scoped tokens that let the omniroute CLI manage this server remotely. Distinct from inference API keys.")}
              </Text>
            </div>
          </Flex>

          <Button icon={<MaterialIcon name="refresh" size={14} />} loading={loading} onClick={() => void loadTokens()}>
            {tt("刷新", "Refresh")}
          </Button>
        </Flex>

        {/* Notice for API Manager */}
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message={
            <span>
              {tt("若需要创建给 Cursor、Claude Code、OpenCode 等客户端调用大模型的 API 密钥，请前往", "To create API keys for client apps (e.g. Cursor, Claude Code) to call models, visit")}{" "}
              <Link to="/api-manager" style={{ fontWeight: "bold" }}>
                {tt("API 管理器", "API Manager")} &rarr;
              </Link>
            </span>
          }
        />
      </Card>

      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void loadTokens()}>{tt("重试", "Retry")}</Button>} />}

      {/* Create Token Form */}
      <Card title={tt("创建访问令牌", "Create Access Token")} className={styles.sectionCard} size="small">
        <Form
          form={form}
          layout="inline"
          initialValues={{ scope: "read" }}
          onFinish={(values) => void handleCreateToken(values as { name: string; scope: "read" | "write" | "admin"; expiresInDays?: string | number })}
          style={{ gap: 8 }}
        >
          <Form.Item name="name" rules={[{ required: true, message: tt("请输入令牌名称", "Please enter token name") }]}>
            <Input placeholder={tt("令牌名称（如 laptop、CI 脚本）", "Token name (e.g. laptop, CI)")} style={{ minWidth: 200 }} />
          </Form.Item>
          <Form.Item name="scope">
            <Select
              style={{ minWidth: 160 }}
              options={[
                { value: "read", label: tt("read — 只读查看", "read — inspect") },
                { value: "write", label: tt("write — 读写配置", "write — configure") },
                { value: "admin", label: tt("admin — 完全管理", "admin — manage") },
              ]}
            />
          </Form.Item>
          <Form.Item name="expiresInDays">
            <Input type="number" min={1} placeholder={tt("有效期天数（可选）", "Expires in days (optional)")} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              {tt("创建令牌", "Create Token")}
            </Button>
          </Form.Item>
        </Form>

        {/* Secret Copy Box */}
        {newSecret && (
          <div className={styles.secretBox}>
            <Text strong style={{ color: "var(--ant-color-success-text)", fontSize: 13 }}>
              {tt("请立即复制此访问令牌（仅显示一次）：", "Copy this access token now — it will not be shown again:")}
            </Text>
            <Flex align="center" gap={8} style={{ marginTop: 8 }}>
              <Paragraph
                copyable
                code
                style={{
                  margin: 0,
                  flex: 1,
                  padding: "6px 10px",
                  background: "var(--ant-color-bg-container)",
                  fontSize: 12,
                  fontFamily: "monospace",
                }}
              >
                {newSecret}
              </Paragraph>
              <Button type="primary" size="small" onClick={() => void handleCopySecret()}>
                {tt("复制", "Copy")}
              </Button>
              <Button type="default" size="small" onClick={() => setNewSecret(null)}>
                {tt("关闭", "Dismiss")}
              </Button>
            </Flex>
          </div>
        )}
      </Card>

      {/* Existing Tokens List */}
      <Card title={tt("已有访问令牌", "Existing Access Tokens")} className={styles.sectionCard} size="small">
        {loading && tokens.length === 0 ? (
          <Flex justify="center" style={{ padding: 36 }}><Spin /></Flex>
        ) : (
          <Table<AccessTokenItem>
            rowKey="id"
            size="small"
            pagination={{ pageSize: 15, showSizeChanger: false }}
            dataSource={tokens}
            columns={columns}
            locale={{ emptyText: tt("暂无访问令牌", "No access tokens yet") }}
          />
        )}
      </Card>
    </div>
  );
}

export default SettingsAccessTokensPage;
