export interface EndpointCardDef {
  id: string;
  title: string;
  path: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  badge?: string;
  category: "core" | "media" | "search" | "utility";
  description: string;
  defaultModel?: string;
  exampleBody?: Record<string, unknown>;
}

export const ENDPOINT_CATEGORIES = [
  { key: "core", title: "核心接口", icon: "hub", color: "#3B82F6" },
  { key: "media", title: "多模态与媒体生成", icon: "perm_media", color: "#8B5CF6" },
  { key: "search", title: "联网与检索", icon: "travel_explore", color: "#06B6D4" },
  { key: "utility", title: "通用与管理端点", icon: "build", color: "#F59E0B" },
] as const;

export const OFFICIAL_ENDPOINTS: EndpointCardDef[] = [
  // 核心接口
  {
    id: "chat-completions",
    title: "对话补全",
    path: "/v1/chat/completions",
    icon: "chat",
    iconColor: "#3B82F6",
    iconBg: "rgba(59, 130, 246, 0.1)",
    category: "core",
    badge: "OpenAI",
    description: "标准对话补全接口，支持流式 SSE、多轮历史、函数调用与多模态输入。",
    defaultModel: "gpt-4o",
    exampleBody: {
      model: "gpt-4o",
      messages: [{ role: "user", content: "你好！请简要介绍一下智枢网关。" }],
      stream: false,
    },
  },
  {
    id: "responses",
    title: "结构化响应",
    path: "/v1/responses",
    icon: "code",
    iconColor: "#6366F1",
    iconBg: "rgba(99, 102, 241, 0.1)",
    category: "core",
    description: "OpenAI Responses API 规范，支持结构化 JSON Schema 输出约束与自动纠错。",
    defaultModel: "gpt-4o",
    exampleBody: {
      model: "gpt-4o",
      input: "提取联系方式: 张三 电话 13800000000",
    },
  },
  {
    id: "completions-legacy",
    title: "传统文本补全",
    path: "/v1/completions",
    icon: "text_fields",
    iconColor: "#F97316",
    iconBg: "rgba(249, 115, 22, 0.1)",
    category: "core",
    description: "经典单轮 Prompt 续写与代码补全接口，兼容各类旧版插件与 SDK。",
    defaultModel: "gpt-3.5-turbo-instruct",
    exampleBody: {
      model: "gpt-3.5-turbo-instruct",
      prompt: "function fibonacci(n) {",
      max_tokens: 50,
    },
  },
  {
    id: "messages-api",
    title: "Anthropic Messages",
    path: "/v1/messages",
    icon: "psychology",
    iconColor: "#A855F7",
    iconBg: "rgba(168, 85, 247, 0.1)",
    category: "core",
    badge: "Anthropic",
    description: "原生 Anthropic Messages 协议端点，直接接收 Claude 原生请求并自动路由。",
    defaultModel: "claude-3-7-sonnet-20250219",
    exampleBody: {
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [{ role: "user", content: "Hello Claude!" }],
    },
  },

  // 多模态与媒体生成
  {
    id: "embeddings",
    title: "向量嵌入",
    path: "/v1/embeddings",
    icon: "data_array",
    iconColor: "#10B981",
    iconBg: "rgba(16, 185, 129, 0.1)",
    category: "media",
    description: "生成高维稠密文本向量，支持多模态向量化、批量处理与维度裁剪。",
    defaultModel: "text-embedding-3-small",
    exampleBody: {
      model: "text-embedding-3-small",
      input: ["智枢大模型网关", "统一路由调度"],
    },
  },
  {
    id: "images-generations",
    title: "图像生成",
    path: "/v1/images/generations",
    icon: "image",
    iconColor: "#EC4899",
    iconBg: "rgba(236, 72, 153, 0.1)",
    category: "media",
    description: "文本生成图像端点，支持多尺寸、多比例与画质质量参数设置。",
    defaultModel: "dall-e-3",
    exampleBody: {
      model: "dall-e-3",
      prompt: "A high tech AI server in neon cyberspace",
      size: "1024x1024",
    },
  },
  {
    id: "images-edits",
    title: "图像编辑与重绘",
    path: "/v1/images/edits",
    icon: "edit_square",
    iconColor: "#8B5CF6",
    iconBg: "rgba(139, 92, 246, 0.1)",
    category: "media",
    description: "基于原始图像与 Mask 遮罩执行区域重绘、扩图与风格迁移。",
    defaultModel: "dall-e-2",
  },
  {
    id: "audio-transcriptions",
    title: "语音听写转录",
    path: "/v1/audio/transcriptions",
    icon: "mic",
    iconColor: "#F43F5E",
    iconBg: "rgba(244, 63, 94, 0.1)",
    category: "media",
    description: "语音转文本（STT），支持多语言自动识别、时间戳与标点修正。",
    defaultModel: "whisper-1",
  },
  {
    id: "audio-speech",
    title: "语音合成朗读",
    path: "/v1/audio/speech",
    icon: "record_voice_over",
    iconColor: "#06B6D4",
    iconBg: "rgba(6, 182, 212, 0.1)",
    category: "media",
    description: "文本转语音（TTS），支持多种拟真人声音色、流式音频与语速微调。",
    defaultModel: "tts-1",
    exampleBody: {
      model: "tts-1",
      input: "欢迎使用智枢统一大模型网关！",
      voice: "alloy",
    },
  },

  // 联网与检索
  {
    id: "web-search",
    title: "Web 实时搜索",
    path: "/v1/search",
    icon: "travel_explore",
    iconColor: "#06B6D4",
    iconBg: "rgba(6, 182, 212, 0.1)",
    category: "search",
    description: "提供跨搜索引擎（Tavily、Google、Bing 等）的实时网页搜索中继。",
    defaultModel: "tavily-search",
    exampleBody: {
      query: "智枢 AI Gateway 最新特性",
      max_results: 5,
    },

  },

  // 通用与管理端点
  {
    id: "rerank",
    title: "文本重排与精排",
    path: "/v1/rerank",
    icon: "sort",
    iconColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.1)",
    category: "utility",
    description: "重排候选文档与查询的相关性得分，提升 RAG 检索命中精准度。",
    defaultModel: "bge-reranker-large",
    exampleBody: {
      model: "bge-reranker-large",
      query: "什么是智能组合路由？",
      documents: ["智枢提供加权、优先级与动态决策路由", "今天天气晴朗适合出行"],
    },
  },
  {
    id: "moderations",
    title: "内容安全合规审核",
    path: "/v1/moderations",
    icon: "shield",
    iconColor: "#FB923C",
    iconBg: "rgba(251, 146, 60, 0.1)",
    category: "utility",
    description: "检测输入文本或图像中的违规风险内容与安全合规评分。",
    defaultModel: "text-moderation-latest",
    exampleBody: {
      input: "测试文本内容安全性",
    },
  },
  {
    id: "list-models",
    title: "模型列表",
    path: "/v1/models",
    icon: "list",
    iconColor: "#14B8A6",
    iconBg: "rgba(20, 184, 166, 0.1)",
    category: "utility",
    badge: "GET",
    description: "获取所有已连接提供商模型、组合虚拟聚合模型与别名清单。",
  },
  {
    id: "batch-api",
    title: "批处理任务",
    path: "/v1/batches",
    icon: "view_list",
    iconColor: "#0D9488",
    iconBg: "rgba(13, 148, 136, 0.1)",
    category: "utility",
    badge: "OpenAI",
    description: "异步大批量数据处理接口，支持半价计费模式与任务生命周期轮询。",
  },
  {
    id: "files-api",
    title: "文件资产管理",
    path: "/v1/files",
    icon: "folder",
    iconColor: "#EAB308",
    iconBg: "rgba(234, 179, 8, 0.1)",
    category: "utility",
    description: "上传、检索与删除供微调（Fine-tuning）、批处理或助手调用的文件资产。",
  },
];
