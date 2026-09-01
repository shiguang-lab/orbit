import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Radio,
  Row,
  Segmented,
  Select,
  Slider,
  Space,
  Steps,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import {
  ROUTING_STRATEGIES,
  getStrategyDef,
  getStrategyColor,
  validateComboName,
  QUICK_MODEL_PRESETS,
  getStepDisplayName,
  getStepProvider,
  getStepConnection,
} from "./constants";
import type {
  ComboBuilderOptions,
  ComboItem,
  ComboModelStep,
  ComboRefStep,
  ComboProviderWildcardStep,
  ComboStep,
} from "@/entities/api";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const useStyles = createStyles(({ token, css }) => ({
  modalBody: css`
    box-sizing: border-box;
    padding: 20px 24px;
    max-height: calc(86vh - 110px);
    overflow-y: auto;
  `,
  stepsWrapper: css`
    box-sizing: border-box;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillAlter};
    padding: 14px 20px 12px;
    margin-bottom: 24px;
    margin-top: 4px;
  `,
  stepIcon: css`
    display: inline-flex;
    width: 22px;
    height: 22px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
  `,
  stepIconActive: css`
    background: #8b5cf6;
    color: #ffffff;
  `,
  stepIconInactive: css`
    background: rgba(139, 92, 246, 0.12);
    color: #8b5cf6;
  `,
  titleIconWrap: css`
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: rgba(139, 92, 246, 0.12);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  `,
  startingTemplateCard: css`
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1.5px solid ${token.colorBorderSecondary};
    background: ${token.colorFillAlter};
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
    &:hover {
      border-color: #8b5cf6;
    }
  `,
  startingTemplateCardSelected: css`
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1.5px solid #8b5cf6;
    background: rgba(139, 92, 246, 0.06);
    cursor: pointer;
    transition: all 0.2s ease;
    height: 100%;
  `,
  strategyCard: css`
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1.5px solid ${token.colorBorderSecondary};
    background: ${token.colorFillAlter};
    cursor: pointer;
    height: 100%;
    display: flex;
    flex-direction: column;
    justifyContent: space-between;
    transition: all 0.15s ease-in-out;
    &:hover {
      border-color: #8b5cf6;
      transform: translateY(-1px);
    }
  `,
  strategyCardSelected: css`
    box-sizing: border-box;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1.5px solid #8b5cf6;
    background: rgba(139, 92, 246, 0.06);
    cursor: pointer;
    height: 100%;
    display: flex;
    flex-direction: column;
    justifyContent: space-between;
    transition: all 0.15s ease-in-out;
  `,
  guidanceCard: css`
    box-sizing: border-box;
    background: rgba(139, 92, 246, 0.03);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 8px;
    margin-top: 16px;
    margin-bottom: 24px;
  `,
  tuningCard: css`
    box-sizing: border-box;
    background: ${token.colorFillAlter};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    margin-bottom: 20px;
  `,
  advancedPanel: css`
    box-sizing: border-box;
    padding: 16px 18px;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillAlter};
  `,
  builderCard: css`
    box-sizing: border-box;
    background: ${token.colorFillAlter};
    border: 1px solid ${token.colorBorderSecondary};
    margin-bottom: 16px;
    border-radius: 8px;
  `,
  weightTotalBox: css`
    box-sizing: border-box;
    border-radius: 6px;
    padding: 12px 16px;
    background: ${token.colorFillAlter};
    margin-top: 12px;
  `,
  allowlistBox: css`
    box-sizing: border-box;
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  reviewCard: css`
    box-sizing: border-box;
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorFillAlter};
    margin-bottom: 16px;
  `,
  reviewModelItem: css`
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
  `,
  apiSnippetBox: css`
    box-sizing: border-box;
    padding: 12px 16px;
    border-radius: 6px;
    border: 1px solid rgba(139, 92, 246, 0.2);
    background: rgba(139, 92, 246, 0.03);
  `,
  apiSnippetCode: css`
    box-sizing: border-box;
    font-family: monospace;
    font-size: 11px;
    padding: 8px 12px;
    border-radius: 4px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    overflow-x: auto;
  `,
}));

interface ComboModalProps {
  open: boolean;
  combo?: ComboItem | null;
  builderOptions?: ComboBuilderOptions | null;
  onClose: () => void;
  onSave: (data: Partial<ComboItem>) => Promise<void>;
  loading?: boolean;
}

const STARTING_TEMPLATES = [
  {
    key: "free-stack",
    id: "free-stack",
    title: "免费全家桶",
    desc: "在免费提供者之间循环轮询：零成本，永不停歇。",
    strategy: "round-robin",
    suggestedName: "free-stack",
    icon: "volunteer_activism",
    isFeatured: true,
    config: {
      maxRetries: 3,
      retryDelayMs: 500,
    },
    presetModels: [
      "agy/gemini-3.7-flash-low",
      "kr/claude-sonnet-4.5",
      "if/kimi-k2-thinking",
      "if/qwen3-coder-plus",
      "if/deepseek-v3.2",
      "nvidia/llama-3.3-70b-instruct",
      "groq/llama-3.3-70b-versatile",
    ],
  },
  {
    key: "high-availability",
    id: "high-availability",
    title: "高可用",
    desc: "优先级路由，配合健康检查和安全重试。",
    strategy: "priority",
    suggestedName: "high-availability",
    icon: "shield",
    config: {
      maxRetries: 2,
      retryDelayMs: 1500,
    },
  },
  {
    key: "cost-saver",
    id: "cost-saver",
    title: "节省成本",
    desc: "面向预算优先场景的成本优化路由。",
    strategy: "cost-optimized",
    suggestedName: "cost-saver",
    icon: "savings",
    config: {
      maxRetries: 1,
      retryDelayMs: 500,
    },
  },
  {
    key: "balanced",
    id: "balanced",
    title: "均衡负载",
    desc: "使用最少使用策略，随时间均衡需求。",
    strategy: "least-used",
    suggestedName: "balanced-load",
    icon: "balance",
    config: {
      maxRetries: 1,
      retryDelayMs: 1000,
    },
  },
  {
    key: "paid-premium",
    id: "paid-premium",
    title: "付费尊享",
    desc: "在付费订阅提供者之间轮询分发，使用顶尖模型并分散负载。",
    strategy: "round-robin",
    suggestedName: "paid-premium",
    icon: "workspace_premium",
    config: {
      maxRetries: 2,
      retryDelayMs: 1000,
    },
    presetModels: [
      "cu/claude-4.6-opus-high",
      "antigravity/claude-sonnet-4-6",
      "cu/claude-4.6-sonnet-high",
      "antigravity/gemini-pro-agent",
    ],
  },
];

export function ComboModal({
  open,
  combo,
  builderOptions,
  onClose,
  onSave,
  loading = false,
}: ComboModalProps) {
  const { styles } = useStyles();
  const isEdit = Boolean(combo?.id);
  const [configMode, setConfigMode] = useState<"guided" | "expert">("guided");
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);

  // Form states - Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [strategy, setStrategy] = useState("priority");
  const [customOutputModel, setCustomOutputModel] = useState("");
  const [models, setModels] = useState<ComboStep[]>([]);
  const [config, setConfig] = useState<Record<string, unknown>>({});

  // Validation touch states for inline feedback
  const [nameTouched, setNameTouched] = useState(false);
  const [modelsTouched, setModelsTouched] = useState(false);

  // Model addition builder
  const [additionTab, setAdditionTab] = useState<"provider" | "wildcard" | "nested-combo" | "manual">("provider");
  const [addProviderId, setAddProviderId] = useState<string>("");
  const [addModelId, setAddModelId] = useState<string>("");
  const [addConnectionId, setAddConnectionId] = useState<string>("");
  const [addAllowedConnectionIds, setAddAllowedConnectionIds] = useState<string[]>([]);
  const [wildcardProviderId, setWildcardProviderId] = useState<string>("");
  const [wildcardPattern, setWildcardPattern] = useState<string>("*");
  const [nestedComboName, setNestedComboName] = useState<string>("");
  const [manualInput, setManualInput] = useState<string>("");

  // Agent features
  const [systemMessage, setSystemMessage] = useState("");
  const [toolFilterRegex, setToolFilterRegex] = useState("");
  const [contextCacheProtection, setContextCacheProtection] = useState(false);
  const [contextLength, setContextLength] = useState<number | undefined>(undefined);

  // Response validation
  const [forbiddenSubstrings, setForbiddenSubstrings] = useState<string>("");
  const [requiredSubstrings, setRequiredSubstrings] = useState<string>("");
  const [minContentLength, setMinContentLength] = useState<number | undefined>(undefined);
  const [streamTimeoutMs, setStreamTimeoutMs] = useState<number | undefined>(undefined);
  const [totalTimeoutMs, setTotalTimeoutMs] = useState<number | undefined>(undefined);

  // Advanced resilience & retry controls
  const [targetTimeoutSeconds, setTargetTimeoutSeconds] = useState<number | undefined>(undefined);
  const [failoverBeforeRetry, setFailoverBeforeRetry] = useState<boolean>(false);
  const [maxSetRetries, setMaxSetRetries] = useState<number | undefined>(undefined);
  const [setRetryDelayMs, setSetRetryDelayMs] = useState<number | undefined>(undefined);
  const [reasoningTransportFallback, setReasoningTransportFallback] = useState<"skip" | "drop" | "default">("default");
  const [disableSessionStickiness, setDisableSessionStickiness] = useState<"inherit" | "enabled" | "disabled">("inherit");
  const [nestedComboMode, setNestedComboMode] = useState<"flatten" | "execute">("flatten");

  // Step drag reordering
  const [stepDragIndex, setStepDragIndex] = useState<number | null>(null);
  const [stepDragOverIndex, setStepDragOverIndex] = useState<number | null>(null);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (!open) return;
    if (combo) {
      setName(combo.name || "");
      setDescription(combo.description || "");
      setStrategy(combo.strategy || "priority");
      setCustomOutputModel((combo.custom_output_model as string) || "");
      setModels(
        (combo.models || []).map((m, idx) => ({
          ...m,
          id: m.id || `step-${idx + 1}`,
          weight: typeof m.weight === "number" ? m.weight : 100,
        })),
      );
      setConfig(combo.config ? { ...combo.config } : {});
      setSystemMessage(combo.system_message || "");
      setToolFilterRegex(combo.tool_filter_regex || "");
      setContextCacheProtection(Boolean(combo.context_cache_protection));
      setContextLength(combo.context_length || undefined);

      const respVal = (combo.config?.responseValidation as Record<string, unknown>) || {};
      setForbiddenSubstrings(Array.isArray(respVal.forbiddenSubstrings) ? respVal.forbiddenSubstrings.join("\n") : "");
      setRequiredSubstrings(Array.isArray(respVal.requiredSubstrings) ? respVal.requiredSubstrings.join("\n") : "");
      setMinContentLength(typeof respVal.minContentLength === "number" ? respVal.minContentLength : undefined);
      setStreamTimeoutMs(typeof respVal.streamTimeoutMs === "number" ? respVal.streamTimeoutMs : undefined);
      setTotalTimeoutMs(typeof respVal.totalTimeoutMs === "number" ? respVal.totalTimeoutMs : undefined);

      setTargetTimeoutSeconds(
        typeof combo.config?.targetTimeoutMs === "number"
          ? Math.round((combo.config.targetTimeoutMs as number) / 1000)
          : undefined,
      );
      setFailoverBeforeRetry(Boolean(combo.config?.failoverBeforeRetry));
      setMaxSetRetries(typeof combo.config?.maxSetRetries === "number" ? (combo.config.maxSetRetries as number) : undefined);
      setSetRetryDelayMs(typeof combo.config?.setRetryDelayMs === "number" ? (combo.config.setRetryDelayMs as number) : undefined);
      setReasoningTransportFallback(
        combo.config?.reasoningTransportFallback === "skip"
          ? "skip"
          : combo.config?.reasoningTransportFallback === "drop"
            ? "drop"
            : "default",
      );
      setDisableSessionStickiness(
        combo.config?.disableSessionStickiness === true
          ? "disabled"
          : combo.config?.disableSessionStickiness === false
            ? "enabled"
            : "inherit",
      );
      setNestedComboMode(combo.config?.nestedComboMode === "execute" ? "execute" : "flatten");
    } else {
      setName("");
      setDescription("");
      setStrategy("priority");
      setCustomOutputModel("");
      setModels([]);
      setConfig({});
      setSystemMessage("");
      setToolFilterRegex("");
      setContextCacheProtection(false);
      setContextLength(undefined);
      setForbiddenSubstrings("");
      setRequiredSubstrings("");
      setMinContentLength(undefined);
      setStreamTimeoutMs(undefined);
      setTotalTimeoutMs(undefined);
      setTargetTimeoutSeconds(undefined);
      setFailoverBeforeRetry(false);
      setMaxSetRetries(undefined);
      setSetRetryDelayMs(undefined);
      setReasoningTransportFallback("default");
      setDisableSessionStickiness("inherit");
      setNestedComboMode("flatten");
    }
    setNameTouched(false);
    setModelsTouched(false);
    setCurrentStep(0);
    setAddProviderId("");
    setAddModelId("");
    setAddConnectionId("");
    setAddAllowedConnectionIds([]);
    setWildcardProviderId("");
    setWildcardPattern("*");
    setNestedComboName("");
    setManualInput("");
    setAdditionTab("provider");
    setSelectedTemplateKey(null);
  }, [open, combo]);

  const applyStartingTemplate = (tmpl: (typeof STARTING_TEMPLATES)[number]) => {
    setSelectedTemplateKey(tmpl.key);
    setStrategy(tmpl.strategy);
    const def = getStrategyDef(tmpl.strategy);
    setConfig((prev) => ({ ...prev, ...def.recommendations.defaults, ...tmpl.config }));
    if (!name.trim() || STARTING_TEMPLATES.some((t) => t.suggestedName === name)) {
      setName(tmpl.suggestedName);
    }
    if (tmpl.presetModels && tmpl.presetModels.length > 0 && models.length === 0) {
      setModels(
        tmpl.presetModels.map((m, idx) => {
          let providerId: string | undefined;
          let modelId = m;
          if (m.includes("/")) {
            const parts = m.split("/");
            providerId = parts[0];
            modelId = parts.slice(1).join("/");
          }
          return {
            id: `step-${Date.now()}-${idx}`,
            kind: "model" as const,
            providerId,
            model: modelId,
            weight: 100,
          };
        })
      );
    }
  };

  const strategyDef = getStrategyDef(strategy);
  const nameError = useMemo(() => validateComboName(name), [name]);
  const showNameError = nameTouched && Boolean(nameError);

  // Derived available models and comboRefs from builderOptions
  const providers = builderOptions?.providers || [];
  const comboRefs = useMemo(() => {
    const raw = builderOptions?.comboRefs || [];
    return raw.filter((c) => c.name !== name);
  }, [builderOptions, name]);

  const selectedProvider = providers.find((p) => p.providerId === addProviderId);
  const availableModels = selectedProvider?.models || [];
  const availableConnections = selectedProvider?.connections || [];

  // Weight total validation
  const weightTotal = useMemo(() => {
    return models.reduce((sum, m) => sum + (typeof m.weight === "number" ? m.weight : 100), 0);
  }, [models]);

  const autoBalanceWeights = () => {
    if (models.length === 0) return;
    const base = Math.floor(100 / models.length);
    const remainder = 100 - base * models.length;
    setModels(
      models.map((m, idx) => ({
        ...m,
        weight: idx === 0 ? base + remainder : base,
      })),
    );
  };

  // Add precision model step
  const handleAddPrecisionStep = () => {
    if (!addProviderId || !addModelId) return;

    const newStep: ComboModelStep = {
      id: `step-${Date.now()}`,
      kind: "model",
      providerId: addProviderId,
      model: addModelId,
      connectionId: addConnectionId || undefined,
      weight: strategy === "weighted" ? (models.length === 0 ? 100 : 0) : 100,
    };

    if (!addConnectionId && addAllowedConnectionIds.length > 0) {
      (newStep as unknown as Record<string, unknown>).allowedConnectionIds = addAllowedConnectionIds;
    }

    setModels([...models, newStep]);
    setModelsTouched(false);
    setAddModelId("");
    setAddConnectionId("");
    setAddAllowedConnectionIds([]);
  };

  // Add provider wildcard step
  const handleAddWildcardStep = () => {
    if (!wildcardProviderId || !wildcardPattern.trim()) return;

    const newStep: ComboProviderWildcardStep = {
      id: `step-${Date.now()}`,
      kind: "provider-wildcard",
      providerId: wildcardProviderId,
      modelPattern: wildcardPattern.trim(),
      weight: strategy === "weighted" ? (models.length === 0 ? 100 : 0) : 100,
    };

    setModels([...models, newStep]);
    setModelsTouched(false);
    setWildcardPattern("*");
  };

  // Add nested combo step
  const handleAddNestedComboStep = () => {
    if (!nestedComboName) return;

    const newStep: ComboRefStep = {
      id: `step-${Date.now()}`,
      kind: "combo-ref",
      comboName: nestedComboName,
      weight: strategy === "weighted" ? (models.length === 0 ? 100 : 0) : 100,
    };

    setModels([...models, newStep]);
    setModelsTouched(false);
    setNestedComboName("");
  };

  // Add manual / preset model step
  const handleAddManualStep = (presetName?: string) => {
    const raw = (presetName || manualInput).trim();
    if (!raw) return;

    let providerId: string | undefined;
    let modelId = raw;

    if (raw.includes("/")) {
      const parts = raw.split("/");
      providerId = parts[0];
      modelId = parts.slice(1).join("/");
    }

    const newStep: ComboModelStep = {
      id: `step-${Date.now()}`,
      kind: "model",
      providerId,
      model: modelId,
      weight: strategy === "weighted" ? (models.length === 0 ? 100 : 0) : 100,
    };

    setModels([...models, newStep]);
    setModelsTouched(false);
    if (!presetName) setManualInput("");
  };

  // Remove step
  const handleRemoveStep = (idx: number) => {
    setModels(models.filter((_, i) => i !== idx));
  };

  // Drag and drop handlers
  const handleStepDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    setStepDragIndex(idx);
  };

  const handleStepDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (stepDragOverIndex !== idx) setStepDragOverIndex(idx);
  };

  const handleStepDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const sourceIdx = stepDragIndex;
    setStepDragIndex(null);
    setStepDragOverIndex(null);
    if (sourceIdx === null || sourceIdx === targetIdx) return;

    const next = [...models];
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, moved);
    setModels(next);
  };

  // Save handler
  const handleSave = async () => {
    setNameTouched(true);
    setModelsTouched(true);

    if (nameError) {
      setCurrentStep(0);
      return;
    }
    if (models.length === 0) {
      setCurrentStep(1);
      return;
    }
    if (strategy === "weighted" && weightTotal !== 100) {
      setCurrentStep(2);
      return;
    }

    const payloadConfig: Record<string, unknown> = { ...config };

    if (typeof targetTimeoutSeconds === "number" && targetTimeoutSeconds > 0) {
      payloadConfig.targetTimeoutMs = targetTimeoutSeconds * 1000;
    } else {
      delete payloadConfig.targetTimeoutMs;
    }

    if (failoverBeforeRetry) {
      payloadConfig.failoverBeforeRetry = true;
    } else {
      delete payloadConfig.failoverBeforeRetry;
    }

    if (typeof maxSetRetries === "number" && maxSetRetries > 0) {
      payloadConfig.maxSetRetries = maxSetRetries;
    } else {
      delete payloadConfig.maxSetRetries;
    }

    if (typeof setRetryDelayMs === "number" && setRetryDelayMs > 0) {
      payloadConfig.setRetryDelayMs = setRetryDelayMs;
    } else {
      delete payloadConfig.setRetryDelayMs;
    }

    if (reasoningTransportFallback === "skip" || reasoningTransportFallback === "drop") {
      payloadConfig.reasoningTransportFallback = reasoningTransportFallback;
    } else {
      delete payloadConfig.reasoningTransportFallback;
    }

    if (disableSessionStickiness === "disabled") {
      payloadConfig.disableSessionStickiness = true;
    } else if (disableSessionStickiness === "enabled") {
      payloadConfig.disableSessionStickiness = false;
    } else {
      delete payloadConfig.disableSessionStickiness;
    }

    if (nestedComboMode === "execute") {
      payloadConfig.nestedComboMode = "execute";
    } else {
      delete payloadConfig.nestedComboMode;
    }

    const forbidden = forbiddenSubstrings.split("\n").map((s) => s.trim()).filter(Boolean);
    const required = requiredSubstrings.split("\n").map((s) => s.trim()).filter(Boolean);

    if (
      forbidden.length > 0 ||
      required.length > 0 ||
      typeof minContentLength === "number" ||
      typeof streamTimeoutMs === "number" ||
      typeof totalTimeoutMs === "number"
    ) {
      payloadConfig.responseValidation = {
        forbiddenSubstrings: forbidden.length > 0 ? forbidden : undefined,
        requiredSubstrings: required.length > 0 ? required : undefined,
        minContentLength: typeof minContentLength === "number" ? minContentLength : undefined,
        streamTimeoutMs: typeof streamTimeoutMs === "number" ? streamTimeoutMs : undefined,
        totalTimeoutMs: typeof totalTimeoutMs === "number" ? totalTimeoutMs : undefined,
      };
    } else {
      delete payloadConfig.responseValidation;
    }

    const saveData: Partial<ComboItem> = {
      name: name.trim(),
      description: description.trim() || undefined,
      strategy,
      models,
      config: Object.keys(payloadConfig).length > 0 ? payloadConfig : undefined,
      custom_output_model: customOutputModel.trim() || undefined,
      system_message: systemMessage.trim() || undefined,
      tool_filter_regex: toolFilterRegex.trim() || undefined,
      context_cache_protection: contextCacheProtection || undefined,
      context_length: contextLength || undefined,
    };

    await onSave(saveData);
  };

  // Save blockers
  const saveBlockers: string[] = [];
  if (nameError) saveBlockers.push(nameError);
  if (models.length === 0) saveBlockers.push("尚未添加任何模型节点");
  if (strategy === "weighted" && weightTotal !== 100) {
    saveBlockers.push(`加权策略权重之和须为 100%（当前 ${weightTotal}%）`);
  }

  // Model Columns
  const modelColumns = [
    {
      title: "排序",
      key: "dragHandle",
      width: 46,
      render: (_: unknown, __: unknown, idx: number) => (
        <div
          draggable
          onDragStart={(e) => handleStepDragStart(e, idx)}
          onDragEnd={() => {
            setStepDragIndex(null);
            setStepDragOverIndex(null);
          }}
          style={{
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9CA3AF",
          }}
          title="按住并拖动以调整顺序"
        >
          <MaterialIcon name="drag_indicator" size={16} />
        </div>
      ),
    },
    {
      title: "序号",
      key: "index",
      width: 56,
      render: (_: unknown, __: unknown, idx: number) => (
        <span
          style={{
            display: "inline-flex",
            width: 20,
            height: 20,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.12)",
            color: "#8B5CF6",
            fontSize: 11,
            fontWeight: "bold",
          }}
        >
          {idx + 1}
        </span>
      ),
    },
    {
      title: "调度目标与类型",
      key: "modelName",
      render: (_: unknown, record: ComboStep) => {
        const displayName = getStepDisplayName(record);
        const provider = getStepProvider(record);
        const connection = getStepConnection(record);
        const isCombo = record.kind === "combo-ref";
        const isWildcard = record.kind === "provider-wildcard";

        return (
          <Space direction="vertical" size={2}>
            <Space size={6}>
              {isCombo && (
                <Tag color="cyan" style={{ margin: 0, fontSize: 10, padding: "0 6px" }}>
                  <Space size={2}>
                    <MaterialIcon name="folder_special" size={11} />
                    <span>嵌套组合</span>
                  </Space>
                </Tag>
              )}
              {isWildcard && (
                <Tag color="geekblue" style={{ margin: 0, fontSize: 10, padding: "0 6px" }}>
                  <Space size={2}>
                    <MaterialIcon name="all_inclusive" size={11} />
                    <span>提供商通配</span>
                  </Space>
                </Tag>
              )}
              <Text strong style={{ fontSize: 13, fontFamily: "monospace" }}>
                {displayName}
              </Text>
            </Space>
            <Space size={6} wrap>
              {provider && !isWildcard && (
                <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: "0 6px" }}>
                  {provider}
                </Tag>
              )}
              {connection && (
                <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: "0 6px" }}>
                  账户: {connection}
                </Tag>
              )}
            </Space>
          </Space>
        );
      },
    },
    ...(strategy === "weighted"
      ? [
          {
            title: "权重 (%)",
            key: "weight",
            width: 130,
            render: (_: unknown, record: ComboStep, idx: number) => (
              <InputNumber
                size="small"
                min={0}
                max={100}
                value={typeof record.weight === "number" ? record.weight : 100}
                onChange={(val) => {
                  const next = [...models];
                  next[idx] = { ...record, weight: val ?? 0 } as ComboStep;
                  setModels(next);
                }}
                addonAfter="%"
                style={{ width: 100 }}
              />
            ),
          },
        ]
      : []),
    {
      title: "回退规则",
      key: "quotaOnly",
      width: 140,
      render: (_: unknown, record: ComboStep, idx: number) => {
        if (strategy !== "priority" || record.kind === "provider-wildcard" || record.kind === "combo-ref") {
          return (
            <Text type="secondary" style={{ fontSize: 11 }}>
              -
            </Text>
          );
        }
        return (
          <Checkbox
            checked={(record as ComboModelStep).fallbackOnlyOnQuotaExhaustion === true}
            onChange={(e) => {
              const next = [...models];
              next[idx] = { ...record, fallbackOnlyOnQuotaExhaustion: e.target.checked } as ComboStep;
              setModels(next);
            }}
          >
            <span style={{ fontSize: 11 }}>仅配额耗尽回退</span>
          </Checkbox>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 56,
      render: (_: unknown, __: unknown, idx: number) => (
        <Popconfirm title="确定移除此模型节点？" onConfirm={() => handleRemoveStep(idx)}>
          <Button
            type="text"
            size="small"
            danger
            icon={<MaterialIcon name="delete" size={14} />}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={980}
      style={{ top: 20 }}
      styles={{
        body: {
          padding: 0,
        },
      }}
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 24 }}>
          <Space align="center" size={8}>
            <div className={styles.titleIconWrap}>
              <MaterialIcon name={isEdit ? "edit" : "add_circle"} size={16} style={{ color: "#8B5CF6" }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>
              {isEdit ? `编辑模型组合: ${combo?.name}` : "新建模型组合"}
            </span>
          </Space>
          <Segmented
            size="small"
            value={configMode}
            options={[
              { label: "向导模式", value: "guided" },
              { label: "专家模式", value: "expert" },
            ]}
            onChange={(val) => setConfigMode(val as "guided" | "expert")}
          />
        </div>
      }
      footer={
        configMode === "guided" ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              disabled={currentStep === 0}
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            >
              上一步
            </Button>
            <Space size={8}>
              <Button onClick={onClose}>取消</Button>
              {currentStep < 3 ? (
                <Button
                  type="primary"
                  onClick={() => {
                    if (currentStep === 0) {
                      setNameTouched(true);
                      if (nameError) return;
                    }
                    if (currentStep === 1) {
                      setModelsTouched(true);
                      if (models.length === 0) return;
                    }
                    if (currentStep === 2 && strategy === "weighted" && weightTotal !== 100) {
                      return;
                    }
                    setCurrentStep((prev) => prev + 1);
                  }}
                >
                  下一步
                </Button>
              ) : (
                <Button
                  type="primary"
                  loading={loading}
                  disabled={saveBlockers.length > 0}
                  onClick={handleSave}
                  style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
                >
                  {isEdit ? "保存更改" : "创建组合"}
                </Button>
              )}
            </Space>
          </div>
        ) : (
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              loading={loading}
              disabled={saveBlockers.length > 0}
              onClick={handleSave}
              style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
            >
              {isEdit ? "保存更改" : "创建组合"}
            </Button>
          </Space>
        )
      }
    >
      <div className={styles.modalBody}>
        {/* Guided Mode Steps Bar */}
        {configMode === "guided" && (
          <div className={styles.stepsWrapper}>
            <Steps
              size="small"
              current={currentStep}
              onChange={(step) => {
                if (step > 0 && nameError) {
                  setNameTouched(true);
                  return;
                }
                if (step > 1 && models.length === 0) {
                  setModelsTouched(true);
                  return;
                }
                setCurrentStep(step);
              }}
              items={[
                {
                  title: <Text strong style={{ fontSize: 12 }}>基本信息</Text>,
                  description: <span style={{ fontSize: 11, color: "#8c8c8c" }}>命名与模板</span>,
                  icon: (
                    <span className={`${styles.stepIcon} ${currentStep === 0 ? styles.stepIconActive : styles.stepIconInactive}`}>
                      1
                    </span>
                  ),
                },
                {
                  title: <Text strong style={{ fontSize: 12 }}>目标编排</Text>,
                  description: <span style={{ fontSize: 11, color: "#8c8c8c" }}>候选节点与嵌套</span>,
                  icon: (
                    <span className={`${styles.stepIcon} ${currentStep === 1 ? styles.stepIconActive : styles.stepIconInactive}`}>
                      2
                    </span>
                  ),
                },
                {
                  title: <Text strong style={{ fontSize: 12 }}>策略调优</Text>,
                  description: <span style={{ fontSize: 11, color: "#8c8c8c" }}>调度算法与规则</span>,
                  icon: (
                    <span className={`${styles.stepIcon} ${currentStep === 2 ? styles.stepIconActive : styles.stepIconInactive}`}>
                      3
                    </span>
                  ),
                },
                {
                  title: <Text strong style={{ fontSize: 12 }}>检查与保存</Text>,
                  description: <span style={{ fontSize: 11, color: "#8c8c8c" }}>配置确认与调用</span>,
                  icon: (
                    <span className={`${styles.stepIcon} ${currentStep === 3 ? styles.stepIconActive : styles.stepIconInactive}`}>
                      4
                    </span>
                  ),
                },
              ]}
            />
          </div>
        )}

        {/* ==================== Section 1: Basics ==================== */}
        {(configMode === "expert" || currentStep === 0) && (
          <div style={{ marginBottom: configMode === "expert" ? 28 : 0 }}>
            {configMode === "expert" && <Divider titlePlacement="start">1. 基础信息配置</Divider>}

            <Form layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>组合唯一标识名称</span>}
                    required
                    validateStatus={showNameError ? "error" : ""}
                    help={
                      showNameError ? (
                        <span style={{ color: "#EF4444", fontSize: 12 }}>{nameError}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                          客户端与上层应用将直接将此名称作为 model 发起调用
                        </span>
                      )
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="例如: my-smart-combo, code-copilot, gpt-4o-fallback"
                      value={name}
                      status={showNameError ? "error" : undefined}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!nameTouched) setNameTouched(true);
                      }}
                      onBlur={() => setNameTouched(true)}
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={{ fontWeight: 600, fontSize: 13 }}>描述说明</span>}
                    help={
                      <span style={{ fontSize: 11, color: "#8c8c8c" }}>
                        可选，描述此组合的业务场景、定位与路由意图
                      </span>
                    }
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      placeholder="可选，描述此组合的业务场景、定位与路由意图"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Custom Output Model Alias */}
              <div style={{ marginTop: 16 }}>
                <Form.Item
                  label={
                    <Space size={4}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>响应模型名别名覆盖</span>
                      <Tooltip title="可选，上层客户端请求时，强制将返回响应中的 model 字段重写为此自定义别名">
                        <MaterialIcon name="help" size={14} style={{ color: "#9CA3AF" }} />
                      </Tooltip>
                    </Space>
                  }
                  style={{ marginBottom: 0 }}
                >
                  <Input
                    placeholder="可选，例如: gpt-4o 或 claude-3-7-sonnet（留空则默认返回命中模型的真实名称）"
                    value={customOutputModel}
                    onChange={(e) => setCustomOutputModel(e.target.value)}
                    allowClear
                  />
                </Form.Item>
              </div>

              {/* Starting Quick Templates */}
              {!isEdit && configMode === "guided" && (
                <div style={{ marginTop: 28, marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 13, display: "block", marginBottom: 12 }}>
                    🎯 快速起步模板（点击一键预设策略与推荐参数）:
                  </Text>
                  <Row gutter={[12, 12]}>
                    {STARTING_TEMPLATES.map((tmpl) => {
                      const isSelected =
                        selectedTemplateKey === tmpl.key ||
                        (selectedTemplateKey === null && strategy === tmpl.strategy);
                      return (
                        <Col xs={24} sm={12} key={tmpl.key}>
                          <div
                            className={isSelected ? styles.startingTemplateCardSelected : styles.startingTemplateCard}
                            onClick={() => applyStartingTemplate(tmpl)}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              <div
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  background: isSelected ? "#8B5CF6" : "rgba(139, 92, 246, 0.12)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <MaterialIcon
                                  name={tmpl.icon}
                                  size={14}
                                  style={{ color: isSelected ? "#fff" : "#8B5CF6" }}
                                />
                              </div>
                              <Text strong style={{ fontSize: 12 }}>
                                {tmpl.title}
                              </Text>
                              {tmpl.isFeatured && (
                                <Tag color="success" style={{ margin: 0, fontSize: 10, fontWeight: "bold" }}>
                                  FREE
                                </Tag>
                              )}
                              {isSelected && (
                                <Tag color="purple" style={{ marginLeft: "auto", margin: 0, fontSize: 10 }}>
                                  已选中
                                </Tag>
                              )}
                            </div>
                            <Paragraph type="secondary" style={{ fontSize: 11, margin: 0, lineHeight: "16px" }}>
                              {tmpl.desc}
                            </Paragraph>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              )}
            </Form>
          </div>
        )}

        {/* ==================== Section 2: Targets Builder ==================== */}
        {(configMode === "expert" || currentStep === 1) && (
          <div style={{ marginBottom: configMode === "expert" ? 28 : 0 }}>
            {configMode === "expert" && <Divider titlePlacement="start">2. 候选调度目标编排</Divider>}

            {/* Validation Inline Alert */}
            {modelsTouched && models.length === 0 && (
              <Alert
                type="error"
                showIcon
                message="请先添加至少一个候选节点以构建调度链路"
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Quick presets */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                快捷预设添加:
              </Text>
              <Space size={6} wrap>
                {QUICK_MODEL_PRESETS.map((preset) => (
                  <Tag
                    key={preset}
                    color="purple"
                    style={{ cursor: "pointer", fontSize: 11, padding: "2px 8px", borderRadius: 4 }}
                    onClick={() => handleAddManualStep(preset)}
                  >
                    + {preset}
                  </Tag>
                ))}
              </Space>
            </div>

            {/* Add Step Card */}
            <div className={styles.builderCard} style={{ padding: "12px 14px" }}>
              <div style={{ marginBottom: 12 }}>
                <Segmented
                  size="small"
                  value={additionTab}
                  options={[
                    { label: "精确模型选择", value: "provider" },
                    { label: "提供商通配", value: "wildcard" },
                    { label: "组合嵌套", value: "nested-combo" },
                    { label: "手动输入模型标识", value: "manual" },
                  ]}
                  onChange={(v) => setAdditionTab(v as "provider" | "wildcard" | "nested-combo" | "manual")}
                />
              </div>

              {/* Tab 1: Precise Model Selection */}
              {additionTab === "provider" && (
                <div>
                  <Row gutter={[10, 10]} align="middle">
                    <Col xs={24} sm={8}>
                      <Select
                        placeholder="1. 选择提供者"
                        value={addProviderId || undefined}
                        onChange={(val) => {
                          setAddProviderId(val);
                          setAddModelId("");
                          setAddConnectionId("");
                          setAddAllowedConnectionIds([]);
                        }}
                        style={{ width: "100%" }}
                        options={providers.map((p) => ({
                          value: p.providerId,
                          label: p.displayName || p.providerId,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={8}>
                      <Select
                        placeholder="2. 选择模型"
                        disabled={!addProviderId}
                        value={addModelId || undefined}
                        onChange={(val) => setAddModelId(val)}
                        style={{ width: "100%" }}
                        showSearch
                        optionFilterProp="label"
                        options={availableModels.map((m) => ({
                          value: m.id,
                          label: m.name || m.id,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={5}>
                      <Select
                        placeholder="账户范围 (可选)"
                        disabled={!addProviderId || availableConnections.length === 0}
                        value={addConnectionId || undefined}
                        onChange={(val) => setAddConnectionId(val)}
                        style={{ width: "100%" }}
                        allowClear
                        options={[
                          { value: "", label: "自动运行时分配账户" },
                          ...availableConnections.map((c) => ({
                            value: c.id,
                            label: c.label || `账户 ${c.id.slice(0, 8)}`,
                          })),
                        ]}
                      />
                    </Col>
                    <Col xs={24} sm={3}>
                      <Button
                        type="primary"
                        icon={<MaterialIcon name="add" size={14} />}
                        onClick={handleAddPrecisionStep}
                        disabled={!addProviderId || !addModelId}
                        style={{ width: "100%", background: "#8B5CF6", borderColor: "#8B5CF6" }}
                      >
                        添加
                      </Button>
                    </Col>
                  </Row>

                  {/* Account allowlist when auto-selecting */}
                  {!addConnectionId && addProviderId && availableConnections.length > 1 && (
                    <div className={styles.allowlistBox}>
                      <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 6 }}>
                        账户白名单限制（留空则在所有可用活跃账户中轮询；选中时仅在勾选的子集中轮询）:
                      </Text>
                      <Checkbox.Group
                        value={addAllowedConnectionIds}
                        onChange={(vals) => setAddAllowedConnectionIds(vals as string[])}
                      >
                        <Space wrap size={[8, 4]}>
                          {availableConnections.map((c) => (
                            <Checkbox key={c.id} value={c.id}>
                              <span style={{ fontSize: 11 }}>{c.label || c.id.slice(0, 8)}</span>
                            </Checkbox>
                          ))}
                        </Space>
                      </Checkbox.Group>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Provider Wildcard */}
              {additionTab === "wildcard" && (
                <div>
                  <Row gutter={[10, 10]} align="middle">
                    <Col xs={24} sm={10}>
                      <Select
                        placeholder="选择提供者"
                        value={wildcardProviderId || undefined}
                        onChange={(val) => setWildcardProviderId(val)}
                        style={{ width: "100%" }}
                        options={providers.map((p) => ({
                          value: p.providerId,
                          label: p.displayName || p.providerId,
                        }))}
                      />
                    </Col>
                    <Col xs={24} sm={10}>
                      <Input
                        placeholder="通配模型模式，例如: * 或 claude-3-5-* 或 gpt-4o*"
                        value={wildcardPattern}
                        onChange={(e) => setWildcardPattern(e.target.value)}
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <Button
                        type="primary"
                        icon={<MaterialIcon name="add" size={14} />}
                        onClick={handleAddWildcardStep}
                        disabled={!wildcardProviderId || !wildcardPattern.trim()}
                        style={{ width: "100%", background: "#8B5CF6", borderColor: "#8B5CF6" }}
                      >
                        添加通配
                      </Button>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
                    💡 通配符节点会自动匹配该提供商下符合模式的模型，当匹配到多个模型时支持按规则智能接管。
                  </Text>
                </div>
              )}

              {/* Tab 3: Nested Combo */}
              {additionTab === "nested-combo" && (
                <div>
                  <Row gutter={[10, 10]} align="middle">
                    <Col xs={24} sm={20}>
                      <Select
                        placeholder="选择已存在的组合作为子调度目标"
                        value={nestedComboName || undefined}
                        onChange={(val) => setNestedComboName(val)}
                        style={{ width: "100%" }}
                        options={comboRefs.map((c) => ({
                          value: c.name,
                          label: `${c.name} (${c.strategy || "priority"}, ${c.modelsCount || 0} 个节点)`,
                        }))}
                        notFoundContent="暂无可嵌套的已有组合"
                      />
                    </Col>
                    <Col xs={24} sm={4}>
                      <Button
                        type="primary"
                        icon={<MaterialIcon name="add" size={14} />}
                        onClick={handleAddNestedComboStep}
                        disabled={!nestedComboName}
                        style={{ width: "100%", background: "#8B5CF6", borderColor: "#8B5CF6" }}
                      >
                        添加组合
                      </Button>
                    </Col>
                  </Row>
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 6 }}>
                    💡 组合嵌套允许将复杂策略分层化（例如：主力优先，备用节点是一个轮询多个免费模型的子组合）。
                  </Text>
                </div>
              )}

              {/* Tab 4: Manual Input */}
              {additionTab === "manual" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <Input
                    placeholder="输入模型标识（如 openai/gpt-4o, anthropic/claude-3-5-sonnet, deepseek/deepseek-chat）"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onPressEnter={() => handleAddManualStep()}
                    allowClear
                  />
                  <Button
                    type="primary"
                    icon={<MaterialIcon name="add" size={14} />}
                    onClick={() => handleAddManualStep()}
                    disabled={!manualInput.trim()}
                    style={{ background: "#8B5CF6", borderColor: "#8B5CF6", flexShrink: 0 }}
                  >
                    添加模型
                  </Button>
                </div>
              )}
            </div>

            {/* Models Table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Space size={6}>
                  <Text strong style={{ fontSize: 13 }}>
                    已编排候选目标列表
                  </Text>
                  <Tag color="purple">{models.length} 个节点</Tag>
                </Space>
                {models.length > 1 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    💡 按住左侧手柄拖拽调整优先级/顺序
                  </Text>
                )}
              </div>

              <Table
                dataSource={models}
                columns={modelColumns}
                rowKey="id"
                pagination={false}
                size="small"
                onRow={(_, idx) => ({
                  onDragOver: (e) => handleStepDragOver(e, idx ?? 0),
                  onDrop: (e) => handleStepDrop(e, idx ?? 0),
                  style: {
                    opacity: stepDragIndex === idx ? 0.4 : 1,
                    borderTop:
                      stepDragOverIndex === idx && stepDragIndex !== idx
                        ? "2px solid #8B5CF6"
                        : undefined,
                  },
                })}
                locale={{ emptyText: "尚未添加任何模型节点，请使用上方工具添加候选调度节点" }}
              />
            </div>

            {/* Weight bar */}
            {strategy === "weighted" && models.length > 0 && (
              <div
                className={styles.weightTotalBox}
                style={{
                  border: `1px solid ${weightTotal === 100 ? "#8c8c8c33" : "#EF4444"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    权重分配总计:
                  </Text>
                  <Space size={8}>
                    <Text strong style={{ color: weightTotal === 100 ? "#10B981" : "#EF4444" }}>
                      {weightTotal}% {weightTotal !== 100 && "(总和必须等于 100%)"}
                    </Text>
                    <Button size="small" type="link" onClick={autoBalanceWeights}>
                      一键自动均分
                    </Button>
                  </Space>
                </div>
                <Progress
                  percent={Math.min(100, weightTotal)}
                  status={weightTotal === 100 ? "success" : "exception"}
                  size="small"
                />
              </div>
            )}
          </div>
        )}

        {/* ==================== Section 3: Strategy & Tuning ==================== */}
        {(configMode === "expert" || currentStep === 2) && (
          <div style={{ marginBottom: configMode === "expert" ? 28 : 0 }}>
            {configMode === "expert" && <Divider titlePlacement="start">3. 路由策略与精细化调优</Divider>}

            {/* Visual Strategy Cards Grid */}
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 10 }}>
                选择调度路由策略:
              </Text>

              <Row gutter={[12, 12]}>
                {ROUTING_STRATEGIES.map((s) => {
                  const isSelected = strategy === s.value;
                  return (
                    <Col xs={24} sm={12} md={8} key={s.value}>
                      <div
                        className={isSelected ? styles.strategyCardSelected : styles.strategyCard}
                        onClick={() => {
                          setStrategy(s.value);
                          const def = getStrategyDef(s.value);
                          setConfig((prev) => ({ ...prev, ...def.recommendations.defaults }));
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <Space size={6}>
                              <MaterialIcon
                                name={s.icon}
                                size={16}
                                style={{ color: isSelected ? "#8B5CF6" : "#9CA3AF" }}
                              />
                              <Text strong style={{ fontSize: 12, color: isSelected ? "#8B5CF6" : undefined }}>
                                {s.label}
                              </Text>
                            </Space>
                            <Tag
                              color={s.category === "intelligent" ? "purple" : "default"}
                              style={{ margin: 0, fontSize: 10, padding: "0 4px" }}
                            >
                              {s.category === "intelligent" ? "智能" : "确定性"}
                            </Tag>
                          </div>
                          <Paragraph type="secondary" style={{ fontSize: 11, margin: 0, lineHeight: "16px" }}>
                            {s.desc}
                          </Paragraph>
                        </div>
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>

            {/* Strategy Guidance Callout */}
            <div className={styles.guidanceCard} style={{ padding: "12px 16px" }}>
              <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MaterialIcon name="lightbulb" size={16} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 13, color: "#8B5CF6" }}>
                    {strategyDef.label} 策略指南
                  </Text>
                </div>
                <Text style={{ fontSize: 12 }}>
                  • <b>推荐场景:</b> {strategyDef.guide.when}
                </Text>
                <Text style={{ fontSize: 12 }}>
                  • <b>避免场景:</b> {strategyDef.guide.avoid}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  • <b>参考示例:</b> {strategyDef.guide.example}
                </Text>
              </Space>
            </div>

            {/* Strategy-Specific Dynamic Tuning Parameters */}
            {strategy === "round-robin" && (
              <div className={styles.tuningCard} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <MaterialIcon name="tune" size={14} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 12 }}>循环轮询专属调优</Text>
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="单模型并发度限制" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={1}
                        max={50}
                        style={{ width: "100%" }}
                        value={typeof config.concurrencyPerModel === "number" ? config.concurrencyPerModel : 3}
                        onChange={(v) => setConfig({ ...config, concurrencyPerModel: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="排队等待超时 (ms)" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={1000}
                        max={120000}
                        step={1000}
                        style={{ width: "100%" }}
                        value={typeof config.queueTimeoutMs === "number" ? config.queueTimeoutMs : 30000}
                        onChange={(v) => setConfig({ ...config, queueTimeoutMs: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="会话粘性次数上限" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0}
                        max={1000}
                        style={{ width: "100%" }}
                        placeholder="继承全局"
                        value={typeof config.stickyRoundRobinLimit === "number" ? config.stickyRoundRobinLimit : undefined}
                        onChange={(v) => setConfig({ ...config, stickyRoundRobinLimit: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {strategy === "weighted" && (
              <div className={styles.tuningCard} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <MaterialIcon name="tune" size={14} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 12 }}>加权分流专属调优</Text>
                </div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="加权粘性请求数" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0}
                        max={1000}
                        style={{ width: "100%" }}
                        value={typeof config.stickyWeightedLimit === "number" ? config.stickyWeightedLimit : 1}
                        onChange={(v) => setConfig({ ...config, stickyWeightedLimit: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {strategy === "context-relay" && (
              <div className={styles.tuningCard} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <MaterialIcon name="history" size={14} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 12 }}>上下文接力专属调优</Text>
                </div>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="交接配额触发阈值 (0.5-0.95)" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0.5}
                        max={0.95}
                        step={0.01}
                        style={{ width: "100%" }}
                        value={typeof config.handoffThreshold === "number" ? config.handoffThreshold : 0.85}
                        onChange={(v) => setConfig({ ...config, handoffThreshold: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="参与交接最大历史消息数" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={5}
                        max={100}
                        style={{ width: "100%" }}
                        value={typeof config.maxMessagesForSummary === "number" ? config.maxMessagesForSummary : 30}
                        onChange={(v) => setConfig({ ...config, maxMessagesForSummary: v || undefined })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="专用交接摘要模型" style={{ marginBottom: 0 }}>
                      <Input
                        placeholder="留空复用当前模型"
                        value={(config.handoffModel as string) || ""}
                        onChange={(e) => setConfig({ ...config, handoffModel: e.target.value.trim() || undefined })}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {strategy === "fusion" && (
              <div className={styles.tuningCard} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <MaterialIcon name="groups" size={14} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 12 }}>多专家融合专属调优</Text>
                </div>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="最终裁判合成模型" style={{ marginBottom: 12 }}>
                      <Input
                        placeholder="留空默认取候选列表第 1 个模型"
                        value={(config.judgeModel as string) || ""}
                        onChange={(e) => setConfig({ ...config, judgeModel: e.target.value.trim() || undefined })}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="达成仲裁最少节点数" style={{ marginBottom: 12 }}>
                      <InputNumber
                        min={1}
                        max={20}
                        style={{ width: "100%" }}
                        value={typeof (config.fusionTuning as Record<string, unknown>)?.minPanel === "number" ? (config.fusionTuning as Record<string, unknown>).minPanel as number : 2}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            fusionTuning: {
                              ...((config.fusionTuning as Record<string, unknown>) || {}),
                              minPanel: v || undefined,
                            },
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="慢节点宽限等待 (ms)" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={0}
                        max={60000}
                        step={1000}
                        style={{ width: "100%" }}
                        value={typeof (config.fusionTuning as Record<string, unknown>)?.stragglerGraceMs === "number" ? (config.fusionTuning as Record<string, unknown>).stragglerGraceMs as number : 8000}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            fusionTuning: {
                              ...((config.fusionTuning as Record<string, unknown>) || {}),
                              stragglerGraceMs: v || undefined,
                            },
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="专家组硬超时上限 (ms)" style={{ marginBottom: 0 }}>
                      <InputNumber
                        min={1000}
                        max={300000}
                        step={5000}
                        style={{ width: "100%" }}
                        value={typeof (config.fusionTuning as Record<string, unknown>)?.panelHardTimeoutMs === "number" ? (config.fusionTuning as Record<string, unknown>).panelHardTimeoutMs as number : 90000}
                        onChange={(v) =>
                          setConfig({
                            ...config,
                            fusionTuning: {
                              ...((config.fusionTuning as Record<string, unknown>) || {}),
                              panelHardTimeoutMs: v || undefined,
                            },
                          })
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {(strategy === "auto" || strategy === "lkgp") && (
              <div className={styles.tuningCard} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <MaterialIcon name="auto_awesome" size={14} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 12 }}>智能调度画像与权重配置</Text>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                    预设模式包:
                  </Text>
                  <Segmented
                    size="small"
                    value={((config.intelligentMode as string) || "balanced")}
                    options={[
                      { label: "综合平衡", value: "balanced" },
                      { label: "极速响应", value: "speed" },
                      { label: "最低成本", value: "cost" },
                      { label: "最高质量", value: "quality" },
                    ]}
                    onChange={(v) => {
                      const mode = v as string;
                      let weights = { latency: 0.33, cost: 0.33, quality: 0.34 };
                      if (mode === "speed") weights = { latency: 0.7, cost: 0.1, quality: 0.2 };
                      if (mode === "cost") weights = { latency: 0.1, cost: 0.7, quality: 0.2 };
                      if (mode === "quality") weights = { latency: 0.1, cost: 0.1, quality: 0.8 };
                      setConfig({ ...config, intelligentMode: mode, weights });
                    }}
                  />
                </div>

                <Row gutter={16}>
                  <Col span={8}>
                    <Text style={{ fontSize: 11 }}>延迟权重: {Math.round((((config.weights as Record<string, number>)?.latency ?? 0.33) * 100))}%</Text>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={(config.weights as Record<string, number>)?.latency ?? 0.33}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          weights: { ...((config.weights as Record<string, number>) || {}), latency: v },
                        })
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ fontSize: 11 }}>成本权重: {Math.round((((config.weights as Record<string, number>)?.cost ?? 0.33) * 100))}%</Text>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={(config.weights as Record<string, number>)?.cost ?? 0.33}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          weights: { ...((config.weights as Record<string, number>) || {}), cost: v },
                        })
                      }
                    />
                  </Col>
                  <Col span={8}>
                    <Text style={{ fontSize: 11 }}>质量画像权重: {Math.round((((config.weights as Record<string, number>)?.quality ?? 0.34) * 100))}%</Text>
                    <Slider
                      min={0}
                      max={1}
                      step={0.05}
                      value={(config.weights as Record<string, number>)?.quality ?? 0.34}
                      onChange={(v) =>
                        setConfig({
                          ...config,
                          weights: { ...((config.weights as Record<string, number>) || {}), quality: v },
                        })
                      }
                    />
                  </Col>
                </Row>
              </div>
            )}

            {/* Standard Parameters Form */}
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label={<Text strong>单节点最大重试次数</Text>} style={{ marginBottom: 16 }}>
                    <InputNumber
                      min={0}
                      max={10}
                      style={{ width: "100%" }}
                      value={typeof config.maxRetries === "number" ? config.maxRetries : 1}
                      onChange={(val) => setConfig({ ...config, maxRetries: val ?? 1 })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label={<Text strong>重试间隔延时 (ms)</Text>} style={{ marginBottom: 16 }}>
                    <InputNumber
                      min={0}
                      max={60000}
                      step={500}
                      style={{ width: "100%" }}
                      value={typeof config.retryDelayMs === "number" ? config.retryDelayMs : 2000}
                      onChange={(val) => setConfig({ ...config, retryDelayMs: val ?? 2000 })}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label={
                      <Space size={4}>
                        <Text strong>单次目标超时 (秒)</Text>
                        <Tooltip title="单次请求目标节点的超时时间，留空则继承全局请求超时">
                          <MaterialIcon name="help" size={14} style={{ color: "#9CA3AF" }} />
                        </Tooltip>
                      </Space>
                    }
                    style={{ marginBottom: 16 }}
                  >
                    <InputNumber
                      min={1}
                      max={86400}
                      placeholder="继承全局"
                      style={{ width: "100%" }}
                      value={targetTimeoutSeconds}
                      onChange={(val) => setTargetTimeoutSeconds(val || undefined)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 16 }}>
                    <Checkbox
                      checked={failoverBeforeRetry}
                      onChange={(e) => setFailoverBeforeRetry(e.target.checked)}
                    >
                      <Space size={4}>
                        <span>优先故障降级</span>
                        <Tooltip title="勾选后遇错立即切换至下一个备用模型兜底，而非原地反复重试当前模型">
                          <MaterialIcon name="help" size={14} style={{ color: "#9CA3AF" }} />
                        </Tooltip>
                      </Space>
                    </Checkbox>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item style={{ marginBottom: 16 }}>
                    <Checkbox
                      checked={config.reasoningTokenBufferEnabled !== false}
                      onChange={(e) =>
                        setConfig({ ...config, reasoningTokenBufferEnabled: e.target.checked })
                      }
                    >
                      <Space size={4}>
                        <span>启用推理模型 Token 缓冲</span>
                        <Tooltip title="针对深度推理模型自动增加 max_tokens 缓冲空间，防止因思考 token 超出限制">
                          <MaterialIcon name="help" size={14} style={{ color: "#9CA3AF" }} />
                        </Tooltip>
                      </Space>
                    </Checkbox>
                  </Form.Item>
                </Col>
              </Row>

              {/* Collapsible Advanced Settings */}
              <Collapse
                ghost
                style={{ marginTop: 8 }}
                items={[
                  {
                    key: "advanced",
                    label: (
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#8B5CF6" }}>
                        ⚙️ 展开高级配置（整链重试、会话粘性、响应内容校验与 Agent 规则）
                      </span>
                    ),
                    children: (
                      <div className={styles.advancedPanel}>
                        {/* Advanced Resilience */}
                        <Divider titlePlacement="start" style={{ margin: "0 0 14px" }}>
                          高级容灾与执行策略
                        </Divider>
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item label="整链重试轮数" style={{ marginBottom: 16 }}>
                              <InputNumber
                                min={0}
                                max={5}
                                placeholder="0 (默认单轮)"
                                style={{ width: "100%" }}
                                value={maxSetRetries}
                                onChange={(v) => setMaxSetRetries(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="整轮重试延时 (ms)" style={{ marginBottom: 16 }}>
                              <InputNumber
                                min={0}
                                max={60000}
                                step={500}
                                placeholder="2000"
                                style={{ width: "100%" }}
                                value={setRetryDelayMs}
                                onChange={(v) => setSetRetryDelayMs(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="推理传输降级行为" style={{ marginBottom: 16 }}>
                              <Select
                                value={reasoningTransportFallback}
                                onChange={(v) => setReasoningTransportFallback(v)}
                                options={[
                                  { label: "默认行为", value: "default" },
                                  { label: "跳过不兼容目标", value: "skip" },
                                  { label: "丢弃推理字段尝试", value: "drop" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="会话粘性控制" style={{ marginBottom: 16 }}>
                              <Select
                                value={disableSessionStickiness}
                                onChange={(v) => setDisableSessionStickiness(v)}
                                options={[
                                  { label: "继承全局默认", value: "inherit" },
                                  { label: "强制开启会话粘性", value: "enabled" },
                                  { label: "强制关闭会话粘性", value: "disabled" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="嵌套组合执行行为" style={{ marginBottom: 16 }}>
                              <Radio.Group
                                value={nestedComboMode}
                                onChange={(e) => setNestedComboMode(e.target.value)}
                              >
                                <Radio value="flatten">展开拍平</Radio>
                                <Radio value="execute">独立执行</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Response Validation */}
                        <Divider titlePlacement="start" style={{ margin: "8px 0 14px" }}>
                          响应内容与健康校验
                        </Divider>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="违禁词片段 (命中任一即判定失败降级，每行一个)" style={{ marginBottom: 16 }}>
                              <TextArea
                                rows={2}
                                placeholder="如: error: quota exceeded&#10;Service Unavailable"
                                value={forbiddenSubstrings}
                                onChange={(e) => setForbiddenSubstrings(e.target.value)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="必需词片段 (未包含即判定失败降级，每行一个)" style={{ marginBottom: 16 }}>
                              <TextArea
                                rows={2}
                                placeholder="如: 答案:&#10;RESULT"
                                value={requiredSubstrings}
                                onChange={(e) => setRequiredSubstrings(e.target.value)}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item label="最小内容字符数" style={{ marginBottom: 16 }}>
                              <InputNumber
                                min={1}
                                max={100000}
                                placeholder="如: 10"
                                style={{ width: "100%" }}
                                value={minContentLength}
                                onChange={(v) => setMinContentLength(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="流式首字超时 (ms)" style={{ marginBottom: 16 }}>
                              <InputNumber
                                min={1000}
                                max={300000}
                                step={1000}
                                placeholder="如: 15000"
                                style={{ width: "100%" }}
                                value={streamTimeoutMs}
                                onChange={(v) => setStreamTimeoutMs(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item label="整请求总超时 (ms)" style={{ marginBottom: 16 }}>
                              <InputNumber
                                min={1000}
                                max={600000}
                                step={5000}
                                placeholder="如: 60000"
                                style={{ width: "100%" }}
                                value={totalTimeoutMs}
                                onChange={(v) => setTotalTimeoutMs(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Agent Features */}
                        <Divider titlePlacement="start" style={{ margin: "8px 0 14px" }}>
                          Agent 增强规则
                        </Divider>
                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="系统提示词覆盖" style={{ marginBottom: 16 }}>
                              <TextArea
                                rows={2}
                                placeholder="注入特定系统指令，覆盖请求原有的系统提示词"
                                value={systemMessage}
                                onChange={(e) => setSystemMessage(e.target.value)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="工具过滤正则" style={{ marginBottom: 16 }}>
                              <Input
                                placeholder="如: ^(web_search|code_interpreter)$"
                                value={toolFilterRegex}
                                onChange={(e) => setToolFilterRegex(e.target.value)}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item label="最大上下文长度上限" style={{ marginBottom: 0 }}>
                              <InputNumber
                                min={1000}
                                max={2000000}
                                step={1000}
                                placeholder="如: 128000"
                                style={{ width: "100%" }}
                                value={contextLength}
                                onChange={(v) => setContextLength(v || undefined)}
                              />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item label="上下文缓存保护" style={{ marginBottom: 0 }}>
                              <Switch
                                checked={contextCacheProtection}
                                onChange={(v) => setContextCacheProtection(v)}
                              />
                              <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                                隔离保持已命中缓存的提供者连接
                              </Text>
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    ),
                  },
                ]}
              />
            </Form>
          </div>
        )}

        {/* ==================== Section 4: Review & Save ==================== */}
        {configMode === "guided" && currentStep === 3 && (
          <div>
            <div className={styles.reviewCard} style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(139, 92, 246, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcon name="fact_check" size={18} style={{ color: "#8B5CF6" }} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 14 }}>
                    组合配置核对概览
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                    请审查以下即将生效的路由规则与候选调度链路
                  </Text>
                </div>
              </div>

              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    组合标识:
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 13, fontFamily: "monospace" }}>
                      {name || "(未命名)"}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    调度路由策略:
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <Tag color={getStrategyColor(strategy)}>{strategyDef.label}</Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {strategyDef.desc}
                    </Text>
                  </div>
                </Col>

                {customOutputModel && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      返回模型别名覆盖:
                    </Text>
                    <div style={{ fontSize: 12, marginTop: 2, fontFamily: "monospace", color: "#8B5CF6" }}>
                      {customOutputModel}
                    </div>
                  </Col>
                )}

                {description && (
                  <Col span={24}>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      描述说明:
                    </Text>
                    <div style={{ fontSize: 12, marginTop: 4 }}>{description}</div>
                  </Col>
                )}

                <Col span={24}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                    候选目标调度链路 ({models.length} 个):
                  </Text>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {models.map((m, idx) => (
                      <div key={m.id} className={styles.reviewModelItem}>
                        <span
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: "rgba(139, 92, 246, 0.12)",
                            color: "#8B5CF6",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: "bold",
                          }}
                        >
                          {idx + 1}
                        </span>
                        {m.kind === "combo-ref" && (
                          <Tag color="cyan" style={{ margin: 0, fontSize: 10 }}>
                            嵌套组合
                          </Tag>
                        )}
                        {m.kind === "provider-wildcard" && (
                          <Tag color="geekblue" style={{ margin: 0, fontSize: 10 }}>
                            提供商通配
                          </Tag>
                        )}
                        <Text strong style={{ fontSize: 12, fontFamily: "monospace" }}>
                          {getStepDisplayName(m)}
                        </Text>
                        {strategy === "weighted" && (
                          <Tag color="gold" style={{ marginLeft: "auto", margin: 0, fontSize: 10 }}>
                            权重 {m.weight ?? 100}%
                          </Tag>
                        )}
                        {(m as ComboModelStep).fallbackOnlyOnQuotaExhaustion && (
                          <Tag color="orange" style={{ marginLeft: "auto", margin: 0, fontSize: 10 }}>
                            配额独占
                          </Tag>
                        )}
                      </div>
                    ))}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Quick API Snippet */}
            <div className={styles.apiSnippetBox}>
              <Text strong style={{ fontSize: 12, color: "#8B5CF6", display: "block", marginBottom: 6 }}>
                💡 调用示例:
              </Text>
              <div className={styles.apiSnippetCode}>
                curl https://api.omniroute.com/v1/chat/completions \<br />
                &nbsp;&nbsp;-H &quot;Authorization: Bearer $OMNI_KEY&quot; \<br />
                &nbsp;&nbsp;-d &apos;&#123;&quot;model&quot;: &quot;{name || "my-combo"}&quot;, &quot;messages&quot;: [&#123;&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Hello&quot;&#125;]&#125;&apos;
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
