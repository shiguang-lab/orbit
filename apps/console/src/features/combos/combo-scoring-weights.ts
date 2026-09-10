export const COMBO_SCORING_WEIGHTS = {
  quota: 0.1429,
  health: 0.1605,
  costInv: 0.1429,
  latencyInv: 0.1143,
  taskFit: 0.0762,
  stability: 0.0476,
  tierPriority: 0.0476,
  tierAffinity: 0.0476,
  specificityMatch: 0.0476,
  contextAffinity: 0.0476,
  cacheAffinity: 0,
  sessionAvailability: 0.0476,
  resetWindowAffinity: 0,
  connectionDensity: 0.0476,
  quality: 0.03,
} as const;

export type ComboScoringWeight = keyof typeof COMBO_SCORING_WEIGHTS;

export const COMBO_SCORING_WEIGHT_LABELS: Record<ComboScoringWeight, string> = {
  quota: "配额",
  health: "健康度",
  costInv: "成本",
  latencyInv: "延迟",
  taskFit: "任务匹配",
  stability: "稳定性",
  tierPriority: "等级优先级",
  tierAffinity: "等级亲和度",
  specificityMatch: "专用性匹配",
  contextAffinity: "上下文亲和度",
  cacheAffinity: "缓存命中亲和度",
  sessionAvailability: "会话可用性",
  resetWindowAffinity: "重置窗口",
  connectionDensity: "连接分散度",
  quality: "观测质量",
};

export const COMBO_MODE_PACK_OPTIONS = [
  { label: "自定义", value: "custom" },
  { label: "极速响应", value: "ship-fast" },
  { label: "最低成本", value: "cost-saver" },
  { label: "最高质量", value: "quality-first" },
  { label: "离线友好", value: "offline-friendly" },
] as const;
