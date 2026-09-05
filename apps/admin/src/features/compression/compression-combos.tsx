import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  contextCombosApi,
  compressionApi,
  combosApi,
  COMPRESSION_ENGINE_CATALOG,
  type CompressionComboItem,
} from "@/entities/api";
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
  pipelinePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: 6,
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${token.colorBorderSecondary}`,
    fontSize: 12,
  },
  activeHubBox: {
    padding: "14px 18px",
    borderRadius: 10,
    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)",
    border: "1px solid rgba(99, 102, 241, 0.25)",
  },
}));

export function CompressionCombosPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Queries
  const combosQuery = useQuery({
    queryKey: ["context-combos"],
    queryFn: () => contextCombosApi.getCombos(),
  });

  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const languagePacksQuery = useQuery({
    queryKey: ["compression-language-packs"],
    queryFn: () => contextCombosApi.getLanguagePacks(),
  });

  const routingCombosQuery = useQuery({
    queryKey: ["routing-combos-list"],
    queryFn: () => combosApi.list(),
  });

  // Editor Modal State
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<CompressionComboItem | null>(null);
  const [form] = Form.useForm();
  const [pipelineSteps, setPipelineSteps] = useState<Array<{ engine: string; intensity?: string }>>([]);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningCombo, setAssigningCombo] = useState<CompressionComboItem | null>(null);
  const [selectedRoutingComboIds, setSelectedRoutingComboIds] = useState<string[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Mutations
  const saveComboMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload: Partial<CompressionComboItem> = {
        name: values.name,
        description: values.description,
        pipeline: pipelineSteps,
        languagePacks: values.languagePacks,
        outputMode: Boolean(values.outputMode),
        outputModeIntensity: values.outputModeIntensity || "full",
        isDefault: Boolean(values.isDefault),
      };
      if (editingCombo?.id) {
        return contextCombosApi.updateCombo(editingCombo.id, payload);
      }
      return contextCombosApi.createCombo(payload);
    },
    onSuccess: () => {
      messageApi.success("压缩流水线组合已保存");
      setEditorModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["context-combos"] });
    },
    onError: () => messageApi.error("保存压缩组合失败"),
  });

  const deleteComboMutation = useMutation({
    mutationFn: (id: string) => contextCombosApi.deleteCombo(id),
    onSuccess: () => {
      messageApi.success("压缩组合已删除");
      void queryClient.invalidateQueries({ queryKey: ["context-combos"] });
    },
    onError: () => messageApi.error("删除失败"),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => contextCombosApi.setDefaultCombo(id),
    onSuccess: () => {
      messageApi.success("已切换系统默认压缩组合");
      void queryClient.invalidateQueries({ queryKey: ["context-combos"] });
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("切换默认组合失败"),
  });

  if (combosQuery.isLoading || configQuery.isLoading) {
    return <PageSkeleton />;
  }

  const combos = combosQuery.data ?? [];
  const activeConfig = configQuery.data;
  const activeCombo = combos.find((c) => c.isDefault || c.id === activeConfig?.activeComboId) || combos[0];

  const handleOpenCreate = () => {
    setEditingCombo(null);
    setPipelineSteps([
      { engine: "session-dedup" },
      { engine: "lite" },
      { engine: "rtk", intensity: "standard" },
    ]);
    form.setFieldsValue({
      name: "",
      description: "",
      languagePacks: ["en", "zh"],
      outputMode: true,
      outputModeIntensity: "full",
      isDefault: false,
    });
    setEditorModalOpen(true);
  };

  const handleOpenEdit = (record: CompressionComboItem) => {
    setEditingCombo(record);
    setPipelineSteps(record.pipeline && record.pipeline.length > 0 ? record.pipeline : [{ engine: "lite" }]);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      languagePacks: record.languagePacks || ["en"],
      outputMode: record.outputMode,
      outputModeIntensity: record.outputModeIntensity || "full",
      isDefault: record.isDefault,
    });
    setEditorModalOpen(true);
  };

  const handleOpenAssignments = async (record: CompressionComboItem) => {
    setAssigningCombo(record);
    setAssignModalOpen(true);
    const ids = await contextCombosApi.getComboAssignments(record.id);
    setSelectedRoutingComboIds(ids);
  };

  const handleSaveAssignments = async () => {
    if (!assigningCombo) return;
    setSavingAssignments(true);
    try {
      await contextCombosApi.saveComboAssignments(assigningCombo.id, selectedRoutingComboIds);
      messageApi.success("路由模型组合关联关系已更新");
      setAssignModalOpen(false);
    } catch {
      messageApi.error("保存路由关联失败");
    } finally {
      setSavingAssignments(false);
    }
  };

  // Pipeline builder actions
  const handleAddStep = (engineId: string) => {
    const meta = COMPRESSION_ENGINE_CATALOG[engineId];
    const initialIntensity = meta?.levels ? meta.levels[0] : undefined;
    setPipelineSteps([...pipelineSteps, { engine: engineId, intensity: initialIntensity }]);
  };

  const handleRemoveStep = (index: number) => {
    setPipelineSteps(pipelineSteps.filter((_, idx) => idx !== index));
  };

  const handleStepIntensityChange = (index: number, intensity: string) => {
    const updated = [...pipelineSteps];
    updated[index] = { ...updated[index], intensity };
    setPipelineSteps(updated);
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
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="hub" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  压缩算子组合流水线
                </Title>
                <Tag color="purple">流水线编排引擎</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                将多个压缩引擎按流水线顺序自由串联，绑定不同的路由网关组合，为各类业务场景提供量身定制的加速与上下文压缩策略。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            onClick={handleOpenCreate}
          >
            新建压缩组合
          </Button>
        </Flex>
      </Card>

      {/* 2. Active Compression Hub Preview */}
      {activeCombo && (
        <div className={styles.activeHubBox}>
          <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 12 }}>
            <Flex align="center" gap={10}>
              <MaterialIcon name="bolt" size={20} style={{ color: "#6366f1" }} />
              <div>
                <Flex align="center" gap={8}>
                  <Text strong style={{ fontSize: 15 }}>当前生效系统默认组合：{activeCombo.name}</Text>
                  <Tag color="success">默认激活 (Active Default)</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>{activeCombo.description}</Text>
              </div>
            </Flex>

            <Space size={8}>
              <Button
                size="small"
                onClick={() => handleOpenAssignments(activeCombo)}
                icon={<MaterialIcon name="link" size={14} />}
              >
                关联路由模型
              </Button>
              <Button
                size="small"
                onClick={() => handleOpenEdit(activeCombo)}
                icon={<MaterialIcon name="edit" size={14} />}
              >
                编辑流水线
              </Button>
            </Space>
          </Flex>

          {/* Pipeline flow tags */}
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>
              流水线执行流序 (Pipeline Flow)：
            </Text>
            <Flex align="center" gap={8} wrap>
              {(activeCombo?.pipeline || []).map((step, idx) => {
                const meta = COMPRESSION_ENGINE_CATALOG[step.engine];
                return (
                  <Flex key={idx} align="center" gap={6}>
                    <div className={styles.pipelinePill}>
                      <Badge status="processing" />
                      <Text strong style={{ color: "#818cf8" }}>{meta?.label || step.engine}</Text>
                      {step.intensity && (
                        <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>{step.intensity.toUpperCase()}</Tag>
                      )}
                    </div>
                    {idx < (activeCombo?.pipeline?.length ?? 0) - 1 && (
                      <MaterialIcon name="arrow_forward" size={14} style={{ color: "rgba(255,255,255,0.3)" }} />
                    )}
                  </Flex>
                );
              })}

              <Tag color="cyan" style={{ marginLeft: 8 }}>
                语言包: {(activeCombo.languagePacks || ["en", "zh"]).join(", ").toUpperCase()}
              </Tag>
              {activeCombo.outputMode && (
                <Tag color="orange">Caveman 输出精炼 ({activeCombo.outputModeIntensity})</Tag>
              )}
            </Flex>
          </div>
        </div>
      )}

      {/* 3. Compression Combos Table / Manager */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="layers" size={18} />
              <span>所有预置与自定义压缩组合 ({combos.length})</span>
            </Flex>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Table<CompressionComboItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={combos}
          columns={[
            {
              title: "组合名称与说明",
              key: "name",
              width: 240,
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong style={{ fontSize: 13 }}>{record.name}</Text>
                    {record.isDefault && <Tag color="green">默认</Tag>}
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                    {record.description || "无描述"}
                  </div>
                </div>
              ),
            },
            {
              title: tt("压缩流水线", "Pipeline Steps"),
              key: "pipeline",
              render: (_, record) => (
                <Flex align="center" gap={6} wrap>
                  {(record.pipeline || []).map((step, idx) => {
                    const meta = COMPRESSION_ENGINE_CATALOG[step.engine];
                    return (
                      <span key={idx} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
                          {meta?.label.split(" ")[0] || step.engine}
                          {step.intensity ? ` (${step.intensity})` : ""}
                        </Tag>
                        {idx < record.pipeline.length - 1 && (
                          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>→</span>
                        )}
                      </span>
                    );
                  })}
                </Flex>
              ),
            },
            {
              title: "覆盖语言包",
              key: "lang",
              width: 140,
              render: (_, record) => (
                <Flex gap={4} wrap>
                  {(record.languagePacks || ["en"]).map((l) => (
                    <Tag key={l} color="cyan" style={{ margin: 0, fontSize: 10 }}>{l.toUpperCase()}</Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: "输出精炼",
              key: "outputMode",
              width: 110,
              render: (_, record) => (
                record.outputMode ? (
                  <Tag color="orange">{record.outputModeIntensity || "full"}</Tag>
                ) : (
                  <Tag color="default">关闭</Tag>
                )
              ),
            },
            {
              title: "操作",
              key: "actions",
              width: 240,
              render: (_, record) => (
                <Space size={6}>
                  {!record.isDefault && (
                    <Button
                      size="small"
                      onClick={() => setDefaultMutation.mutate(record.id)}
                    >
                      设为默认
                    </Button>
                  )}
                  <Button
                    size="small"
                    icon={<MaterialIcon name="link" size={14} />}
                    onClick={() => handleOpenAssignments(record)}
                  >
                    关联路由
                  </Button>
                  <Button
                    size="small"
                    icon={<MaterialIcon name="edit" size={14} />}
                    onClick={() => handleOpenEdit(record)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定要删除此压缩组合吗？"
                    onConfirm={() => deleteComboMutation.mutate(record.id)}
                    okText="删除"
                    cancelText="取消"
                  >
                    <Button size="small" danger type="text" icon={<MaterialIcon name="delete" size={14} />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* 4. Edit / Create Compression Combo Modal */}
      <Modal
        title={editingCombo ? "编辑压缩流水线组合" : "创建新压缩流水线组合"}
        open={editorModalOpen}
        onOk={() => form.submit()}
        confirmLoading={saveComboMutation.isPending}
        onCancel={() => setEditorModalOpen(false)}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={(vals) => saveComboMutation.mutate(vals)} style={{ marginTop: 12 }}>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="name" label="组合名称" rules={[{ required: true, message: "请输入组合名称" }]}>
                <Input placeholder="例如：超长上下文代码优化组合" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isDefault" valuePropName="checked" label="系统默认">
                <Switch checkedChildren="默认生效" unCheckedChildren="手动指定" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述与适用场景">
            <Input.TextArea rows={2} placeholder="简要说明该压缩组合的优化侧重点与适用模型..." />
          </Form.Item>

          {/* Pipeline Steps Builder */}
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ant-color-border-secondary)" }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13 }}>流水线算子串联配置 (Pipeline Steps)</Text>
              <Select
                placeholder="+ 添加算子步骤"
                size="small"
                style={{ width: 180 }}
                value={undefined}
                onChange={handleAddStep}
                options={Object.values(COMPRESSION_ENGINE_CATALOG).map((m) => ({
                  label: m.label,
                  value: m.id,
                }))}
              />
            </Flex>

            {pipelineSteps.length === 0 ? (
              <Empty description="暂无算子，请点击上方添加" style={{ padding: "8px 0" }} />
            ) : (
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                {pipelineSteps.map((step, idx) => {
                  const meta = COMPRESSION_ENGINE_CATALOG[step.engine];
                  return (
                    <Flex key={idx} justify="space-between" align="center" style={{ padding: "6px 10px", background: "rgba(0,0,0,0.2)", borderRadius: 6, border: "1px solid var(--ant-color-border-secondary)" }}>
                      <Flex align="center" gap={8}>
                        <Tag style={{ margin: 0, fontFamily: "monospace" }}>#{idx + 1}</Tag>
                        <Text strong>{meta?.label || step.engine}</Text>
                        {!meta?.guidance.lossy && <Tag color="green" style={{ margin: 0, fontSize: 10 }}>无损</Tag>}
                      </Flex>

                      <Flex align="center" gap={8}>
                        {meta?.levels && (
                          <Select
                            size="small"
                            style={{ width: 110 }}
                            value={step.intensity || meta.levels[0]}
                            onChange={(val) => handleStepIntensityChange(idx, val)}
                            options={meta.levels.map((lvl) => ({
                              label: lvl.toUpperCase(),
                              value: lvl,
                            }))}
                          />
                        )}
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<MaterialIcon name="close" size={14} />}
                          onClick={() => handleRemoveStep(idx)}
                        />
                      </Flex>
                    </Flex>
                  );
                })}
              </Space>
            )}
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="languagePacks" label="支持语言规则包">
                <Select
                  mode="multiple"
                  placeholder="选择语言包"
                  options={(languagePacksQuery.data ?? []).map((p) => ({
                    label: `${p.label || p.language.toUpperCase()} (${p.ruleCount} 规则)`,
                    value: p.language,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="outputMode" valuePropName="checked" label="Caveman 输出精简">
                <Switch checkedChildren="开启" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item noStyle dependencies={["outputMode"]}>
            {({ getFieldValue }) =>
              getFieldValue("outputMode") && (
                <Form.Item name="outputModeIntensity" label="输出精炼强度">
                  <Radio.Group>
                    <Radio.Button value="lite">轻度 (Lite)</Radio.Button>
                    <Radio.Button value="full">标准 (Full)</Radio.Button>
                    <Radio.Button value="ultra">极限 (Ultra)</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* 5. Routing Combos Assignment Modal */}
      <Modal
        title={`关联网关路由组合 — ${assigningCombo?.name || ""}`}
        open={assignModalOpen}
        onOk={handleSaveAssignments}
        confirmLoading={savingAssignments}
        onCancel={() => setAssignModalOpen(false)}
        width={580}
      >
        <div style={{ marginTop: 12 }}>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            {tt(
              "选择将此压缩流水线绑定至哪些网关路由组合。绑定后，请求这些模型组合时将自动借由该流水线进行前置 Token 压缩：",
              "Select which routing combos to bind to this compression pipeline. Requests to these combos will automatically perform token compression:"
            )}
          </Paragraph>

          <Checkbox.Group
            value={selectedRoutingComboIds}
            onChange={(checkedValues) => setSelectedRoutingComboIds(checkedValues as string[])}
            style={{ width: "100%" }}
          >
            <Space orientation="vertical" size={8} style={{ width: "100%" }}>
              {(routingCombosQuery.data?.combos ?? []).map((rc: any) => (
                <div
                  key={rc.id}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 6,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--ant-color-border-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Checkbox value={rc.id}>
                    <Text strong>{rc.name}</Text>
                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>ID: {rc.id}</div>
                  </Checkbox>
                  {selectedRoutingComboIds.includes(rc.id) && (
                    <Tag color="blue" style={{ margin: 0 }}>已绑定</Tag>
                  )}
                </div>
              ))}
              {!routingCombosQuery.isLoading && (routingCombosQuery.data?.combos ?? []).length === 0 && (
                <Empty description="暂无可关联的网关路由组合" />
              )}
            </Space>
          </Checkbox.Group>
        </div>
      </Modal>
    </div>
  );
}

export default CompressionCombosPage;
