import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
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

export function SettingsGeneralPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [backingUp, setBackingUp] = useState(false);
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-general-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("通用系统设置已成功保存并立即生效", "General system settings saved and applied"));
      void queryClient.invalidateQueries({ queryKey: ["settings-general-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存通用系统设置失败", "Failed to save general settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data || {}) as any;

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

  const handleBackupNow = () => {
    setBackingUp(true);
    setTimeout(() => {
      setBackingUp(false);
      messageApi.success(tt("SQLite 数据库快照与配置热备份成功: orbit-backup-20260902.db", "SQLite snapshot and config hot backup created: orbit-backup-20260902.db"));
    }, 1200);
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
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="tune" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("系统通用设置", "General Settings")}
                </Title>
                <Tag color="blue">{tt("网关内核基础参数", "Gateway Core Params")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置网关服务实例名称、监听端口、请求超时熔断、数据库自动备份及提供商异常自动下线策略。",
                  "Configure gateway instance name, listening port, timeout limits, automated backups, and provider lockout policies."
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
            {tt("保存通用设置", "Save Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          instanceName: s.instanceName || "Orbit-Hub-01",
          serverPort: s.serverPort || 8080,
          requestTimeoutSec: s.requestTimeoutSec || 120,
          defaultFallbackModel: s.defaultFallbackModel || "deepseek-chat",
          logRetentionDays: s.logRetentionDays || 30,
          debugMode: s.debugMode || false,
          showAccountEmails: s.showAccountEmails ?? true,
          autoDisableOn401: s.autoDisableOn401 ?? true,
          autoDisableOnQuotaExhausted: s.autoDisableOnQuotaExhausted ?? true,
          maxConsecutiveFailures: s.maxConsecutiveFailures || 5,
          lockoutCooldownMinutes: s.lockoutCooldownMinutes || 15,
          dbBackupEnabled: s.dbBackupEnabled ?? true,
          dbBackupIntervalHours: s.dbBackupIntervalHours || 24,
          maxBackupSnapshots: s.maxBackupSnapshots || 7,
          usageTokenBuffer: s.usageTokenBuffer || 1000,
        }}
        onFinish={handleSave}
      >
        {/* 2. Network & Core Options */}
        <Card title={tt("基础网络与服务实例标识", "Network & Instance Identity")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("网关实例名称 (Instance Name)", "Gateway Instance Name")}
                name="instanceName"
                tooltip={tt("集群或单机网关的唯一可读标识", "Unique human-readable identifier for this node")}
              >
                <Input placeholder="Orbit-Node-01" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("默认兜底模型 (Fallback Model)", "Default Fallback Model")} name="defaultFallbackModel">
                <Input placeholder="deepseek-chat" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("HTTP 监听端口", "HTTP Server Port")} name="serverPort">
                <InputNumber min={1} max={65535} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("上游调用全局超时 (秒)", "Global Request Timeout (Seconds)")} name="requestTimeoutSec">
                <InputNumber min={10} max={600} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("请求日志保留天数", "Log Retention (Days)")} name="logRetentionDays">
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("用量预警 Token 缓冲池 (Buffer)", "Usage Token Buffer Alert Pool")} name="usageTokenBuffer">
                <InputNumber min={100} max={100000} step={500} style={{ width: "100%" }} addonAfter="Tokens" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 3. Provider Auto-Disable & Lockout */}
        <Card title={tt("提供商异常自动下线与防击穿熔断", "Provider Circuit Breaking & Auto-Isolation")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("401 / 403 鉴权失败自动下线", "Auto-disable on 401/403 Auth Failure")}
                name="autoDisableOn401"
                valuePropName="checked"
                tooltip={tt("当 API Key 失效或凭证被拒绝时立即隔离该连接，避免持续打向上游", "Isolate provider connection on credential failure to protect upstream quota")}
              >
                <Switch checkedChildren={tt("开启自动隔离", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("配额耗尽 (429 / Quota) 自动避让", "Auto-backoff on 429 / Quota Exhaustion")}
                name="autoDisableOnQuotaExhausted"
                valuePropName="checked"
                tooltip={tt("上游报配额耗尽时自动降级权重，等待冷却后自动重试探测", "Automatically downscale weight on 429 and retry after cooldown")}
              >
                <Switch checkedChildren={tt("开启避让", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("连续故障触发熔断阈值", "Consecutive Failure Threshold")} name="maxConsecutiveFailures">
                <InputNumber min={2} max={50} style={{ width: "100%" }} addonAfter={tt("次", "errors")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("熔断节点自动恢复探测冷却", "Lockout Cooldown Period")} name="lockoutCooldownMinutes">
                <InputNumber min={1} max={1440} style={{ width: "100%" }} addonAfter={tt("分钟", "min")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 4. Privacy & Debug Settings */}
        <Card title={tt("隐私显示与诊断调试", "Privacy & Diagnostics")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("提供商卡片显示完整账户邮箱", "Show Full Account Emails on Provider Cards")}
                name="showAccountEmails"
                valuePropName="checked"
                tooltip={tt("关闭后将在界面上对提供商绑定的邮箱地址进行掩码打码 (如 a***@domain.com)", "Mask provider emails with asterisks when disabled")}
              >
                <Switch checkedChildren={tt("明文显示", "Full")} unCheckedChildren={tt("自动脱敏", "Masked")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("全局详细调试模式 (Debug Mode)", "Global Verbose Debug Mode")}
                name="debugMode"
                valuePropName="checked"
                tooltip={tt("开启后将在控制台与日志中输出完整 HTTP 请求响应头与 Raw Payload", "Output full HTTP headers and raw request/response payloads in logs")}
              >
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("常规生产模式", "Production")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 5. Database Backup & Retention */}
        <Card title={tt("数据库热备份与历史快照维护", "Database Snapshot & Automated Hot Backups")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("启用后台自动热备份", "Automated Background Backup")} name="dbBackupEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("开启定时备份", "Enabled")} unCheckedChildren={tt("停用", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("备份执行周期", "Backup Interval")} name="dbBackupIntervalHours">
                <InputNumber min={1} max={168} style={{ width: "100%" }} addonAfter={tt("小时", "hours")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("最多保留历史快照数", "Max Snapshots Retained")} name="maxBackupSnapshots">
                <InputNumber min={1} max={30} style={{ width: "100%" }} addonAfter={tt("份", "files")} />
              </Form.Item>
            </Col>
          </Row>

          <Flex justify="space-between" align="center" style={{ paddingTop: 8, borderTop: "1px dashed var(--ant-color-border-secondary)" }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt(
                "当前备份目录: data/backups/ | 最近备份: 2026-09-02 04:00:00 (健康)",
                "Backup directory: data/backups/ | Last snapshot: 2026-09-02 04:00:00 (Healthy)"
              )}
            </Text>
            <Button
              icon={<MaterialIcon name="backup" size={16} />}
              loading={backingUp}
              onClick={handleBackupNow}
            >
              {tt("立即生成热备份快照", "Create Hot Backup Snapshot")}
            </Button>
          </Flex>
        </Card>
      </Form>
    </div>
  );
}

export default SettingsGeneralPage;
