# OmniRoute 管理台页面真实数据接入审计

> 扫描日期：2026-09-03  
> 扫描范围：`apps/admin/src`、`apps/bff/src`  
> 目的：交给 Gemini，继续完成页面真实数据接入与 mock 清理。

## 1. 结论摘要

当前管理台并不是所有页面都接了真实数据。主要问题有三类：

1. 页面或 API helper 在请求失败后直接返回固定演示数据。
2. 部分页完全没有请求后端，只用 `setTimeout`、字符串处理或硬编码数组模拟功能。
3. 页面虽然请求了真实 API，但本地 BFF 没有对应路由；在未配置 NAS 代理时会 404，然后被 mock fallback 隐藏。

最典型的页面是：

- `/dashboard/analytics/search`（搜索分析）
- `/dashboard/analytics/combo-health`
- `/dashboard/analytics/utilization`
- `/dashboard/analytics/compression`
- `/dashboard/analytics/evals`
- `/dashboard/provider-stats`
- `/dashboard/cache`
- `/dashboard/health`
- `/dashboard/runtime`
- `/dashboard/resilience/connections`
- MCP/A2A/智能体/工具类页面
- 成本、排行和批处理页面

## 2. 运行环境前提

本地 BFF 当前明确注册的路由只有：

`health`、`auth`、`providers`、`provider-nodes`、`settings`、`keys`、`home`、`combos`。

见 [`apps/bff/src/routes/index.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/bff/src/routes/index.ts:39)。

其它 `/api` 请求只有在配置 `OMNIROUTE_NAS_API_TARGET` 时，才会被转发到 NAS Orbit；否则本地 BFF 不一定有对应实现。见 [`apps/bff/src/app.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/bff/src/app.ts:128)。

因此，下面的“mock”判断是代码层面的判断：

- 如果真实接口成功，部分页面可以显示真实数据；
- 如果接口失败、404、未配置 NAS 或认证失败，页面会显示固定演示数据；
- 对用户而言，这会把“后端未接通”伪装成“系统有数据”。

## 3. 明确使用固定 mock fallback 的页面

### 3.1 分析页面

| 页面 | 路由 | 当前问题 | 证据 |
|---|---|---|---|
| 组合健康度 | `/dashboard/analytics/combo-health` | `/analytics/combo-health` 失败后返回固定健康分、组合名称、延迟和成功率 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2663) |
| 资源利用率 | `/dashboard/analytics/utilization` | 失败后返回固定 TPM/RPM/预算利用率 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2726) |
| 压缩分析 | `/dashboard/analytics/compression` | 压缩遥测失败后返回固定运行次数、节省 Token 和算子次数 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:1906) |
| 搜索分析 | `/dashboard/analytics/search` | 失败后返回固定 `18,450` 次查询、`88.6%` 命中率和固定搜索词 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2875) |
| 评测测试 | `/dashboard/analytics/evals` | 失败后返回两条固定评测报告 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2917) |
| 提供商性能统计 | `/dashboard/provider-stats` | 失败后返回固定 P50/P95/P99、TPS、可用率 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2973) |

#### 搜索分析重点

`SearchAnalyticsPage` 调用 `searchAnalyticsApi.getData()`。helper 在 catch 分支返回：

- `totalQueries: 18450`
- `avgLatencyMs: 14.8`
- `hybridHitRate: 88.6`
- 四条固定高频搜索词
- 两个固定 collection

因此该页面目前不能证明展示的是线上搜索系统的真实统计。

### 3.2 缓存和健康度

| 页面 | 路由 | 当前问题 | 证据 |
|---|---|---|---|
| 缓存分析 | `/dashboard/cache` | 统计接口失败时使用固定命中率、命中数、节省 Token 等；语义缓存列表初始化即为固定数组 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2789)、[`cache.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/cache/cache.tsx:65) |
| 媒体缓存 | `/dashboard/cache/media` | 直接复用缓存分析页面 | [`media.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/other/media.tsx:1) |
| 健康监控 | `/dashboard/health` | `/monitoring/health` 失败后返回固定 uptime、内存、熔断器和 telemetry | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:1478) |

### 3.3 成本、排行和预算

| 页面 | 路由 | 当前问题 | 证据 |
|---|---|---|---|
| 价格目录 | `/dashboard/costs/pricing` | 失败后返回固定模型价格和“10 分钟前同步” | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3047) |
| 预算规则 | `/dashboard/costs/budget` | 失败后返回三条固定预算规则 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3134) |
| 免费额度 | `/dashboard/free-tiers` | 失败后返回 Google/Groq/Cloudflare/Together 固定额度 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3186) |
| 免费提供商排行 | `/dashboard/free-provider-rankings` | 复用 `freeTiersApi` 的固定数据 | [`free-provider-rankings.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/costs/free-provider-rankings.tsx:1) |
| 模型雷达 | `/dashboard/radar` | 失败后返回固定 Elo、编码、推理、价格和速度评分 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3251) |
| 模型排行榜 | `/dashboard/leaderboard` | 直接复用 Radar 页面 | [`leaderboard.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/other/leaderboard.tsx:1) |

### 3.4 运行时、弹性和审计

| 页面 | 路由 | 当前问题 | 证据 |
|---|---|---|---|
| 运行时监控 | `/dashboard/runtime` | 失败后返回固定 CPU、内存、事件循环、线程数 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3326) |
| 弹性连接池 | `/dashboard/resilience/connections` | 失败后返回固定 Anthropic/OpenAI/OpenRouter 连接状态 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3359) |
| 安全审计 | `/dashboard/audit` | 失败后返回三条固定审计记录 | [`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:3412) |
| MCP 审计 | `/dashboard/audit/mcp` | 复用安全审计，传入 `auditType="mcp"` | [`audit-mcp.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/audit/audit-mcp.tsx:1) |
| A2A 审计 | `/dashboard/audit/a2a` | 复用安全审计，传入 `auditType="a2a"` | [`audit-a2a.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/audit/audit-a2a.tsx:1) |

### 3.5 能力、智能体和工具页面

| 页面 | 路由 | 当前问题 |
|---|---|---|
| MCP 服务 | `/dashboard/mcp` | 失败后返回固定 MCP Server、工具数量和连接状态 |
| A2A 智能体 | `/dashboard/a2a` | 失败后返回固定 A2A Session |
| 长期记忆 | `/dashboard/memory` | 失败后返回固定 memory bank 和向量索引大小 |
| 智能体技能 | `/dashboard/agent-skills` | 失败后返回三条固定技能 |
| Omni 技能 | `/dashboard/omni-skills` | 复用智能体技能页面 |
| 扩展插件 | `/dashboard/plugins` | 失败后返回固定安全、脱敏和路由插件 |
| 混沌演练 | `/dashboard/chaos` | 配置接口失败后使用固定默认配置，并且写入失败也返回成功 |
| CLI 智能体 | `/dashboard/cli-agents` | 失败后返回两个固定 CLI Agent；创建/终止失败也伪造成功 |
| ACP 智能体 | `/dashboard/acp-agents` | 失败后返回两个固定 ACP Agent |
| 云端智能体 | `/dashboard/cloud-agents` | 失败后返回固定 GitHub Reviewer 和 Sentry Agent |
| 智能体编排器 | `/dashboard/conductor` | 失败后返回固定工作流 |
| 智能体桥接 | `/dashboard/tools/agent-bridge` | 失败后返回固定协议桥接路由 |
| 流量检查器 | `/dashboard/tools/traffic-inspector` | 失败后返回两条固定流量记录和 payload |
| 服务发现 | `/dashboard/discovery` | 失败后返回固定 Ollama/vLLM/LMStudio 发现结果 |
| API 端点列表 | `/dashboard/api-endpoints` | 失败后返回三条固定端点 |
| Webhook 钩子 | `/dashboard/webhooks` | 失败后返回两个固定 Webhook |
| 系统出站代理 | `/dashboard/system/proxy` | 失败后返回固定代理地址、端口和连接数 |
| 批处理任务 | `/dashboard/batch` | 失败后返回两条固定批处理任务 |
| 批处理文件 | `/dashboard/batch/files` | 复用批处理页面 |

上述大部分 fallback 集中在 [`apps/admin/src/entities/api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:2170) 至末尾。

## 4. 页面本身就是本地模拟

这些页面不是“API 失败才 mock”，而是当前交互根本没有调用真实后端。

| 页面 | 路由 | 模拟方式 |
|---|---|---|
| CLI 代码助手 | `/dashboard/cli-code` | `setTimeout` 拼接“规划、生成补丁、测试通过”的终端日志 | [`cli-code.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/agents/cli-code.tsx:75) |
| 推演游乐场 | `/dashboard/playground` | `setTimeout` 生成固定模型回复、耗时和 token 数 | [`playground.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/devtools/playground.tsx:81) |
| 知识搜索工具 | `/dashboard/search-tools` | 点击搜索后直接写入两条固定结果，没有搜索请求 |
| 协议转换器 | `/dashboard/translator` | 仅在浏览器内执行 JSON 转换；不是网关真实转译链路 |
| 压缩工作室 | `/dashboard/compression/studio` | 页面明确是“仿真重放”，用 `setTimeout` 输出固定流水线日志 | [`compression-studio.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/compression/compression-studio.tsx:85) |
| 个人中心 | `/dashboard/profile` | 用户名、邮箱、角色和工作区硬编码；保存只显示 toast | [`profile.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/other/profile.tsx:92) |

另外两个页面包含页面级 mock fallback：

- MCP Dashboard：状态、工具和审计接口失败后构造 mock 数据。[`mcp-dashboard.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/endpoints/mcp-dashboard.tsx:76)
- A2A Dashboard：状态和任务接口失败后构造 mock tasks。[`a2a-dashboard.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/endpoints/a2a-dashboard.tsx:90)

## 5. 混合页面：配置可能真实，但展示/测试仍是 mock

### 5.1 上下文压缩页面

页面尝试读取 `/settings/compression`，但 API helper 失败后会使用固定默认配置；各 engine 的“测试压缩”主要是前端字符串处理，不是真实压缩引擎调用。

- `/dashboard/context/settings`
- `/dashboard/context/combos`
- `/dashboard/context/caveman`
- `/dashboard/context/rtk`
- `/dashboard/context/headroom`
- `/dashboard/context/session-dedup`
- `/dashboard/context/ccr`
- `/dashboard/context/llmlingua`
- `/dashboard/context/lite`
- `/dashboard/context/aggressive`
- `/dashboard/context/ultra`
- `/dashboard/context/omniglyph`
- `/dashboard/compression/settings`（重定向到 context settings）
- `/dashboard/compression/combos`（重定向到 context combos）
- `/dashboard/compression/exclusions`

证据：[`compressionApi`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:1906)、[`contextCombosApi`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:1979)、[`engine-detail.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/context/engine-detail.tsx:202)。

### 5.2 其他混合页面

- `/dashboard/quota-share`、`/dashboard/costs/quota-share`：池和连接尝试请求 API，但分组失败时固定返回 `GroupDemo`。[`quota-share.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/quota-share/quota-share.tsx:727)
- `/dashboard/endpoint`：Tailscale 状态失败时从 localStorage 恢复，连接失败时甚至随机生成 `100.x.x.x` 地址。[`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:790)
- `/dashboard/settings/ai`：模型别名列表由硬编码初始数组提供，未从 settings 响应 hydrate。[`settings-ai.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/settings/settings-ai.tsx:73)
- `/dashboard/settings/routing`：fallback chain 列表由硬编码初始数组提供，未从 settings 响应 hydrate。[`settings-routing.tsx`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/features/settings/settings-routing.tsx:72)
- `/dashboard/providers/services`：9router 模型接口失败时返回固定模型列表。[`api.ts`](/Users/yanxianliang/shiguang/OmniRoute/orbiot/apps/admin/src/entities/api.ts:1678)

## 6. 不应直接归类为 mock，但本地可能没有数据的页面

以下页面主要调用真实 API，当前没有明显的固定演示数据 fallback；但由于本地 BFF 未注册所有对应接口，可能表现为空、报错或一直 loading：

- `/dashboard/analytics`（主用量分析）
- `/dashboard/activity`
- `/dashboard/logs`
- `/dashboard/logs/proxy`
- `/dashboard/logs/console`
- `/dashboard/logs/timeline`
- `/dashboard/conversations`
- `/dashboard/api-manager`
- `/dashboard/quota`
- `/dashboard/providers`
- `/dashboard/providers/:id`
- `/dashboard/providers/new`
- `/dashboard/combos`
- `/dashboard/combos/live`
- `/dashboard/combos/:id`
- 多数系统设置页面

这类页面需要单独做“接口是否存在、响应格式是否一致、错误是否被吞掉”的联调，不应直接用 mock 数据掩盖问题。

## 7. 建议 Gemini 的处理顺序

建议按以下顺序处理：

1. 先移除或显式标记所有固定 fallback，至少让页面显示“数据源不可用”，不要把 mock 当真实数据展示。
2. 优先接通 `/dashboard/analytics/search` 以及其它分析页面的真实后端接口。
3. 接通缓存、健康度、运行时、弹性连接池和审计接口。
4. 接通 MCP/A2A/智能体/工具类接口，删除固定对象数组。
5. 接通价格、预算、免费额度、模型排行和批处理接口。
6. 将上下文压缩 engine 的本地测试改为调用真实压缩测试接口；如果暂时没有接口，页面应明确标注“本地演示”。
7. 修复 settings-ai/settings-routing 的 hydrate：从真实 settings 读取 `modelAliases` 和 `fallbackChains`，不要始终显示硬编码列表。
8. 对每个页面增加 API 失败态和空数据态；不要在 catch 中伪造成功写操作。
9. 在配置 `OMNIROUTE_NAS_API_TARGET` 和未配置两种环境分别做联调。

## 8. 建议的验收标准

对每个页面至少验证：

- 浏览器 Network 中请求了预期 endpoint；
- endpoint 在当前部署模式确实存在；
- 成功响应的数据能驱动页面，而不是只影响 loading；
- 断开接口时页面显示错误/空状态，不出现固定演示数据；
- 写操作失败时不会显示“保存成功”“删除成功”或生成本地假对象；
- 刷新页面后数据来自后端，而不是只来自 localStorage 或 React 初始 state；
- 分析数值与后端原始响应可以对账。

