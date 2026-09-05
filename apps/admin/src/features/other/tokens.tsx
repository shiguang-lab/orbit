import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { gamificationApi, type TokenLedgerEntry, type InviteItem, type ServerConnection } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  balanceBox: {
    padding: "16px 20px",
    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 182, 212, 0.12))",
    borderRadius: 8,
    border: `1px solid rgba(16, 185, 129, 0.25)`,
  },
}));

export function TokensPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState("transfer");
  const [transferForm] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [redeemForm] = Form.useForm();
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [serverForm] = Form.useForm();

  const ledgerQuery = useQuery({
    queryKey: ["gamification-transfer"],
    queryFn: gamificationApi.getTransferLedger,
  });

  const invitesQuery = useQuery({
    queryKey: ["gamification-invites"],
    queryFn: gamificationApi.getInvites,
  });

  const serversQuery = useQuery({
    queryKey: ["gamification-servers"],
    queryFn: gamificationApi.getServers,
  });

  const transferMutation = useMutation({
    mutationFn: (values: any) => gamificationApi.transferTokens(values),
    onSuccess: (data) => {
      messageApi.success(tt(`算力 Token 转账成功！交易 ID: ${data.idempotencyKey}`, `Transferred successfully! TX: ${data.idempotencyKey}`));
      transferForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["gamification-transfer"] });
    },
    onError: () => messageApi.error(tt("转账失败，请检查余额与目标密钥", "Transfer failed")),
  });

  const createInviteMutation = useMutation({
    mutationFn: (values: any) => gamificationApi.createInvite(values),
    onSuccess: (data) => {
      messageApi.success(tt(`成功生成邀请码: ${data.code}`, `Generated invite code: ${data.code}`));
      inviteForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["gamification-invites"] });
    },
    onError: () => messageApi.error(tt("生成邀请码失败", "Failed to generate invite")),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (id: string) => gamificationApi.revokeInvite(id),
    onSuccess: () => {
      messageApi.success(tt("已作废此邀请码", "Revoked invite"));
      void queryClient.invalidateQueries({ queryKey: ["gamification-invites"] });
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (values: any) => gamificationApi.redeemInvite(values.code),
    onSuccess: () => {
      messageApi.success(tt("邀请码兑换成功！已加入社区联邦网络", "Redeemed invite code successfully!"));
      redeemForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["gamification-transfer"] });
    },
    onError: () => messageApi.error(tt("兑换失败，邀请码无效或已过期", "Redeem failed")),
  });

  const connectServerMutation = useMutation({
    mutationFn: (values: any) => gamificationApi.connectServer(values),
    onSuccess: () => {
      messageApi.success(tt("已成功接入社区联邦节点", "Connected to community federation server"));
      setServerModalOpen(false);
      serverForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["gamification-servers"] });
    },
    onError: () => messageApi.error(tt("连接联邦节点失败", "Failed to connect server")),
  });

  if (ledgerQuery.isLoading || invitesQuery.isLoading || serversQuery.isLoading) {
    return <PageSkeleton />;
  }

  const balance = ledgerQuery.data?.balance ?? 0;
  const history = ledgerQuery.data?.history ?? [];
  const invites = invitesQuery.data?.invites ?? [];
  const servers = serversQuery.data?.servers ?? [];

  const tabItems = [
    {
      key: "transfer",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="swap_horiz" size={16} />
          <span>{tt("Token 转账与分发", "Transfer & Ledger")}</span>
        </Flex>
      ),
      children: (
        <Flex vertical gap={12}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={10}>
              <Card title={tt("发起算力 Token 转账", "Transfer Tokens")} className={styles.sectionCard} size="small" style={{ height: "100%" }}>
                <Form form={transferForm} layout="vertical" onFinish={(v) => transferMutation.mutate(v)}>
                  <Form.Item
                    label={tt("目标 API 密钥标识 / 账户", "Target API Key")}
                    name="toApiKeyId"
                    rules={[{ required: true, message: tt("请输入目标密钥", "Please input target API key") }]}
                  >
                    <Input placeholder="sk-developer-xxxx or admin" />
                  </Form.Item>
                  <Form.Item
                    label={tt("转账 Token 数量", "Amount (Tokens)")}
                    name="amount"
                    rules={[{ required: true, message: tt("请输入转账数量", "Please input amount") }]}
                  >
                    <InputNumber min={1000} step={5000} style={{ width: "100%" }} addonAfter="Tokens" />
                  </Form.Item>
                  <Form.Item label={tt("转账备注理由 (选填)", "Reason / Memo")} name="reason">
                    <Input placeholder={tt("如：团队子项目额度分发", "e.g. Project allocation")} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={transferMutation.isPending} icon={<MaterialIcon name="send" size={14} />}>
                    {tt("确认转账", "Confirm Transfer")}
                  </Button>
                </Form>
              </Card>
            </Col>

            <Col xs={24} md={14}>
              <Card title={tt("转账流水账本", "Transfer History")} className={styles.sectionCard} size="small" style={{ height: "100%" }}>
                <Table<TokenLedgerEntry>
                  rowKey="id"
                  size="small"
                  dataSource={history}
                  pagination={{ pageSize: 5 }}
                  columns={[
                    {
                      title: tt("交易双方", "From / To"),
                      key: "parties",
                      render: (_, r) => (
                        <span style={{ fontSize: 12 }}>
                          <code>{r.fromApiKeyId}</code> → <code>{r.toApiKeyId}</code>
                        </span>
                      ),
                    },
                    {
                      title: tt("变动数量", "Amount"),
                      dataIndex: "amount",
                      key: "amount",
                      render: (amt, r) => (
                        <Text strong style={{ color: r.fromApiKeyId === "admin" ? "#ef4444" : "#10b981", fontFamily: "monospace" }}>
                          {r.fromApiKeyId === "admin" ? `-${amt.toLocaleString()}` : `+${amt.toLocaleString()}`}
                        </Text>
                      ),
                    },
                    {
                      title: tt("备注", "Reason"),
                      dataIndex: "reason",
                      key: "reason",
                      render: (rs) => <Text type="secondary" style={{ fontSize: 11 }}>{rs || "—"}</Text>,
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </Flex>
      ),
    },
    {
      key: "invites",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="vpn_key" size={16} />
          <span>{tt("邀请码与兑换", "Invites & Redemption")}</span>
        </Flex>
      ),
      children: (
        <Flex vertical gap={12}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Card title={tt("生成新邀请码", "Generate Invite Code")} className={styles.sectionCard} size="small">
                <Form form={inviteForm} layout="vertical" onFinish={(v) => createInviteMutation.mutate(v)} initialValues={{ maxUses: 1 }}>
                  <Form.Item label={tt("最大可用次数", "Max Uses")} name="maxUses">
                    <InputNumber min={1} max={100} style={{ width: "100%" }} addonAfter={tt("次", "times")} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={createInviteMutation.isPending} icon={<MaterialIcon name="add" size={14} />}>
                    {tt("生成邀请码", "Generate Invite")}
                  </Button>
                </Form>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title={tt("兑换外部邀请码", "Redeem Invite Code")} className={styles.sectionCard} size="small">
                <Form form={redeemForm} layout="vertical" onFinish={(v) => redeemMutation.mutate(v)}>
                  <Form.Item
                    label={tt("输入邀请兑换码", "Invite Code")}
                    name="code"
                    rules={[{ required: true, message: tt("请输入邀请码", "Please input code") }]}
                  >
                    <Input placeholder="SGW-XXXX-YYYY" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={redeemMutation.isPending} icon={<MaterialIcon name="redeem" size={14} />}>
                    {tt("立即兑换", "Redeem Now")}
                  </Button>
                </Form>
              </Card>
            </Col>
          </Row>

          <Card title={tt("活跃邀请码清单", "Active Invites")} className={styles.sectionCard} size="small">
            <Table<InviteItem>
              rowKey="id"
              size="small"
              dataSource={invites}
              pagination={false}
              columns={[
                {
                  title: tt("邀请码", "Code"),
                  dataIndex: "code",
                  key: "code",
                  render: (code) => <code style={{ fontWeight: 700, color: "#0ea5e9" }}>{code}</code>,
                },
                {
                  title: tt("使用进度", "Usage"),
                  key: "usage",
                  render: (_, r) => <span>{r.useCount} / {r.maxUses}</span>,
                },
                {
                  title: tt("创建时间", "Created"),
                  dataIndex: "createdAt",
                  key: "time",
                  render: (t) => <Text type="secondary" style={{ fontSize: 11 }}>{new Date(t).toLocaleDateString()}</Text>,
                },
                {
                  title: tt("操作", "Action"),
                  key: "action",
                  render: (_, r) => (
                    <Popconfirm title={tt("确定作废此邀请码？", "Revoke this invite?")} onConfirm={() => revokeInviteMutation.mutate(r.id)}>
                      <Button type="text" danger size="small" icon={<MaterialIcon name="block" size={14} />} />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Card>
        </Flex>
      ),
    },
    {
      key: "federation",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="hub" size={16} />
          <span>{tt("社区联邦网络节点", "Federated Servers")}</span>
        </Flex>
      ),
      children: (
        <Flex vertical gap={12}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <span>{tt("已连接的联邦上游服务节点", "Connected Community Servers")}</span>
                <Button type="primary" size="small" icon={<MaterialIcon name="add" size={14} />} onClick={() => setServerModalOpen(true)}>
                  {tt("接入新联邦节点", "Connect Server")}
                </Button>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
          >
            <Table<ServerConnection>
              rowKey="id"
              size="small"
              dataSource={servers}
              pagination={false}
              columns={[
                {
                  title: tt("节点名称", "Name"),
                  dataIndex: "name",
                  key: "name",
                  render: (name) => <Text strong>{name}</Text>,
                },
                {
                  title: tt("服务地址 URL", "URL"),
                  dataIndex: "url",
                  key: "url",
                  render: (url) => <code>{url}</code>,
                },
                {
                  title: tt("节点状态", "Status"),
                  dataIndex: "status",
                  key: "status",
                  render: (st) => <Tag color="green">{st.toUpperCase()}</Tag>,
                },
                {
                  title: tt("最后同步", "Last Sync"),
                  dataIndex: "lastSyncAt",
                  key: "lastSync",
                  render: (t) => <Text type="secondary" style={{ fontSize: 11 }}>{t ? new Date(t).toLocaleTimeString() : "—"}</Text>,
                },
              ]}
            />
          </Card>
        </Flex>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="toll" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("算力 Token 资产与联邦中枢", "Token Ledger & Community Federation")}
                </Title>
                <Tag color="green">{tt("共享算力网络", "Federated Network")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理网关内部 Token 资产流转、生成与兑换团队邀请码、接入跨节点社区联邦网关。",
                  "Manage token balance transfers, community invites, and federated node connections."
                )}
              </Text>
            </div>
          </Flex>

          <div className={styles.balanceBox}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>{tt("当前可用 Token 余额", "Available Balance")}</Text>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", fontFamily: "monospace" }}>
              {balance.toLocaleString()} <span style={{ fontSize: 12, fontWeight: 500 }}>Tokens</span>
            </div>
          </div>
        </Flex>
      </Card>

      {/* 2. Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      {/* Connect Server Modal */}
      <Modal
        title={tt("接入新联邦上游服务节点", "Connect Federation Server")}
        open={serverModalOpen}
        onCancel={() => setServerModalOpen(false)}
        onOk={() => serverForm.submit()}
        confirmLoading={connectServerMutation.isPending}
        okText={tt("确认接入", "Connect")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={serverForm} layout="vertical" onFinish={(v) => connectServerMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item label={tt("节点名称", "Server Name")} name="name" rules={[{ required: true, message: tt("请输入节点名称", "Please enter server name") }]}>
            <Input placeholder="West-US Backup Node" />
          </Form.Item>
          <Form.Item label={tt("服务地址 (URL)", "Server URL")} name="url" rules={[{ required: true, message: tt("请输入服务地址", "Please enter server URL") }]}>
            <Input placeholder="https://gateway.example.com" />
          </Form.Item>
          <Form.Item label={tt("连接凭据 API Key (选填)", "API Key (Optional)")} name="apiKey">
            <Input.Password placeholder="sk-xxxx" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default TokensPage;
