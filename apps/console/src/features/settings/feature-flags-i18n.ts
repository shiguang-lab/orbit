export interface LocalizedFlagText {
  label: string;
  description: string;
}

export const CATEGORY_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
  all: { zh: "全部分类", en: "All categories" },
  security: { zh: "安全", en: "Security" },
  network: { zh: "网络", en: "Network" },
  policies: { zh: "策略", en: "Policies" },
  runtime: { zh: "运行时", en: "Runtime" },
  cli: { zh: "CLI", en: "CLI" },
  health: { zh: "健康状况", en: "Health" },
};

export const ENUM_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
  off: { zh: "关闭", en: "Off" },
  warn: { zh: "警告", en: "Warn" },
  block: { zh: "拦截", en: "Block" },
  redact: { zh: "脱敏", en: "Redact" },
  disabled: { zh: "已禁用", en: "Disabled" },
  dual: { zh: "双重 (兼容)", en: "Dual" },
  alias: { zh: "短别名", en: "Alias" },
  canonical: { zh: "规范前缀", en: "Canonical" },
};

export const FEATURE_FLAG_TRANSLATIONS_ZH: Record<string, LocalizedFlagText> = {
  // ── Security ──
  REQUIRE_API_KEY: {
    label: "强制要求 API 密钥",
    description: "所有传入请求都必须携带已配置的 API 密钥。",
  },
  INPUT_SANITIZER_ENABLED: {
    label: "输入净化器",
    description: "为所有传入请求启用输入净化与安全过滤。",
  },
  INJECTION_GUARD_MODE: {
    label: "提示词注入防御模式",
    description: "设置针对 Prompt 注入攻击的防护模式（关闭 / 警告 / 拦截 / 脱敏）。",
  },
  PII_REDACTION_ENABLED: {
    label: "请求 PII 个人隐私脱敏",
    description: "对请求内容中的个人身份隐私信息（PII）进行自动识别与脱敏处理。",
  },
  PII_RESPONSE_SANITIZATION: {
    label: "响应 PII 个人隐私净化",
    description: "对模型提供商返回的响应内容中的个人隐私信息进行脱敏净化。",
  },
  PII_RESPONSE_SANITIZATION_MODE: {
    label: "响应 PII 净化处理模式",
    description: "选择如何处理响应中的 PII：redact（脱敏替换）、warn（仅记录警告）、block（拒绝响应）、off（禁用净化）。",
  },
  OUTBOUND_SSRF_GUARD_ENABLED: {
    label: "出站 SSRF 防御拦截",
    description: "拦截发往私有 IP、局域网或内部保留 IP 地址段的危险出站请求。",
  },
  ALLOW_API_KEY_REVEAL: {
    label: "允许查看完整 API 密钥",
    description: "允许已认证的管理员在控制台中点击查看已存储凭证的完整明文，而非仅显示掩码。",
  },
  AUTH_LOG_INCLUDE_ACCOUNT_ID: {
    label: "认证日志输出账号 ID",
    description: "在 AUTH 认证日志中打印账号前缀标识。默认关闭以避免在共享日志中暴露账号标识。",
  },
  SHIGUANG_GATEWAY_OIDC_DISABLE_PASSWORD_LOGIN: {
    label: "OIDC 启用时禁用密码登录",
    description: "启用 OIDC 单点登录时，禁用传统用户名密码登录，仅允许 OIDC 方式登录。",
  },

  // ── Network ──
  ENABLE_TLS_FINGERPRINT: {
    label: "TLS 客户端指纹伪装",
    description: "启用出站请求的 TLS 客户端指纹伪装隐身模式（需重启生效）。",
  },
  AUDIO_REMOTE_PROVIDER_NODES: {
    label: "允许远程音频节点",
    description: "允许 /v1/audio/* 路由使用非本机（非 localhost）的 OpenAI 兼容提供者节点。",
  },
  ONEPROXY_ENABLED: {
    label: "启用 1Proxy 代理",
    description: "开启 1proxy 请求代理支持与链路集成。",
  },
  PROXY_AUTO_SELECT_ENABLED: {
    label: "代理自动降级回退",
    description: "当连接未明确分配代理时，自动选择第一个可用注册表代理。默认关闭，防止单个代理成为全局兜底。",
  },
  SHIGUANG_GATEWAY_CONTROL_PLANE_PROXY_DIRECT_FALLBACK: {
    label: "控制面代理直连回退",
    description: "当预分配代理不可达时，允许 OAuth 授权与提供商验证流程自动降级为直连绕过代理。",
  },
  NETWORK_ROTATION_SHARED_EGRESS_GUARD: {
    label: "共享出口网络轮换防护",
    description: "在多账号轮换发生网络超时时，对无专用代理的同出口账号执行短冷却跳过，减少雪崩风险。",
  },
  MITM_DISABLE_TLS_VERIFY: {
    label: "禁用 MITM TLS 证书校验",
    description: "禁用 MITM 调试代理的 TLS 证书合法性验证（仅建议调试环境开启，需重启生效）。",
  },
  SHIGUANG_GATEWAY_ALLOW_PRIVATE_PROVIDER_URLS: {
    label: "允许私网提供者地址",
    description: "允许添加指向私有或内部专用网络 IP 的模型提供者端点 URL。",
  },
  SHIGUANG_GATEWAY_ALLOW_LOCAL_PROVIDER_URLS: {
    label: "允许本地提供商 URL",
    description: "允许添加和校验运行在 localhost、局域网及私有 IP 的模型提供者（本地 Ollama/vLLM 必需，默认开启）。",
  },
  ENABLE_CC_COMPATIBLE_PROVIDER: {
    label: "启用 Claude Code 兼容模式",
    description: "开启兼容 Claude Code 规范的专用提供商桥接模式（需重启生效）。",
  },

  // ── Policies ──
  TOOL_POLICY_MODE: {
    label: "工具调用策略执行模式",
    description: "控制针对 Tool / Function Call 工具调用的执行策略（已禁用 / 警告 / 拦截）。",
  },
  RATE_LIMIT_AUTO_ENABLE: {
    label: "自适应智能限流",
    description: "根据实际流量调用模式自动激活速率限制保护。",
  },
  DISABLE_CONTEXT_WINDOW_CHECKS: {
    label: "禁用上下文窗口长度检查",
    description: "跳过单模型直接请求时的本地 context-window 与最大输入 token 校验，由上游提供商自行限制。",
  },
  CAPABILITY_FILTER_ENABLED: {
    label: "模型能力前置过滤器",
    description: "在请求分发前校验目标模型是否具备所需能力（视觉、工具调用、结构化输出等），不满足则提前拒绝。",
  },
  RADAR_ENABLED: {
    label: "模型雷达 (Radar)",
    description: "开启 ShiguangGateway 模型雷达模块与目录订阅同步功能界面。",
  },

  // ── Runtime ──
  RESPONSES_PASSTHROUGH_DROP_COMMENTARY: {
    label: "透传时过滤内部思维注释",
    description: "在将 Responses API 透传流发送给客户端之前，自动剔除上游内部注释输出阶段内容。",
  },
  SHIGUANG_GATEWAY_MCP_ENFORCE_SCOPES: {
    label: "强制执行 MCP 工具权限作用域",
    description: "对 MCP 客户端工具访问强制执行细粒度权限作用域隔离与校验。",
  },
  SHIGUANG_GATEWAY_MCP_COMPRESS_DESCRIPTIONS: {
    label: "压缩 MCP 工具描述",
    description: "自动压缩精简 MCP 工具的 Schema 描述文本以大幅节省上下文 Token 占用。",
  },
  SHIGUANG_GATEWAY_ENABLE_RUNTIME_BACKGROUND_TASKS: {
    label: "启用运行时后台任务",
    description: "在网关运行时开启异步后台常驻任务与调度处理。",
  },
  SHIGUANG_GATEWAY_DISABLE_BACKGROUND_SERVICES: {
    label: "禁用所有后台服务",
    description: "禁用配额定期扫描、自动同步等所有后台服务（需重启生效）。",
  },
  SHIGUANG_GATEWAY_RTK_TRUST_PROJECT_FILTERS: {
    label: "信任项目级 RTK 过滤器",
    description: "允许直接信任来自项目层级的 RTK 过滤规则无需额外二次校验。",
  },
  SHIGUANG_GATEWAY_ENABLE_LIVE_WS: {
    label: "实时仪表盘 WebSocket 服务",
    description: "在端口 20132 上启动实时遥测与日志推送 WebSocket 服务（需重启生效）。",
  },
  SHIGUANG_GATEWAY_CODEX_WS_ENABLED: {
    label: "Codex WebSocket 传输通道",
    description: "允许 Codex 客户端通过 WebSocket 长连接传输 Responses（关闭时自动回退为 HTTP）。",
  },
  SHIGUANG_GATEWAY_CODEX_APP_SERVER_ENABLED: {
    label: "Codex App-Server 协议通道",
    description: "允许 Codex 客户端使用本地 app-server WebSocket JSON-RPC 协议通道。",
  },
  SHIGUANG_GATEWAY_EMERGENCY_FALLBACK: {
    label: "紧急免费额度兜底降级",
    description: "当目标模型配额或预算耗尽时，自动将请求紧急降级路由至可用的免费备用模型。",
  },
  STREAM_RECOVERY_ENABLED: {
    label: "流式中断早期自动重试",
    description: "在首字节送达客户端前，若上游 SSE 流异常中断则无感发起早期重试。",
  },
  STREAM_RECOVERY_MIDSTREAM_ENABLED: {
    label: "流式中途断线无缝拼接恢复",
    description: "允许流式响应在部分字节已发送给客户端后，自动向上游重新请求并继续拼接输出。",
  },
  MODEL_CATALOG_INCLUDE_NAMES: {
    label: "模型名录输出易读名称",
    description: "在 /v1/models 接口响应中附带易于阅读的模型友好显示名称。",
  },
  MODELS_CATALOG_PREFIX_MODE: {
    label: "模型名录 ID 前缀输出模式",
    description: "控制 /v1/models 返回的模型 ID 前缀格式：dual（同时输出别名与规范 ID）、alias（仅短别名）、canonical（仅完整前缀）。",
  },
  ARENA_ELO_SYNC_ENABLED: {
    label: "LMSYS Arena 竞技场天梯同步",
    description: "定期自动同步 LMSYS Arena ELO 权威大模型排行榜数据用于智能路由与排名评估。",
  },
  EXPOSE_CC_DISCOVERY_ALIASES: {
    label: "暴露 Claude Code 发现别名",
    description: "在 /v1/models 广播 claude/<provider>/<model> 镜像别名，使 Claude Code 能发现非 Claude 模型。",
  },
  SHIGUANG_GATEWAY_CHAT_VIRTUAL_LANES: {
    label: "自适应多租户虚拟准入队列",
    description: "开启按租户隔离的自适应虚拟分发队列，防止单个租户并发脉冲打满全局连接池导致其他租户 503（需重启生效）。",
  },
  EXPOSE_FUNCTIONAL_GATEWAY_MIRRORS: {
    label: "暴露网关功能镜像别名",
    description: "在 /v1/models 广播网关镜像别名，方便跨通道调用已授权凭证的代理模型。",
  },
  NEWAPI_AGGREGATOR_BALANCE: {
    label: "New-API / One-API 聚合器余额检测",
    description: "开启对 New-API、One-API、Sub2API 等第三方聚合节点的账户余额自动检测与看板展示。",
  },

  // ── CLI ──
  CLI_COMPAT_ALL: {
    label: "全局 CLI 客户端兼容模式",
    description: "为所有命令行 CLI 客户端激活全套向下兼容垫片（需重启生效）。",
  },
  MODEL_ALIAS_COMPAT_ENABLED: {
    label: "模型别名全量兼容层",
    description: "启用模型名称与别名智能映射兼容层，自动适配各类异构客户端的模型别名请求。",
  },
  PRICING_SYNC_ENABLED: {
    label: "自动同步模型定价数据",
    description: "从官方源自动同步最新的 Token 输入输出单价用于成本精算（需环境变量 PRICING_SYNC_ENABLED 配合）。",
  },
  SHIGUANG_GATEWAY_AUTO_SYNC_CODEX_PROFILES: {
    label: "自动同步 Codex 配置文件",
    description: "提供商模型目录更新后，自动从实时名录重新生成 ~/.codex/*.config.toml 配置文件（默认关闭）。",
  },
  SHIGUANG_GATEWAY_AUTO_SYNC_CLAUDE_PROFILES: {
    label: "自动同步 Claude Code 配置文件",
    description: "提供商模型目录更新后，自动从实时名录重新生成 ~/.claude/profiles/ 配置（默认关闭）。",
  },

  // ── Health ──
  SHIGUANG_GATEWAY_DISABLE_LOCAL_HEALTHCHECK: {
    label: "禁用本地实例健康探测",
    description: "禁用网关本机本地探测端点的健康状态扫描。",
  },
  SHIGUANG_GATEWAY_DISABLE_TOKEN_HEALTHCHECK: {
    label: "禁用凭证 Token 有效性探测",
    description: "禁用连接凭证 Token 的周期性后台活性健康检测。",
  },
  SKILLS_SANDBOX_NETWORK_ENABLED: {
    label: "允许技能沙箱网络访问",
    description: "允许沙箱环境中的智能体技能（Agent Skills）访问外部公网网络。",
  },
};

export function getLocalizedFlag(
  flag: { key: string; label: string; description: string },
  locale: string
): { label: string; description: string } {
  if (locale === "zh-CN") {
    const zh = FEATURE_FLAG_TRANSLATIONS_ZH[flag.key];
    if (zh) {
      return {
        label: zh.label || flag.label,
        description: zh.description || flag.description,
      };
    }
  }
  return {
    label: flag.label,
    description: flag.description,
  };
}

export function getLocalizedCategory(category: string, locale: string): string {
  if (locale === "zh-CN") {
    return CATEGORY_TRANSLATIONS[category]?.zh || category;
  }
  return CATEGORY_TRANSLATIONS[category]?.en || category;
}

export function getLocalizedEnum(val: string, locale: string): string {
  if (locale === "zh-CN") {
    return ENUM_TRANSLATIONS[val]?.zh || val;
  }
  return ENUM_TRANSLATIONS[val]?.en || val;
}
