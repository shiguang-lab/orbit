import { useState } from "react";
import {
  Card,
  Input,
  InputNumber,
  Button,
  Select,
  Checkbox,
  Tag,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
  Empty,
  Divider,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { ModelCompatPopover, type ModelCompatData } from "./ModelCompatPopover";

const useStyles = createStyles(({ token }) => ({
  sectionCard: {
    marginBottom: 0,
    borderRadius: token.borderRadiusLG,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: token.colorTextSecondary,
    marginBottom: 16,
  },
  addFormCard: {
    background: token.colorFillAlter,
    borderRadius: token.borderRadius,
    padding: 16,
    marginBottom: 20,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  formItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: token.colorTextSecondary,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  modelsList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  modelItem: {
    display: "flex",
    flexDirection: "column",
    padding: "12px 16px",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
    },
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  modelInfo: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
    flex: "1 1 auto",
  },
  modelActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: "0 0 auto",
  },
  inlineEditor: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px dashed ${token.colorBorderSecondary}`,
  },
}));

export interface CustomModelItem {
  id: string;
  name?: string;
  apiFormat?: string;
  targetFormat?: string;
  supportedEndpoints?: string[];
  supportsVision?: boolean;
  isFree?: boolean;
  contextWindowOverride?: number;
  isHidden?: boolean;
  isOverride?: boolean;
  compat?: ModelCompatData;
}

interface Props {
  providerId: string;
  providerDisplayAlias: string;
  customModels: CustomModelItem[];
  onAddCustomModel: (model: {
    provider: string;
    modelId: string;
    modelName?: string;
    apiFormat?: string;
    targetFormat?: string;
    supportedEndpoints?: string[];
    supportsVision?: boolean;
    isFree?: boolean;
  }) => Promise<void>;
  onUpdateCustomModel: (model: {
    provider: string;
    modelId: string;
    modelName?: string;
    apiFormat?: string;
    targetFormat?: string;
    supportedEndpoints?: string[];
    supportsVision?: boolean;
    isFree?: boolean;
    contextWindowOverride?: number | null;
  }) => Promise<void>;
  onRemoveCustomModel: (modelId: string, resetOverride?: boolean) => Promise<void>;
  onToggleModelHidden: (modelId: string, hidden: boolean) => Promise<void>;
  onSaveModelCompat: (modelId: string, patch: ModelCompatData) => Promise<void>;
}

const API_FORMAT_OPTIONS = [
  { label: "Chat Completions (OpenAI 聊天)", value: "chat-completions" },
  { label: "OpenAI Responses (响应格式)", value: "responses" },
  { label: "Embeddings (向量嵌入)", value: "embeddings" },
  { label: "Rerank (文本重排)", value: "rerank" },
  { label: "Audio Speech (语音合成 TTS)", value: "audio-speech" },
  { label: "Audio Transcriptions (语音转写 STT)", value: "audio-transcriptions" },
  { label: "Images Generations (图像生成)", value: "images-generations" },
  { label: "Video (视频生成)", value: "video" },
];

const TARGET_FORMAT_OPTIONS = [
  { label: "默认 (自动)", value: "" },
  { label: "OpenAI", value: "openai" },
  { label: "OpenAI Responses", value: "openai-responses" },
  { label: "Claude", value: "claude" },
  { label: "Gemini", value: "gemini" },
  { label: "Antigravity", value: "antigravity" },
];

const ENDPOINT_OPTIONS = [
  { label: "💬 聊天", value: "chat" },
  { label: "📐 向量", value: "embeddings" },
  { label: "🎯 Rerank", value: "rerank" },
  { label: "🖼️ 图像", value: "images" },
  { label: "🎬 视频", value: "videos" },
  { label: "🔊 语音合成", value: "audio-speech" },
  { label: "🎙️ 语音转写", value: "audio-transcriptions" },
];

export function CustomModelsSection({
  providerId,
  providerDisplayAlias,
  customModels,
  onAddCustomModel,
  onUpdateCustomModel,
  onRemoveCustomModel,
  onToggleModelHidden,
  onSaveModelCompat,
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  // Add form state
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [newApiFormat, setNewApiFormat] = useState("chat-completions");
  const [newTargetFormat, setNewTargetFormat] = useState("");
  const [newEndpoints, setNewEndpoints] = useState<string[]>(["chat"]);
  const [newVision, setNewVision] = useState(false);
  const [newFree, setNewFree] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Edit state (single item editing at a time)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editApiFormat, setEditApiFormat] = useState("chat-completions");
  const [editTargetFormat, setEditTargetFormat] = useState("");
  const [editEndpoints, setEditEndpoints] = useState<string[]>([]);
  const [editVision, setEditVision] = useState(false);
  const [editFree, setEditFree] = useState(false);
  const [editContextWindow, setEditContextWindow] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleAdd = async () => {
    const trimmedId = newModelId.trim();
    if (!trimmedId) {
      message.error(t("providers.modelIdRequired", "请输入模型 ID"));
      return;
    }
    setIsAdding(true);
    try {
      await onAddCustomModel({
        provider: providerId,
        modelId: trimmedId,
        modelName: newModelName.trim() || undefined,
        apiFormat: newApiFormat,
        targetFormat: newTargetFormat || undefined,
        supportedEndpoints: newEndpoints,
        supportsVision: newVision,
        isFree: newFree,
      });
      message.success(t("providers.modelAddedSuccess", `模型 ${trimmedId} 添加成功`));
      setNewModelId("");
      setNewModelName("");
      setNewApiFormat("chat-completions");
      setNewTargetFormat("");
      setNewEndpoints(["chat"]);
      setNewVision(false);
      setNewFree(false);
    } catch {
      message.error(t("providers.failedSaveCustomModel", "添加模型失败"));
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (model: CustomModelItem) => {
    setEditingId(model.id);
    setEditName(model.name || "");
    setEditApiFormat(model.apiFormat || "chat-completions");
    setEditTargetFormat(model.targetFormat || "");
    setEditEndpoints(model.supportedEndpoints || ["chat"]);
    setEditVision(Boolean(model.supportsVision));
    setEditFree(Boolean(model.isFree));
    setEditContextWindow(model.contextWindowOverride ?? null);
  };

  const handleSaveEdit = async (modelId: string) => {
    setIsSavingEdit(true);
    try {
      await onUpdateCustomModel({
        provider: providerId,
        modelId,
        modelName: editName.trim() || undefined,
        apiFormat: editApiFormat,
        targetFormat: editTargetFormat || undefined,
        supportedEndpoints: editEndpoints,
        supportsVision: editVision,
        isFree: editFree,
        contextWindowOverride: editContextWindow,
      });
      message.success(t("providers.paramFiltersSaveSuccess", "自定义模型已更新"));
      setEditingId(null);
    } catch {
      message.error(t("providers.failedSaveCustomModel", "更新自定义模型失败"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <Card className={styles.sectionCard}>
      <div className={styles.headerRow}>
        <div className={styles.headerTitle}>
          <MaterialIcon name="tune" size={20} />
          <span>{t("providers.customModels", "自定义模型")}</span>
          <Tag color="default" style={{ fontWeight: 500 }}>
            {customModels.length}
          </Tag>
        </div>
      </div>

      <div className={styles.hintText}>
        {t("providers.customModelsHint", "添加默认列表中没有的模型 ID，这些模型也能参与路由，或覆盖上游模型配置。")}
      </div>

      {/* Add Custom Model Form */}
      <div className={styles.addFormCard}>
        <div className={styles.formGrid}>
          <div className={styles.formItem}>
            <span className={styles.formLabel}>* {t("providers.modelId", "模型 ID")}</span>
            <Input
              placeholder={t("providers.customModelPlaceholder", "例如：gpt-4.5-turbo")}
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
            />
          </div>

          <div className={styles.formItem}>
            <span className={styles.formLabel}>{t("providers.modelName", "显示名称 (可选)")}</span>
            <Input
              placeholder="例如：GPT 4.5 Turbo"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
            />
          </div>

          <div className={styles.formItem}>
            <span className={styles.formLabel}>{t("providers.apiFormat", "API 格式")}</span>
            <Select
              value={newApiFormat}
              onChange={setNewApiFormat}
              options={API_FORMAT_OPTIONS}
            />
          </div>

          <div className={styles.formItem}>
            <span className={styles.formLabel}>{t("providers.targetFormatLabel", "目标格式")}</span>
            <Select
              value={newTargetFormat}
              onChange={setNewTargetFormat}
              options={TARGET_FORMAT_OPTIONS}
            />
          </div>
        </div>

        <div className={styles.checkboxRow}>
          <Checkbox.Group
            options={ENDPOINT_OPTIONS}
            value={newEndpoints}
            onChange={(v) => setNewEndpoints(v as string[])}
          />

          <Divider type="vertical" style={{ height: 16 }} />

          <Checkbox checked={newVision} onChange={(e) => setNewVision(e.target.checked)}>
            {t("providers.visionCapableLabel", "👁️ 支持视觉")}
          </Checkbox>

          <Checkbox checked={newFree} onChange={(e) => setNewFree(e.target.checked)}>
            <Tag color="success" bordered={false}>
              {t("providers.free", "免费")}
            </Tag>
          </Checkbox>
        </div>

        <Button
          type="primary"
          loading={isAdding}
          icon={<MaterialIcon name="add" size={16} />}
          onClick={handleAdd}
        >
          {t("providers.addCustomModel", "添加模型")}
        </Button>
      </div>

      {/* Custom Models List */}
      {customModels.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("providers.noCustomModels", "尚未添加自定义模型。")}
        />
      ) : (
        <div className={styles.modelsList}>
          {customModels.map((model) => {
            const isEditing = editingId === model.id;
            const fullModelName = `${providerDisplayAlias}/${model.id}`;

            // Badges
            const isResponses = model.apiFormat === "responses";
            const targetFormat = model.targetFormat;
            const contextWindow = model.contextWindowOverride;
            const isVision = model.supportsVision;
            const isFree = model.isFree;
            const hasNormalize = Boolean(model.compat?.normalizeToolCallId);
            const hasPreserveDev = Boolean(model.compat?.preserveOpenAIDeveloperRole);
            const hasHeaders = Boolean(
              model.compat?.upstreamHeaders && Object.keys(model.compat.upstreamHeaders).length > 0
            );

            return (
              <div key={model.id} className={styles.modelItem}>
                <div className={styles.itemRow}>
                  {/* Left Info */}
                  <div className={styles.modelInfo}>
                    <MaterialIcon name="tune" size={18} style={{ color: "var(--ant-color-primary)" }} />

                    <Typography.Text code copyable={{ text: fullModelName }}>
                      {model.id}
                    </Typography.Text>

                    {model.name && model.name !== model.id && (
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {model.name}
                      </Typography.Text>
                    )}

                    {model.isOverride && (
                      <Tag color="orange" bordered={false}>
                        {t("providers.overridesUpstream", "覆盖上游")}
                      </Tag>
                    )}

                    {isResponses && (
                      <Tag color="purple" bordered={false}>
                        Responses
                      </Tag>
                    )}

                    {targetFormat && (
                      <Tag color="blue" bordered={false}>
                        → {targetFormat}
                      </Tag>
                    )}

                    {contextWindow ? (
                      <Tag bordered={false}>
                        🪟 {contextWindow.toLocaleString()}
                      </Tag>
                    ) : null}

                    {isVision && (
                      <Tag color="cyan" bordered={false}>
                        👁️ 视觉
                      </Tag>
                    )}

                    {isFree && (
                      <Tag color="success" bordered={false} style={{ fontWeight: 600 }}>
                        {t("providers.free", "免费")}
                      </Tag>
                    )}

                    {/* Endpoint Tags */}
                    {(model.supportedEndpoints || []).map((ep) => {
                      if (ep === "chat") return null;
                      return (
                        <Tag key={ep} bordered={false} style={{ fontSize: 11 }}>
                          {ep}
                        </Tag>
                      );
                    })}

                    {/* Compat Badges */}
                    {hasNormalize && (
                      <Tag color="geekblue" bordered={false}>
                        ID×9
                      </Tag>
                    )}
                    {hasPreserveDev && (
                      <Tag color="volcano" bordered={false}>
                        {t("providers.compatBadgeNoPreserve", "不保留")}
                      </Tag>
                    )}
                    {hasHeaders && (
                      <Tag color="cyan" bordered={false}>
                        {t("providers.compatBadgeUpstreamHeaders", "请求头")}
                      </Tag>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className={styles.modelActions}>
                    <Button
                      size="small"
                      type="text"
                      icon={<MaterialIcon name="edit" size={16} />}
                      onClick={() => (isEditing ? setEditingId(null) : handleStartEdit(model))}
                      title={t("common.edit", "编辑")}
                    />

                    <ModelCompatPopover
                      modelId={model.id}
                      compat={model.compat}
                      onSave={(patch) => onSaveModelCompat(model.id, patch)}
                    />

                    <Tooltip
                      title={
                        model.isHidden
                          ? t("providers.enableModel", "取消隐藏此模型")
                          : t("providers.hideModel", "隐藏此模型")
                      }
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={
                          <MaterialIcon
                            name={model.isHidden ? "visibility_off" : "visibility"}
                            size={18}
                            style={{ color: model.isHidden ? "#bbb" : undefined }}
                          />
                        }
                        onClick={() => onToggleModelHidden(model.id, !model.isHidden)}
                      />
                    </Tooltip>

                    {model.isOverride ? (
                      <Popconfirm
                        title={t("providers.resetOverrideConfirm", "重置此模型配置为上游默认？")}
                        onConfirm={() => onRemoveCustomModel(model.id, true)}
                        okText={t("common.confirm", "确定")}
                        cancelText={t("common.cancel", "取消")}
                      >
                        <Button
                          size="small"
                          type="text"
                          icon={<MaterialIcon name="restart_alt" size={16} />}
                          title={t("providers.resetToUpstream", "恢复上游默认")}
                        />
                      </Popconfirm>
                    ) : (
                      <Popconfirm
                        title={t("providers.deleteModelConfirm", "确定删除此自定义模型？")}
                        onConfirm={() => onRemoveCustomModel(model.id, false)}
                        okText={t("common.confirm", "确定")}
                        cancelText={t("common.cancel", "取消")}
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<MaterialIcon name="delete" size={16} />}
                          title={t("common.delete", "删除")}
                        />
                      </Popconfirm>
                    )}
                  </div>
                </div>

                {/* Inline Edit Expansion */}
                {isEditing && (
                  <div className={styles.inlineEditor}>
                    <div className={styles.formGrid}>
                      <div className={styles.formItem}>
                        <span className={styles.formLabel}>{t("providers.modelName", "显示名称")}</span>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                        />
                      </div>

                      <div className={styles.formItem}>
                        <span className={styles.formLabel}>{t("providers.apiFormat", "API 格式")}</span>
                        <Select
                          value={editApiFormat}
                          onChange={setEditApiFormat}
                          options={API_FORMAT_OPTIONS}
                        />
                      </div>

                      <div className={styles.formItem}>
                        <span className={styles.formLabel}>{t("providers.targetFormatLabel", "目标格式")}</span>
                        <Select
                          value={editTargetFormat}
                          onChange={setEditTargetFormat}
                          options={TARGET_FORMAT_OPTIONS}
                        />
                      </div>

                      <div className={styles.formItem}>
                        <span className={styles.formLabel}>
                          {t("providers.contextWindowOverrideLabel", "上下文窗口 (Token)")}
                        </span>
                        <InputNumber
                          style={{ width: "100%" }}
                          placeholder="例如：131072"
                          value={editContextWindow}
                          onChange={(v) => setEditContextWindow(v)}
                        />
                      </div>
                    </div>

                    <div className={styles.checkboxRow}>
                      <Checkbox.Group
                        options={ENDPOINT_OPTIONS}
                        value={editEndpoints}
                        onChange={(v) => setEditEndpoints(v as string[])}
                      />

                      <Divider type="vertical" style={{ height: 16 }} />

                      <Checkbox checked={editVision} onChange={(e) => setEditVision(e.target.checked)}>
                        {t("providers.visionCapableLabel", "👁️ 支持视觉")}
                      </Checkbox>

                      <Checkbox checked={editFree} onChange={(e) => setEditFree(e.target.checked)}>
                        <Tag color="success" bordered={false}>
                          {t("providers.free", "免费")}
                        </Tag>
                      </Checkbox>
                    </div>

                    <Space style={{ marginTop: 8 }}>
                      <Button onClick={() => setEditingId(null)}>
                        {t("common.cancel", "取消")}
                      </Button>
                      <Button
                        type="primary"
                        loading={isSavingEdit}
                        onClick={() => handleSaveEdit(model.id)}
                      >
                        {t("common.save", "保存修改")}
                      </Button>
                    </Space>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
