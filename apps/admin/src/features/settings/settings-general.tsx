import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { storageApi, type DbBackupItem } from "@/entities/api";
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
  statCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
  },
  tableRowCard: {
    padding: "8px 12px",
    background: token.colorFillAlter,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  actionCard: {
    borderRadius: 8,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
  },
}));

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export function SettingsGeneralPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const [activeTab, setActiveTab] = useState<string>("backups");

  // Reset Usage Modal
  const [resetUsageOpen, setResetUsageOpen] = useState(false);
  const [resetPeriod, setResetPeriod] = useState<string>("all");

  // Restore Modal
  const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

  // Forms
  const [policyForm] = Form.useForm();
  const [backupRetentionForm] = Form.useForm();

  // Queries
  const healthQuery = useQuery({
    queryKey: ["storage-health"],
    queryFn: storageApi.getHealth,
  });

  const backupsQuery = useQuery({
    queryKey: ["db-backups"],
    queryFn: storageApi.getBackups,
  });

  const dbSettingsQuery = useQuery({
    queryKey: ["settings-database-full"],
    queryFn: storageApi.getDatabaseSettingsFull,
  });

  // Sync forms
  useEffect(() => {
    if (dbSettingsQuery.data) {
      const d = dbSettingsQuery.data;
      policyForm.setFieldsValue({
        retention: d.retention || {},
        optimization: d.optimization || {},
        aggregation: d.aggregation || {},
      });
    }
  }, [dbSettingsQuery.data, policyForm]);

  useEffect(() => {
    if (healthQuery.data) {
      backupRetentionForm.setFieldsValue({
        keepLatest: healthQuery.data.maxBackups ?? 20,
        retentionDays: (healthQuery.data as any).retentionDays?.call ?? 0,
      });
    }
  }, [healthQuery.data, backupRetentionForm]);

  // Mutations
  const backupMutation = useMutation({
    mutationFn: storageApi.createBackup,
    onSuccess: () => {
      messageApi.success(tt("数据库快照备份创建成功", "Database backup created successfully"));
      void queryClient.invalidateQueries({ queryKey: ["db-backups"] });
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("创建快照失败", "Failed to create backup"));
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (filename: string) => storageApi.restoreBackup(filename),
    onSuccess: () => {
      setRestoreTarget(null);
      messageApi.success(tt("数据库备份已成功还原", "Database backup restored successfully"));
      void queryClient.invalidateQueries();
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("还原快照失败", "Failed to restore backup"));
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: (params?: { keepLatest?: number; retentionDays?: number }) =>
      storageApi.cleanupBackups(params),
    onSuccess: () => {
      messageApi.success(tt("旧备份已完成清理", "Old backups cleaned up successfully"));
      void queryClient.invalidateQueries({ queryKey: ["db-backups"] });
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("清理备份失败", "Failed to clean up backups"));
    },
  });

  const vacuumMutation = useMutation({
    mutationFn: storageApi.vacuum,
    onSuccess: (data: any) => {
      messageApi.success(data?.message || tt("SQLite 整理碎片 (VACUUM) 已完成", "SQLite VACUUM completed"));
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
      void queryClient.invalidateQueries({ queryKey: ["settings-database-full"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("执行 VACUUM 失败", "Failed to run VACUUM"));
    },
  });

  const refreshStatsMutation = useMutation({
    mutationFn: storageApi.refreshDatabaseStats,
    onSuccess: () => {
      messageApi.success(tt("数据库统计信息已成功刷新", "Database stats refreshed successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-database-full"] });
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("刷新数据库统计失败", "Failed to refresh stats"));
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: storageApi.clearCache,
    onSuccess: () => messageApi.success(tt("网关缓存已清空", "Cache cleared successfully")),
    onError: () => messageApi.error(tt("清空缓存失败", "Failed to clear cache")),
  });

  const purgeLogsMutation = useMutation({
    mutationFn: storageApi.purgeExpiredLogs,
    onSuccess: (data: any) =>
      messageApi.success(tt(`已清理 ${data?.deleted || 0} 条过期日志`, `Purged ${data?.deleted || 0} expired logs`)),
    onError: () => messageApi.error(tt("清理过期日志失败", "Failed to purge expired logs")),
  });

  const purgeCallLogsMutation = useMutation({
    mutationFn: storageApi.purgeCallLogs,
    onSuccess: (data: any) => {
      messageApi.success(tt(`已清理 ${data?.deleted || 0} 条调用日志`, `Purged ${data?.deleted || 0} call logs`));
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
      void queryClient.invalidateQueries({ queryKey: ["settings-database-full"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("清理调用日志失败", "Failed to purge call logs"));
    },
  });

  const purgeQuotaSnapshotsMutation = useMutation({
    mutationFn: storageApi.purgeQuotaSnapshots,
    onSuccess: (data: any) => {
      messageApi.success(tt(`已清空 ${data?.deleted || 0} 条配额快照`, `Purged ${data?.deleted || 0} quota snapshots`));
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("清空配额快照失败", "Failed to purge quota snapshots"));
    },
  });

  const purgeDetailedLogsMutation = useMutation({
    mutationFn: storageApi.purgeDetailedLogs,
    onSuccess: (data: any) => {
      messageApi.success(tt(`已清理 ${data?.deleted || 0} 条详细请求日志`, `Purged ${data?.deleted || 0} detailed logs`));
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("清理详细日志失败", "Failed to purge detailed logs"));
    },
  });

  const resetUsageMutation = useMutation({
    mutationFn: (period: string) => storageApi.resetUsage(period),
    onSuccess: () => {
      setResetUsageOpen(false);
      messageApi.success(tt("用量历史已成功重置", "Usage history reset successfully"));
      void queryClient.invalidateQueries();
    },
    onError: (err: Error) => {
      messageApi.error(err.message || tt("重置用量失败", "Failed to reset usage history"));
    },
  });

  const saveDbSettingsMutation = useMutation({
    mutationFn: (patch: any) => storageApi.updateDatabaseSettingsFull(patch),
    onSuccess: () => {
      messageApi.success(tt("存储策略与底层设置已保存", "Storage settings saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-database-full"] });
    },
    onError: () => messageApi.error(tt("保存存储策略失败", "Failed to save storage settings")),
  });

  const saveBackupRetentionMutation = useMutation({
    mutationFn: (values: any) => storageApi.saveBackupRetention(values),
    onSuccess: () => {
      messageApi.success(tt("备份保留策略已成功保存", "Backup retention policy saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["storage-health"] });
    },
    onError: () => messageApi.error(tt("保存备份保留策略失败", "Failed to save backup retention")),
  });

  if (healthQuery.isLoading && backupsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const health = healthQuery.data;
  const backups = backupsQuery.data?.backups || [];
  const dbData = dbSettingsQuery.data || {};
  const stats = dbData.stats || {};
  const tableCounts = stats.tableCounts || stats.tableRows || {};

  const handleExportJson = () => {
    window.open("/api/settings/export-json", "_blank");
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await storageApi.importJson(parsed);
      messageApi.success(tt("网关配置导入成功", "Configuration imported successfully"));
      void queryClient.invalidateQueries();
    } catch (err: any) {
      messageApi.error(err?.message || tt("配置文件解析失败", "Failed to parse configuration file"));
    }
    return false;
  };

  // Tab 1: 备份与迁移
  const tabBackups = (
    <Flex vertical gap={12}>
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="inventory_2" size={18} />
              <span>{tt("数据库备份快照清单", "Database Backups List")}</span>
            </Flex>
            <Badge count={backups.length} overflowCount={999} />
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Table<DbBackupItem>
          dataSource={backups}
          rowKey="filename"
          size="small"
          pagination={{ pageSize: 5 }}
          columns={[
            {
              title: tt("快照文件名", "Snapshot File"),
              dataIndex: "filename",
              key: "filename",
              render: (name: string) => (
                <Flex align="center" gap={6}>
                  <MaterialIcon name="description" size={16} />
                  <span style={{ fontFamily: "monospace", fontSize: 12 }}>{name}</span>
                </Flex>
              ),
            },
            {
              title: tt("快照体积", "Size"),
              dataIndex: "sizeBytes",
              key: "sizeBytes",
              width: 120,
              render: (bytes: number) => formatBytes(bytes),
            },
            {
              title: tt("创建时间", "Created At"),
              dataIndex: "createdAt",
              key: "createdAt",
              width: 180,
              render: (time: string) => (time ? new Date(time).toLocaleString() : "-"),
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              width: 160,
              render: (_, record) => (
                <Space size="small">
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => setRestoreTarget(record.filename)}
                  >
                    {tt("还原", "Restore")}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    href={`/api/db-backups/download?file=${encodeURIComponent(record.filename)}`}
                    target="_blank"
                  >
                    {tt("下载", "Download")}
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <MaterialIcon name="history" size={18} />
                  <span>{tt("自动保留与清理策略", "Backup Retention Policy")}</span>
                </Flex>
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<MaterialIcon name="save" size={14} />}
                    loading={saveBackupRetentionMutation.isPending}
                    onClick={() => {
                      const values = backupRetentionForm.getFieldsValue();
                      saveBackupRetentionMutation.mutate(values);
                    }}
                  >
                    {tt("保存策略", "Save")}
                  </Button>
                  <Popconfirm
                    title={tt("确认立即清理旧备份？", "Clean up old backups?")}
                    description={tt("将按设置的最大份数和天数自动删除过期的快照文件", "Will remove snapshots exceeding max files or days")}
                    onConfirm={() => {
                      const values = backupRetentionForm.getFieldsValue();
                      cleanupMutation.mutate(values);
                    }}
                  >
                    <Button size="small" danger loading={cleanupMutation.isPending}>
                      {tt("清理旧备份", "Cleanup")}
                    </Button>
                  </Popconfirm>
                </Space>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
            style={{ height: "100%" }}
          >
            <Form form={backupRetentionForm} layout="vertical">
              <Row gutter={[16, 0]}>
                <Col xs={24} sm={12}>
                  <Form.Item label={tt("最多保留快照数量", "Max Backup Files")} name="keepLatest" initialValue={20}>
                    <InputNumber min={1} max={100} style={{ width: "100%" }} addonAfter={tt("份", "files")} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item label={tt("快照最长保留期限", "Retention Days (0 = forever)")} name="retentionDays" initialValue={0}>
                    <InputNumber min={0} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={
              <Flex align="center" gap={8}>
                <MaterialIcon name="swap_horiz" size={18} />
                <span>{tt("配置迁移与导入导出", "Configuration Export & Import")}</span>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
            style={{ height: "100%" }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Flex vertical gap={6}>
                  <Text strong>{tt("全量配置导出", "Export Config")}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("导出连接、组合、密钥及系统配置", "Export connections, combos, keys, and settings.")}
                  </Text>
                  <Button icon={<MaterialIcon name="download" size={16} />} onClick={handleExportJson} style={{ alignSelf: "flex-start" }}>
                    {tt("导出配置 (.json)", "Export (.json)")}
                  </Button>
                </Flex>
              </Col>

              <Col xs={24} sm={12}>
                <Flex vertical gap={6}>
                  <Text strong>{tt("配置文件还原导入", "Import Config")}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("上传导出的 JSON 覆盖恢复网关配置", "Upload JSON to restore gateway configuration.")}
                  </Text>
                  <Upload
                    accept=".json"
                    showUploadList={false}
                    beforeUpload={(file) => handleImportFile(file as File)}
                  >
                    <Button icon={<MaterialIcon name="upload" size={16} />}>
                      {tt("选择 JSON 文件", "Select JSON File")}
                    </Button>
                  </Upload>
                </Flex>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Flex>
  );

  // Tab 2: 存储策略与调优
  const tabPolicies = (
    <Form
      form={policyForm}
      layout="vertical"
      onFinish={(values) => saveDbSettingsMutation.mutate(values)}
    >
      <Flex vertical gap={12}>
        {/* 数据保留周期 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="schedule" size={18} />
              <span>{tt("数据生命周期与保留期策略 (Retention Policies)", "Data Retention Policies & Cleanup Schedule")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("调用日志保留天数 (callLogs)", "Call Logs Retention")} name={["retention", "callLogs"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("配额快照保留天数 (quotaSnapshots)", "Quota Snapshots Retention")} name={["retention", "quotaSnapshots"]} initialValue={7}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("压缩分析保留天数 (compressionAnalytics)", "Compression Analytics")} name={["retention", "compressionAnalytics"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("MCP 审计日志保留 (mcpAudit)", "MCP Audit Retention")} name={["retention", "mcpAudit"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("用量历史保留天数 (usageHistory)", "Usage History Retention")} name={["retention", "usageHistory"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("A2A 交互事件保留 (a2aEvents)", "A2A Events Retention")} name={["retention", "a2aEvents"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("记忆条目保留天数 (memoryEntries)", "Memory Entries Retention")} name={["retention", "memoryEntries"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("经验审计日志保留 (xpAuditLog)", "XP Audit Retention")} name={["retention", "xpAuditLog"]} initialValue={30}>
                <InputNumber min={1} max={365} style={{ width: "100%" }} addonAfter={tt("天", "days")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 底层优化调优 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="tune" size={18} />
              <span>{tt("SQLite 底层引擎性能调优 (Database Optimization)", "SQLite Engine Tuning & Pragmas")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("自动碎片整理模式 (Auto-Vacuum)", "Auto-Vacuum Mode")} name={["optimization", "autoVacuumMode"]} initialValue="NONE">
                <Select
                  options={[
                    { label: "NONE (禁用自动收缩)", value: "NONE" },
                    { label: "FULL (完全收缩)", value: "FULL" },
                    { label: "INCREMENTAL (增量收缩)", value: "INCREMENTAL" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("定时 VACUUM 计划周期", "Scheduled Vacuum Period")} name={["optimization", "scheduledVacuum"]} initialValue="never">
                <Select
                  options={[
                    { label: tt("从不自动执行", "Never"), value: "never" },
                    { label: tt("每日执行 (Daily)", "Daily"), value: "daily" },
                    { label: tt("每周执行 (Weekly)", "Weekly"), value: "weekly" },
                    { label: tt("每月执行 (Monthly)", "Monthly"), value: "monthly" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label={tt("定时执行时刻 (小时)", "Vacuum Hour")} name={["optimization", "vacuumHour"]} initialValue={2}>
                <InputNumber min={0} max={23} style={{ width: "100%" }} addonAfter={tt("点", ":00")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label={tt("存储页大小 (Page Size)", "Page Size")} name={["optimization", "pageSize"]} initialValue={4096}>
                <InputNumber min={512} max={65536} step={512} style={{ width: "100%" }} addonAfter="B" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Form.Item label={tt("页缓存大小 (Cache Size)", "Cache Size")} name={["optimization", "cacheSizeKb"]} initialValue={16384}>
                <InputNumber min={1024} max={262144} step={1024} style={{ width: "100%" }} addonAfter="KB" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 聚合与汇总 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="analytics" size={18} />
              <span>{tt("用量汇总与压缩分析聚合 (Aggregation & Rollup)", "Analytics Rollup & Cache TTL")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("统计数据汇总聚合粒度", "Rollup Aggregation Interval")} name={["aggregation", "rollupInterval"]} initialValue="daily">
                <Select
                  options={[
                    { label: tt("按小时汇总 (Hourly)", "Hourly"), value: "hourly" },
                    { label: tt("按天汇总 (Daily - 推荐)", "Daily"), value: "daily" },
                    { label: tt("按周汇总 (Weekly)", "Weekly"), value: "weekly" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("预聚合统计缓存生存期 (Cache TTL)", "Pre-aggregated Cache TTL")} name={["aggregation", "preaggregatedCacheTtl"]} initialValue={3600}>
                <InputNumber min={60} max={86400} step={300} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Flex justify="flex-end">
          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveDbSettingsMutation.isPending}
            onClick={() => policyForm.submit()}
          >
            {tt("保存所有存储策略与优化配置", "Save Storage Settings")}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );

  // Tab 3: 表明细与系统运维
  const tabMaintenance = (
    <Flex vertical gap={12}>
      {/* 八大表统计 */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="table_chart" size={18} />
              <span>{tt("数据库表行数明细与底层指标 (Database Statistics)", "Database Tables & Storage Breakdown")}</span>
            </Flex>
            <Space>
              {stats.sqliteVersion && <Tag color="geekblue">SQLite {stats.sqliteVersion}</Tag>}
              {stats.pageSize && <Tag>Page {stats.pageSize}B</Tag>}
              {stats.totalPages && <Tag>{stats.totalPages} Pages</Tag>}
            </Space>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          {[
            { key: "call_logs", label: tt("请求调用日志 (call_logs)", "Call Logs"), icon: "receipt_long" },
            { key: "proxy_call_logs", label: tt("代理请求日志 (proxy_logs)", "Proxy Logs"), icon: "sync_alt" },
            { key: "provider_snapshots", label: tt("供应商快照 (snapshots)", "Snapshots"), icon: "camera" },
            { key: "quota_snapshots", label: tt("配额历史快照 (quota)", "Quota Snapshots"), icon: "pie_chart" },
            { key: "combos", label: tt("模型路由组合 (combos)", "Combos"), icon: "hub" },
            { key: "api_keys", label: tt("API 访问令牌 (api_keys)", "API Keys"), icon: "vpn_key" },
            { key: "cli_access_tokens", label: tt("CLI 认证令牌 (cli_tokens)", "CLI Tokens"), icon: "terminal" },
            { key: "key_value", label: tt("配置键值对 (key_value)", "Key-Value Pairs"), icon: "dataset" },
          ].map((item) => {
            const count = tableCounts[item.key] ?? tableCounts[item.key.replace(/_/g, "")] ?? 0;
            return (
              <Col xs={12} sm={8} md={6} key={item.key}>
                <div className={styles.tableRowCard}>
                  <Flex justify="space-between" align="center">
                    <Flex align="center" gap={6}>
                      <MaterialIcon name={item.icon} size={16} />
                      <Text style={{ fontSize: 12 }}>{item.label}</Text>
                    </Flex>
                    <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>
                      {Number(count).toLocaleString()}
                    </Tag>
                  </Flex>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* 运维工具箱 */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="build" size={18} />
            <span>{tt("数据库运维与清理操作工具箱 (Maintenance)", "Database Maintenance & Purge Toolbox")}</span>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="delete_sweep" size={16} />
                    <Text strong>{tt("清空缓存", "Clear Cache")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("清空模型列表与响应缓存", "Clear catalog and query cache")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={clearCacheMutation.isPending}
                  onClick={() => clearCacheMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("执行清空", "Execute")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="cleaning_services" size={16} />
                    <Text strong>{tt("碎片整理 (VACUUM)", "Run VACUUM")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("收缩 SQLite 文件回收磁盘", "Reclaim unused disk pages")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={vacuumMutation.isPending}
                  onClick={() => vacuumMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("执行 VACUUM", "Run VACUUM")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="auto_delete" size={16} />
                    <Text strong>{tt("清理过期日志", "Purge Expired")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("按保留期清理过期调用日志", "Purge expired logs")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={purgeLogsMutation.isPending}
                  onClick={() => purgeLogsMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("清理过期", "Purge")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="delete_forever" size={16} />
                    <Text strong>{tt("清空调用日志", "Purge All Call Logs")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("清理所有历史请求调用记录", "Purge all call logs")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={purgeCallLogsMutation.isPending}
                  onClick={() => purgeCallLogsMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("清空日志", "Purge All")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="delete_forever" size={16} />
                    <Text strong>{tt("清空配额快照", "Purge Quotas")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("清理所有供应商配额快照", "Purge all quota snapshots")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={purgeQuotaSnapshotsMutation.isPending}
                  onClick={() => purgeQuotaSnapshotsMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("清空快照", "Purge Quotas")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.actionCard} style={{ padding: "12px 14px" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="delete_forever" size={16} />
                    <Text strong>{tt("清空详细体日志", "Purge Details")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("释放大体积请求响应体内容", "Purge big body payload logs")}
                  </Text>
                </div>
                <Button
                  size="small"
                  loading={purgeDetailedLogsMutation.isPending}
                  onClick={() => purgeDetailedLogsMutation.mutate()}
                  style={{ marginTop: 8 }}
                >
                  {tt("清空详细体", "Purge Details")}
                </Button>
              </Flex>
            </div>
          </Col>

          <Col xs={24} sm={12} md={12}>
            <div className={styles.actionCard} style={{ padding: "12px 14px", border: "1px solid rgba(239, 68, 68, 0.3)", background: "rgba(239, 68, 68, 0.03)" }}>
              <Flex vertical gap={6} justify="space-between" style={{ height: "100%" }}>
                <div>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="restart_alt" size={16} style={{ color: "#ef4444" }} />
                    <Text strong style={{ color: "#ef4444" }}>{tt("重置历史用量统计 (Destructive Reset)", "Reset Usage History")}</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("按选定时间窗口清除用量统计与 Token 消耗账本（配置与提供商连接安全保留）。", "Selectively wipe telemetry and token usage records.")}
                  </Text>
                </div>
                <Button
                  danger
                  size="small"
                  onClick={() => setResetUsageOpen(true)}
                  style={{ alignSelf: "flex-start", marginTop: 8 }}
                >
                  {tt("打开用量重置面板...", "Open Reset Dialog...")}
                </Button>
              </Flex>
            </div>
          </Col>
        </Row>
      </Card>
    </Flex>
  );

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
              <MaterialIcon name="database" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("系统存储与底层数据库 (System Storage)", "System Storage & Database Management")}
                </Title>
                <Badge status="success" text={health?.driver?.toUpperCase() || "SQLITE"} />
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "所有配置、供应商连接、路由策略与用量日志均在本地 SQLite 数据库独立存储与持久化，支持热备份与一键恢复。",
                  "All configurations, connections, combos, and call logs are locally stored and persisted in SQLite."
                )}
              </Text>
            </div>
          </Flex>

          <Space wrap>
            <Button
              type="primary"
              icon={<MaterialIcon name="backup" size={16} />}
              loading={backupMutation.isPending}
              onClick={() => backupMutation.mutate()}
            >
              {tt("立即创建热备份", "Create Backup Now")}
            </Button>
            <Button
              icon={<MaterialIcon name="download" size={16} />}
              onClick={handleExportJson}
            >
              {tt("导出配置 JSON", "Export Config")}
            </Button>
            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              loading={refreshStatsMutation.isPending}
              onClick={() => refreshStatsMutation.mutate()}
            >
              {tt("刷新统计", "Refresh Stats")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Top Overview Metric Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} size="small">
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("数据库文件路径", "Database File Path")}
              </Text>
              <Text strong style={{ fontSize: 13, wordBreak: "break-all" }}>
                {health?.dbPath || "~/.omniroute/storage.sqlite"}
              </Text>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} size="small">
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("数据库占用体积", "Database Size")}
              </Text>
              <Title level={3} style={{ margin: 0, color: "#3b82f6" }}>
                {formatBytes(health?.sizeBytes || stats.dbFileSize || 0)}
              </Title>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} size="small">
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("历史快照备份数", "Backup Count")}
              </Text>
              <Title level={3} style={{ margin: 0 }}>
                {health?.backupCount ?? backups.length}
              </Title>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} size="small">
            <Flex vertical gap={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("最近一次备份", "Last Backup Time")}
              </Text>
              <Text strong style={{ fontSize: 13, marginTop: 4 }}>
                {health?.lastBackupAt
                  ? new Date(health.lastBackupAt).toLocaleString()
                  : tt("暂无备份记录", "No backups yet")}
              </Text>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* 3. Sub-Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "backups",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="inventory_2" size={16} />
                <span>{tt("数据备份与迁移", "Backups & Migration")}</span>
              </Flex>
            ),
            children: tabBackups,
          },
          {
            key: "policies",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="tune" size={16} />
                <span>{tt("存储策略与性能调优", "Storage Policies & Tuning")}</span>
              </Flex>
            ),
            children: tabPolicies,
          },
          {
            key: "maintenance",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="build" size={16} />
                <span>{tt("表明细与系统运维", "Tables & Maintenance")}</span>
              </Flex>
            ),
            children: tabMaintenance,
          },
        ]}
      />

      {/* Restore Confirmation Modal */}
      <Modal
        title={tt("确认还原数据库快照？", "Confirm Database Restore")}
        open={Boolean(restoreTarget)}
        onCancel={() => setRestoreTarget(null)}
        onOk={() => restoreTarget && restoreMutation.mutate(restoreTarget)}
        confirmLoading={restoreMutation.isPending}
        okText={tt("确认还原并覆盖当前数据库", "Confirm Restore")}
        okButtonProps={{ danger: true }}
        cancelText={tt("取消", "Cancel")}
      >
        <Flex vertical gap={12} style={{ marginTop: 12 }}>
          <Text type="danger" strong>
            {tt(
              "警告：还原操作将使用快照覆盖当前 SQLite 数据库！在还原前网关会自动对当前状态进行一次预还原热备份。",
              "Warning: Restoring will overwrite the current SQLite database with this snapshot. An automated pre-restore backup will be created."
            )}
          </Text>
          <div
            style={{
              padding: "8px 12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            {restoreTarget}
          </div>
        </Flex>
      </Modal>

      {/* Reset Usage History Modal */}
      <Modal
        title={tt("重置用量与请求统计数据", "Reset Usage & Request History")}
        open={resetUsageOpen}
        onCancel={() => setResetUsageOpen(false)}
        onOk={() => resetUsageMutation.mutate(resetPeriod)}
        confirmLoading={resetUsageMutation.isPending}
        okText={tt("确认重置", "Confirm Reset")}
        okButtonProps={{ danger: true }}
        cancelText={tt("取消", "Cancel")}
      >
        <Flex vertical gap={12} style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {tt(
              "选择清除多长时间之前的用量统计、请求日志与分析数据。模型提供商配置、API 密钥与网关设置均不受影响。",
              "Select how far back you want to delete usage and call logs. Providers, combos, keys, and settings are preserved."
            )}
          </Text>

          <Select
            value={resetPeriod}
            onChange={setResetPeriod}
            style={{ width: "100%" }}
            options={[
              { label: tt("最近 5 分钟 (5 Minutes)", "Last 5 Minutes"), value: "5m" },
              { label: tt("最近 1 小时 (1 Hour)", "Last 1 Hour"), value: "1h" },
              { label: tt("最近 3 小时 (3 Hours)", "Last 3 Hours"), value: "3h" },
              { label: tt("最近 6 小时 (6 Hours)", "Last 6 Hours"), value: "6h" },
              { label: tt("最近 12 小时 (12 Hours)", "Last 12 Hours"), value: "12h" },
              { label: tt("最近 1 天 (1 Day)", "Last 1 Day"), value: "1d" },
              { label: tt("最近 7 天 (7 Days)", "Last 7 Days"), value: "7d" },
              { label: tt("最近 30 天 (30 Days)", "Last 30 Days"), value: "30d" },
              { label: tt("全部历史用量 (All Time - 完全清空)", "All Time"), value: "all" },
            ]}
          />
        </Flex>
      </Modal>
    </div>
  );
}

export default SettingsGeneralPage;
