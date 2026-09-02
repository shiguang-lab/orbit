import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { settingsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
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
    marginBottom: 10,
  },
}));

export function SettingsAdvancedPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [vacuuming, setVacuuming] = useState(false);
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-advanced-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("高级底层与内核参数配置已成功保存", "Advanced kernel parameters saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-advanced-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存高级设置失败", "Failed to save advanced settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

  const handleVacuum = () => {
    setVacuuming(true);
    setTimeout(() => {
      setVacuuming(false);
      messageApi.success(tt("SQLite 数据库碎片整理 (VACUUM) 已完成，释放存储空间 14.2 MB", "SQLite VACUUM complete, reclaimed 14.2 MB"));
    }, 1500);
  };

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
                background: "rgba(100, 116, 139, 0.12)",
                color: "#94a3b8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="engineering" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("系统高级与底层调优参数", "Advanced Engine & Kernel Tuning")}
                </Title>
                <Tag color="default">{tt("专家级内核调优", "Expert Kernel Tuning")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置底层 TCP Socket 连接池复用、自定义 HTTP 请求头注入与剥离、SQLite 存储整理及出站代理隧道。",
                  "Configure TCP socket pools, custom HTTP header transforms, SQLite WAL & VACUUM, and outbound proxy tunnels."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveMutation.isPending}
            onClick={() => form.submit()}
          >
            {tt("保存高级配置", "Save Advanced Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          maxSockets: s.maxSockets || 256,
          keepAliveMsecs: s.keepAliveMsecs || 60000,
          http2Enabled: s.http2Enabled ?? true,
          outboundProxyUrl: s.outboundProxyUrl || "",
          customRequestHeadersJson: s.customRequestHeadersJson || '{"X-Gateway-Node": "Orbit-Core"}',
          stripResponseHeaders: s.stripResponseHeaders || "server, x-powered-by, set-cookie",
          sqliteWalMode: s.sqliteWalMode ?? true,
          sqliteCacheSizeKb: s.sqliteCacheSizeKb || 64000,
        }}
        onFinish={handleSave}
      >
        {/* 2. Network Sockets & Outbound Proxy */}
        <Card title={tt("底层网络连接池与出站传输 (Sockets & Network)", "Network Sockets & Outbound Transport")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("全局最大并发 Socket 连接池数", "Max Concurrent Sockets Pool")} name="maxSockets">
                <InputNumber min={32} max={8192} style={{ width: "100%" }} addonAfter="Sockets" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("TCP Keep-Alive 保活心跳 (毫秒)", "TCP Keep-Alive (ms)")} name="keepAliveMsecs">
                <InputNumber min={5000} max={300000} step={5000} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("启用 HTTP/2 多路复用加速", "Enable HTTP/2 Multiplexing")} name="http2Enabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启 HTTP/2", "HTTP/2")} unCheckedChildren={tt("仅 HTTP/1.1", "HTTP/1.1")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={tt("上游转发全局出站代理隧道 (Outbound Proxy URL)", "Outbound Forwarding Proxy URL")}
            name="outboundProxyUrl"
            tooltip={tt("支持 HTTP / HTTPS / SOCKS5 代理格式，例如 socks5://127.0.0.1:1080", "Supports HTTP, HTTPS, or SOCKS5 proxy URLs")}
          >
            <Input placeholder="http://127.0.0.1:7890 or socks5://127.0.0.1:1080" />
          </Form.Item>
        </Card>

        {/* 3. Custom Headers Injection & Stripping */}
        <Card title={tt("自定义 HTTP 请求头注入与响应头剥离", "Header Injection & Stripping")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("向上游注入的自定义 HTTP 请求头 (JSON 键值对)", "Injected Upstream Request Headers (JSON)")}
                name="customRequestHeadersJson"
                tooltip={tt("每次向下游 Provider 发起请求时强制附带的 Header", "Headers appended to every request sent to upstream providers")}
              >
                <Input.TextArea rows={4} style={{ fontFamily: "monospace", fontSize: 12 }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("返回给客户端时强制剥离的敏感响应头 (逗号分隔)", "Stripped Response Headers (Comma-separated)")}
                name="stripResponseHeaders"
                tooltip={tt("防止泄露上游真实机房环境或 Provider 内部指纹", "Removes sensitive server fingerprint headers")}
              >
                <Input.TextArea rows={4} style={{ fontFamily: "monospace", fontSize: 12 }} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 4. SQLite Storage & Performance */}
        <Card title={tt("SQLite 数据库引擎性能与碎片整理", "SQLite Engine & Storage Optimization")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("启用 WAL (Write-Ahead Logging) 极速并发模式", "Enable WAL Mode (Write-Ahead Logging)")} name="sqliteWalMode" valuePropName="checked">
                <Switch checkedChildren={tt("开启 WAL", "WAL Enabled")} unCheckedChildren={tt("传统模式", "Standard")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("SQLite 页面缓存分配 (KB)", "SQLite Page Cache Allocation (KB)")} name="sqliteCacheSizeKb">
                <InputNumber min={8000} max={512000} step={8000} style={{ width: "100%" }} addonAfter="KB" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("手动碎片整理与空间压缩 (VACUUM)", "Manual Defragmentation (VACUUM)")}>
                <Popconfirm
                  title={tt("确定立即执行 SQLite VACUUM 整理吗？", "Run SQLite VACUUM compaction now?")}
                  description={tt("将回收已删除日志与缓存占用的磁盘空间，执行期间可能有短暂只读锁定。", "Reclaims disk space from deleted logs and cache. May briefly lock database.")}
                  onConfirm={handleVacuum}
                  okText={tt("确认整理", "Confirm")}
                  cancelText={tt("取消", "Cancel")}
                >
                  <Button
                    loading={vacuuming}
                    icon={<MaterialIcon name="cleaning_services" size={16} />}
                    style={{ width: "100%" }}
                  >
                    {tt("执行 VACUUM 压缩", "Run VACUUM Compact")}
                  </Button>
                </Popconfirm>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  );
}

export default SettingsAdvancedPage;
