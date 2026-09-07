/**
 * Combos 页面常量与配置：
 * - 路由策略定义与多语言说明
 * - 自动组合目录模板
 * - Kimi 合作伙伴预设
 * - 智能路由分类与工具函数
 */

export interface RoutingStrategyDef {
  value: string;
  label: string;
  desc: string;
  icon: string;
  category: "intelligent" | "deterministic";
  guide: {
    when: string;
    avoid: string;
    example: string;
  };
  recommendations: {
    title: string;
    description: string;
    tips: string[];
    defaults: Record<string, unknown>;
  };
}

export const ROUTING_STRATEGIES: RoutingStrategyDef[] = [
  {
    value: "priority",
    label: "优先级回退",
    desc: "顺序回退：优先尝试模型 1，遇到失败时回退到模型 2，以此类推",
    icon: "sort",
    category: "deterministic",
    guide: {
      when: "有明确主力模型，并需要一个或多个备用模型兜底时",
      avoid: "各提供者质量对等且需要分担流量的场景",
      example: "主力为 Claude 3.7 Sonnet，备用为 DeepSeek-V3",
    },
    recommendations: {
      title: "高可用兜底配置",
      description: "配置 1 次重试以过滤瞬时抖动，同时为主力模型开启重试",
      tips: ["重试次数设为 1", "重试间隔设为 2000ms", "设置明确的备用模型"],
      defaults: { maxRetries: 1, retryDelayMs: 2000 },
    },
  },
  {
    value: "weighted",
    label: "权重分流",
    desc: "按照设定的权重百分比分配流量，单点失败时回退到其他候选",
    icon: "percent",
    category: "deterministic",
    guide: {
      when: "需要在多个可用提供者之间按比例分流（例如 70/30 A/B 测试或配额平衡）时",
      avoid: "模型之间能力或输出质量差距很大的场景",
      example: "70% 流量给 GPT-4o，30% 流量给 Claude 3.5 Sonnet",
    },
    recommendations: {
      title: "按比例负载分流",
      description: "确保所有模型的权重总和为 100%，以达到预期的流量分布",
      tips: ["所有模型权重和为 100%", "开启重试以便失败时尝试其他模型"],
      defaults: { maxRetries: 1, retryDelayMs: 1500 },
    },
  },
  {
    value: "round-robin",
    label: "循环轮询",
    desc: "均匀分发：每个新请求按顺序轮换到下一个模型或账户",
    icon: "autorenew",
    category: "deterministic",
    guide: {
      when: "多个同级账户或对等提供者需要均匀分摊 RPM/TPM 限制时",
      avoid: "模型间延迟或单价差异巨大的场景",
      example: "轮流使用 3 个不同的 OpenAI 账户分摊 RPM 限额",
    },
    recommendations: {
      title: "均匀负载分发",
      description: "跨提供者均分请求，避免单一账户触碰限速",
      tips: ["适合添加同模型的多个账户", "失败时快速回退到下一节点"],
      defaults: { maxRetries: 1, retryDelayMs: 1000 },
    },
  },
  {
    value: "cost-optimized",
    label: "成本优先",
    desc: "根据当前定价数据，自动优先路由到单价最低的可用模型",
    icon: "savings",
    category: "deterministic",
    guide: {
      when: "对成本敏感，且候选模型均能满足基本任务需求时",
      avoid: "任务对高质量推理有严格要求且廉价模型无法胜任时",
      example: "优先调用 DeepSeek-V3，失败再升级到 Claude 3.5 Sonnet",
    },
    recommendations: {
      title: "成本智能节约",
      description: "根据已录入的每百万 token 定价优先选择最便宜的节点",
      tips: ["确保在系统中录入了候选模型的定价数据", "可配合配额监控使用"],
      defaults: { maxRetries: 1, retryDelayMs: 2000 },
    },
  },
  {
    value: "least-used",
    label: "最少使用",
    desc: "优先选择当前累计请求数最少的节点，动态平衡系统负载",
    icon: "low_priority",
    category: "deterministic",
    guide: {
      when: "长连接或多账户长期运行，需要自动平衡调用总量时",
      avoid: "需要确定性先后顺序的场景",
      example: "多个同款 API 镜像节点之间的长效平摊",
    },
    recommendations: {
      title: "自适应平衡",
      description: "动态感知请求总量并自适应倾向使用量较少的节点",
      tips: ["适合多账户绑定", "无需手动调节权重"],
      defaults: { maxRetries: 1 },
    },
  },
  {
    value: "random",
    label: "随机分发",
    desc: "均匀随机选择一个模型发起调用，失败时在剩余模型中回退",
    icon: "shuffle",
    category: "deterministic",
    guide: {
      when: "需要无状态、简单的并发分散时",
      avoid: "需要可复现路径或有序回退的业务流程",
      example: "简单的数据抓取或大批量非关键批处理请求",
    },
    recommendations: {
      title: "随机离散分发",
      description: "随机抽取节点并发请求，减小局部热点",
      tips: ["无需配置权重", "支持单点失败回退"],
      defaults: { maxRetries: 1 },
    },
  },
  {
    value: "strict-random",
    label: "洗牌池随机",
    desc: "每个候选模型使用一次后再重新洗牌，确保无偏差的随机覆盖",
    icon: "casino",
    category: "deterministic",
    guide: {
      when: "评测或基准测试时需要均匀打散且不偏向某一个模型时",
      avoid: "普通生产故障兜底场景",
      example: "基准测试评估各提供者的响应质量分布",
    },
    recommendations: {
      title: "洗牌池机制",
      description: "一轮周期内保证每个节点均被尝试一次",
      tips: ["适合评测与对比场景"],
      defaults: {},
    },
  },
  {
    value: "context-relay",
    label: "上下文接力",
    desc: "在账户轮换或耗尽时，通过自动生成结构化交接摘要保持会话连贯性",
    icon: "sync_alt",
    category: "deterministic",
    guide: {
      when: "长会话、长时间编程助手（如 Codex）轮换账户时避免丢失历史上下文",
      avoid: "无状态的一次性独立单轮对话",
      example: "Codex 账户轮流切换并延续当前编辑任务的上下文",
    },
    recommendations: {
      title: "长会话无缝交接",
      description: "当账户配额达到交接阈值时自动生成压缩摘要延续给下一节点",
      tips: ["交接阈值通常设为 0.85", "摘要最大历史消息数设为 30"],
      defaults: { handoffThreshold: 0.85, maxMessagesForSummary: 30 },
    },
  },
  {
    value: "reset-aware",
    label: "配额复位感知",
    desc: "综合考量剩余配额与 5 小时 / 每周重置窗口，对同分节点进行轮询",
    icon: "event_repeat",
    category: "deterministic",
    guide: {
      when: "使用具有固定重置周期的订阅类或免费额度账户时",
      avoid: "按量付费的官方直连 API",
      example: "多个具有 5 小时配额刷新周期的 Claude 账户",
    },
    recommendations: {
      title: "智能周期复位",
      description: "优先消耗即将到达重置周期的账户额度，最大化额度利用率",
      tips: ["搭配带刷新周期的账户效果最佳"],
      defaults: {},
    },
  },
  {
    value: "cache-optimized",
    label: "缓存亲和优化",
    desc: "将具有相同可复用提示词前缀的请求一致性路由到相同节点，最大化命中 Prompt Cache",
    icon: "cached",
    category: "deterministic",
    guide: {
      when: "系统大量使用长 System Prompt 或代码库上下文，且提供者支持 Prompt Caching 时",
      avoid: "短提示词且无复用价值的场景",
      example: "Claude 3.5 Sonnet 长上下文代码生成提示词缓存",
    },
    recommendations: {
      title: "前缀一致性哈希",
      description: "保持前缀哈希一致，大幅降低长上下文的输入 token 费用与延迟",
      tips: ["适合支持 Prompt Cache 的 Anthropic / DeepSeek 节点"],
      defaults: {},
    },
  },
  {
    value: "fusion",
    label: "多专家融合",
    desc: "将提示词并行分发给各个专家模型，再由裁判模型综合归纳生成最终回答",
    icon: "hub",
    category: "deterministic",
    guide: {
      when: "高精度综合研究、代码审查或复杂决策需要多视角交叉验证时",
      avoid: "对延迟极度敏感或成本极其敏感的简单任务",
      example: "同时发给 GPT-4o、Claude 3.7、DeepSeek-R1，由 GPT-4o 裁判融合",
    },
    recommendations: {
      title: "多模型专家组",
      description: "设定裁判模型和宽限超时时间，兼顾综合质量与响应速度",
      tips: ["最小专家响应数建议为 2", "落后模型宽限时间建议为 8000ms"],
      defaults: { fusionMinPanel: 2, fusionStragglerGraceMs: 8000 },
    },
  },
  {
    value: "auto",
    label: "智能自适应 (Auto)",
    desc: "基于任务分类、模型能力画像与实时健康指标自动动态分发",
    icon: "auto_awesome",
    category: "intelligent",
    guide: {
      when: "无需人工维护复杂的固定组合，希望系统全自动按最佳适配路由时",
      avoid: "需要百分百确定性固定模型输出的严格测试场景",
      example: "auto/best-coding 自动解析最高质量的代码模型",
    },
    recommendations: {
      title: "全自动智能路由",
      description: "系统根据任务语义自动选择综合得分最优的候选者",
      tips: ["可选择不同的模式包（平衡、速度优先、质量优先）"],
      defaults: {},
    },
  },
  {
    value: "lkgp",
    label: "LKGP 自愈评分",
    desc: "基于实时成功率、P50/P95 延迟与可用性动态评分（Last Known Good Provider）",
    icon: "verified",
    category: "intelligent",
    guide: {
      when: "提供者经常出现网络波动或速率限制，需要自愈排障与评分自动调整时",
      avoid: "纯单节点调用",
      example: "在多家三方中转与官方 API 之间根据健康度动态调权",
    },
    recommendations: {
      title: "自愈动态调度",
      description: "实时调降报错节点的选择概率，恢复健康后自动重新激活",
      tips: ["适合大规模高可用网关场景"],
      defaults: {},
    },
  },
];

export const STRATEGY_MAP = new Map<string, RoutingStrategyDef>(
  ROUTING_STRATEGIES.map((s) => [s.value, s]),
);

export function getStrategyDef(strategy: string): RoutingStrategyDef {
  return (
    STRATEGY_MAP.get(strategy) || {
      value: strategy,
      label: strategy,
      desc: "自定义路由策略",
      icon: "layers",
      category: "deterministic",
      guide: {
        when: "自定义策略场景",
        avoid: "不适用的场景",
        example: "默认示例",
      },
      recommendations: {
        title: "默认配置",
        description: "默认推荐设置",
        tips: ["按需配置各参数"],
        defaults: {},
      },
    }
  );
}

export function isIntelligentStrategy(strategy?: string | null): boolean {
  if (!strategy) return false;
  const def = STRATEGY_MAP.get(strategy);
  return def?.category === "intelligent" || strategy === "auto" || strategy === "lkgp";
}

export function getStrategyCategory(strategy?: string | null): "intelligent" | "deterministic" {
  return isIntelligentStrategy(strategy) ? "intelligent" : "deterministic";
}

export function getStrategyColor(strategy?: string | null): string {
  switch (strategy) {
    case "priority":
      return "blue";
    case "round-robin":
      return "green";
    case "weighted":
      return "gold";
    case "cost-optimized":
      return "cyan";
    case "least-used":
      return "geekblue";
    case "random":
      return "purple";
    case "context-relay":
      return "magenta";
    case "reset-aware":
      return "lime";
    case "fill-first":
      return "orange";
    case "lkgp":
    case "auto":
    case "p2c":
      return "volcano";
    default:
      return "blue";
  }
}

export function normalizeIntelligentRoutingFilter(filter?: string | null): "all" | "intelligent" | "deterministic" {
  if (filter === "intelligent") return "intelligent";
  if (filter === "deterministic") return "deterministic";
  return "all";
}

/* ---------------- 自动组合模板 ---------------- */

export interface AutoComboTemplate {
  name: string;
  displayName: string;
  categories: string[];
  tiers: string[];
  strategy: string;
  description?: string;
  systemMessage?: string;
}

export const AUTO_COMBO_TEMPLATES: AutoComboTemplate[] = [
  {
    name: "auto/best-coding",
    displayName: "最佳编程",
    categories: ["coding"],
    tiers: ["premium", "balanced"],
    strategy: "weighted",
    description: "专为代码生成、重构与问题调试打造的最佳模型组合",
    systemMessage: "You are an expert coding assistant. Write clean, efficient, well-documented code.",
  },
  {
    name: "auto/best-reasoning",
    displayName: "深度推理",
    categories: ["reasoning_deep", "reasoning"],
    tiers: ["premium"],
    strategy: "weighted",
    description: "针对多步逻辑推理、数学推导与复杂算法问题",
    systemMessage: "You are a deep reasoning assistant. Think carefully step by step.",
  },
  {
    name: "auto/best-fast",
    displayName: "极速响应",
    categories: ["fast"],
    tiers: ["fast", "balanced"],
    strategy: "weighted",
    description: "亚秒级响应，专为简短问答、分类与摘要优化的轻量模型组合",
  },
  {
    name: "auto/best-vision",
    displayName: "多模态视觉",
    categories: ["vision"],
    tiers: ["premium", "balanced"],
    strategy: "weighted",
    description: "支持图像输入分析与图文理解的多模态能力组合",
  },
  {
    name: "auto/best-chat",
    displayName: "通用对话",
    categories: ["chat"],
    tiers: ["balanced", "premium"],
    strategy: "weighted",
    description: "日常聊天、文案润色与通用问答的均衡组合",
  },
  {
    name: "auto/best-coding-fast",
    displayName: "极速编程",
    categories: ["coding", "fast"],
    tiers: ["fast", "balanced"],
    strategy: "weighted",
    description: "兼顾编程能力与超低延迟的代码补全组合",
  },
  {
    name: "auto/pro-coding",
    displayName: "旗舰编程",
    categories: ["coding"],
    tiers: ["premium"],
    strategy: "priority",
    description: "仅锁定顶级旗舰模型的严肃软件工程组合",
    systemMessage: "You are an expert coding assistant. Write clean, efficient, well-documented code.",
  },
  {
    name: "auto/pro-reasoning",
    displayName: "旗舰推理",
    categories: ["reasoning_deep"],
    tiers: ["premium"],
    strategy: "priority",
    description: "严选顶级长思考推理模型",
    systemMessage: "You are a deep reasoning assistant. Think carefully step by step.",
  },
  {
    name: "auto/pro-vision",
    displayName: "旗舰视觉",
    categories: ["vision"],
    tiers: ["premium"],
    strategy: "priority",
    description: "仅锁定顶级旗舰多模态模型的高精度图文分析组合",
  },
  {
    name: "auto/pro-chat",
    displayName: "旗舰对话",
    categories: ["chat"],
    tiers: ["premium"],
    strategy: "priority",
    description: "锁定顶级旗舰模型的高质量通用对话组合",
  },
  {
    name: "auto/pro-fast",
    displayName: "旗舰极速",
    categories: ["fast"],
    tiers: ["fast"],
    strategy: "priority",
    description: "低延迟与高性能兼备的旗舰快速分发组合",
  },
  {
    name: "auto/coding",
    displayName: "标准编程",
    categories: ["coding"],
    tiers: ["balanced", "fast", "premium"],
    strategy: "weighted",
    description: "覆盖全梯队编程能力模型的加权组合",
  },
  {
    name: "auto/fast",
    displayName: "标准极速",
    categories: ["fast"],
    tiers: ["fast"],
    strategy: "weighted",
    description: "超低延迟模型的通用分发组合",
  },
  {
    name: "auto/chat",
    displayName: "标准对话",
    categories: ["chat"],
    tiers: ["balanced", "fast"],
    strategy: "weighted",
    description: "日常问答与文本处理的标准加权组合",
  },
  {
    name: "auto/claude-opus",
    displayName: "Claude Opus 专属",
    categories: ["reasoning_deep", "coding", "reasoning"],
    tiers: ["premium"],
    strategy: "priority",
    description: "优先锁定 Claude 3 / 3.5 / 3.7 Opus 级别的高阶推理组合",
  },
  {
    name: "auto/claude-sonnet",
    displayName: "Claude Sonnet 专属",
    categories: ["coding", "reasoning", "chat"],
    tiers: ["premium", "balanced"],
    strategy: "priority",
    description: "优先锁定 Claude Sonnet 级别的全能编程与推理组合",
  },
  {
    name: "auto/best-free",
    displayName: "全免费组合",
    categories: ["coding", "chat", "fast"],
    tiers: ["free"],
    strategy: "weighted",
    description: "完全基于已接入免费额度提供者的零成本路由组合",
    systemMessage: "You are a helpful coding assistant. Write clean, efficient code.",
  },
];

/* ---------------- Kimi 预设 ---------------- */

export const KIMI_CODING_PRESET_NAME = "Kimi Coding";

export const KIMI_CODING_PRESET = {
  name: KIMI_CODING_PRESET_NAME,
  strategy: "priority",
  models: [
    { id: "kimi-1", kind: "model" as const, providerId: "moonshot", model: "kimi-k3", weight: 100 },
    { id: "kimi-2", kind: "model" as const, providerId: "kimi-coding", model: "k3", weight: 100 },
    { id: "kimi-3", kind: "model" as const, providerId: "kimi-web", model: "k3", weight: 100 },
  ],
};

export function hasKimiCodingPreset(combos: Array<{ name?: string | null }>): boolean {
  return combos.some((c) => c?.name === KIMI_CODING_PRESET_NAME);
}

/* ---------------- Step Helpers ---------------- */

export function getStepDisplayName(step: import("@orbit/contracts").ComboStep): string {
  if ("model" in step && typeof step.model === "string") return step.model;
  if ("comboName" in step && typeof step.comboName === "string") return `combo:${step.comboName}`;
  if ("modelPattern" in step && typeof step.modelPattern === "string")
    return `${step.providerId || "any"}/${step.modelPattern}`;
  return "unknown";
}

export function getStepProvider(step: import("@orbit/contracts").ComboStep): string | undefined {
  if ("providerId" in step && typeof step.providerId === "string") return step.providerId;
  return undefined;
}

export function getStepConnection(step: import("@orbit/contracts").ComboStep): string | undefined {
  if ("connectionId" in step && typeof step.connectionId === "string") return step.connectionId;
  return undefined;
}

/* ---------------- 校验规则 ---------------- */

export const VALID_NAME_REGEX = /^[a-zA-Z0-9_/.\-\[\] ]+$/;

export function validateComboName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "请输入组合名称";
  if (!VALID_NAME_REGEX.test(trimmed)) return "名称只能包含字母、数字、-、_、/、.、[] 或空格";
  if (trimmed.length > 120) return "名称长度不能超过 120 个字符";
  return null;
}

export function sanitizeComboRuntimeConfig(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) return {};
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (v !== undefined && v !== null) {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

export const QUICK_MODEL_PRESETS = [
  "Claude 3.7 Sonnet",
  "Claude 3.5 Sonnet",
  "GPT-4o",
  "GPT-4o mini",
  "DeepSeek-V3",
  "DeepSeek-R1",
  "Gemini 2.0 Flash",
  "Gemini 2.5 Pro",
  "Qwen 2.5 72B",
  "Kimi K3",
];

