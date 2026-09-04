# OmniRoute Web 官方对齐审计与下一阶段任务书

> 审计日期：2026-09-04
> 当前实现：`orbiot/apps/admin` + `orbiot/apps/bff`，本地 `http://127.0.0.1:5173`
> 官方基准：`https://model.publib.cn`（实机版本 v3.8.51）与同级源码 `../Orbit`
> 目标：逐菜单、逐子页面识别真实接入、部分 Mock、纯 Mock、接口契约错误和页面缺失，并给出下一阶段可直接执行的任务拆分。

## 1. 结论先行

当前 Web 不是“只差少量接口”。首页、提供商、组合、主要用量分析和多数日志页已经使用真实数据，但工具链、成本中心、Agentic、批处理、媒体、压缩测试、审计以及部分系统设置存在成片的错误实现。

最需要避免的误判是把“能渲染出页面”当成“已迁移完成”：

1. **完全或接近完全由前端模拟**：CLI Code、Playground、Search Tools、Compression Studio，以及媒体生成流程。
2. **部分数据真实，但关键交互仍是假执行**：组合实时调试、缓存条目、十个压缩引擎测试、压缩配置/组合/排除项、配额共享、MCP/A2A Dashboard。
3. **页面有 UI，但实际调用链请求了不存在或错误的 endpoint**：Evals、Memory、MCP、A2A、Cloud Agents、Conductor、CLI Agents、Traffic Inspector、Discovery、Batch、Media 等。预算、免费额度和免费提供商排行已确认使用真实官方接口，不属于此类；Radar 的问题则是 feature flag 和本地假目录，不是路径误写。
4. **页面实现对象与官方完全不同**：当前 CLI Code 被做成“AI 写代码终端”，官方实际是 CLI 工具检测、配置文件生成、同步、备份与详情管理；当前 Translator 只是浏览器内 JSON 转换，官方是网关协议转换与真实发送；当前 `/dashboard/costs` 直接跳到用量分析，官方是完整成本驾驶舱。
5. **设置页存在高风险契约错写**：AI 设置和 Resilience 设置使用了与官方不同的字段和数据结构。保存成功不代表官方配置已生效，甚至可能写入无效字段。
6. **官方菜单和子路由未完整迁移**：成本概述、帮助区整个菜单缺失；CLI Code/CLI Agents/Plugins/Radar/Media Providers 等详情子页缺失；另有 onboarding、auto-combo、combo playground 等工作流路由缺失。

因此下一阶段的优先级应是：先消灭假成功和错误契约，再补齐核心功能与子路由，最后做视觉精修。现在不适合继续扩展新 UI。

## 2. 判定标准

| 标记 | 含义 | 是否可以验收 |
|---|---|---|
| `R` 真实接入 | endpoint 存在，页面由真实响应驱动，核心读写链路可用 | 可以，仍需页面对拍 |
| `P` 部分对齐 | 核心数据真实，但官方能力、字段、筛选、写操作或子流程缺失 | 不可以 |
| `M` 部分 Mock | 页面混用真实请求与固定数据、localStorage、假成功或前端模拟 | 不可以 |
| `F` 纯/近纯 Mock | 核心业务流程没有调用官方后端，主要结果由前端生成 | 不可以 |
| `X` 实现错误 | 页面请求错误 endpoint、数据契约不符，或实现了与官方不同的产品 | 不可以 |
| `U` 缺失 | 官方菜单、页面或必要子路由不存在 | 不可以 |

差异性质另分两类：

- **UI 优化**：信息架构与业务能力不变，只调整布局、组件、密度、响应式、加载态和视觉层次。允许保留。
- **功能不一致**：缺字段、缺操作、缺子页面、错误路由、错误 endpoint、假数据、假成功、错误业务模型。必须按官方修复，不能用“UI 优化”解释。

## 3. 审计依据与运行链路

本次结论来自三组证据：

1. 对照当前路由和菜单：`apps/admin/src/app/nav.tsx`、`apps/admin/src/app/router.tsx`。
2. 对照官方菜单、页面、组件和请求：`../Orbit/src/shared/constants/sidebarVisibility/sections.ts`、`../Orbit/src/app/(dashboard)`。
3. 在 2026-09-04 对本地 Web/BFF 做 endpoint smoke test，并在官方 Web 实机打开关键页面做结构对拍。

当前开发环境的数据链路是：

```text
Admin Web :5173
    -> /api
Local BFF :8787
    -> NAS proxy
Official Orbit API
```

这意味着“BFF 本地注册了一个同名 route”不等于当前页面实际使用它；NAS 代理模式下可能直接转发。反过来，当前 helper 使用了错误路径时，即使 BFF 中存在相似能力也仍然会 404。

本次实测中，以下核心接口返回真实数据：

- `/api/settings`、`/api/providers`、`/api/keys`、`/api/combos`
- `/api/cache`、`/api/cache/entries`、`/api/cache/reasoning`
- `/api/settings/compression`、`/api/context/combos`、`/api/compression/language-packs`
- `/api/usage/combo-health-dashboard`、`/api/v1/search/analytics`
- `/api/provider-stats`、`/api/pricing`
- `/api/compliance/audit-log`、`/api/monitoring/health`
- `/api/db/health`、`/api/cache/stats`、`/api/rate-limits`
- `/api/health/degradation`、`/api/telemetry/summary`
- `/api/providers/health-autopilot`、`/api/providers/health-matrix`
- `/api/resilience/connections`、`/api/webhooks`
- `/api/agent-skills`、`/api/plugins`、`/api/acp/agents`
- Gamification 的 leaderboard、level、badges、earned-badges

以下当前**被页面使用**的 helper 路径在本次运行中的 active target 实测 404，且官方源码使用的是另一套路径：

- `/api/analytics/evals`
- `/api/audit`、`/api/mcp/servers`、`/api/a2a/sessions`
- `/api/memory/banks`、`/api/cloud/agents`、`/api/conductor/workflows`
- `/api/cli/agents`、`/api/tools/traffic-inspector`
- `/api/api-endpoints`、`/api/system/proxy`
- `/api/media/cache/stats`、`/api/batch/tasks`、`/api/batch/files`

`/api/discovery/scan` 用 GET 实测返回 405；官方能力是动作型请求，当前 helper 的请求方法错误。

相对地，复核确认 `/api/usage/budget/bulk`、`/api/free-tier/summary`、`/api/free-provider-rankings`、`/api/evals`、`/api/discovery/results`、`/api/mcp/status`、`/api/a2a/status`、`/api/v1/agents/tasks`、`/api/v1/agents/health`、`/api/conductor/fleet`、`/api/tools/traffic-inspector/capture-modes` 均存在。部分当前页面没有使用这些正确接口。

注意：仓库当前工作树还新增了 `apps/bff/src/routes/budget.ts`、`freeTier.ts`、`freeProviderRankings.ts`、`pricing.ts`、`radar.ts` 等本地路由，但本次运行中的 BFF/NAS target 未加载或未转发到这些实现；而 `radar.ts` 本身使用进程内状态、固定 baseline、固定 referrals/offers/intel，不能把“源码中有 route”当成真实官方接入。下一阶段必须先重启并明确验证实际部署链路，再做页面验收。

## 4. 逐菜单与页面对比

### 4.1 首页

| 当前路由 | 结论 | 官方对比 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/home` | `R/P` | 模型、指标、调用日志、版本等核心数据为真实数据；当前采用卡片化重排 | 主要是 UI 优化，仍需补官方开关与边缘状态对拍 | P2 |

### 4.2 OmniProxy：入口、提供商、组合、配额

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/endpoint` | `P` | 核心地址与连接信息真实；自定义公开地址可存 localStorage。需验证官方所有隧道、测试和复制流程 | 部分 UI 优化，部分能力未验收 | P2 |
| `/dashboard/api-manager` | `P` | Key 列表和主要 CRUD 为真实数据；需逐项补官方统计、预算、权限和详情操作 | 功能不完整 | P2 |
| `/dashboard/providers` | `P` | 列表与主要管理真实；官方 OAuth、CLI/浏览器认证、导入向导、同步和高级弹窗未完整迁移 | 功能不完整 | P1 |
| `/dashboard/providers/new` | `P` | 基础新建真实；连接类型和官方认证向导覆盖不足 | 功能不完整 | P1 |
| `/dashboard/providers/:id` | `P` | 详情、连接和模型测试已接真实接口；仍缺部分官方高级操作 | 功能不完整 | P1 |
| `/dashboard/providers/:providerId/connections/:id` | `P` | 编辑链路已实现，需与官方字段、校验和 auth flow 逐项对账 | 功能不完整 | P1 |
| `/dashboard/providers/services` | `M` | 服务状态接口真实；9router 模型加载失败时会返回固定模型列表 | 部分 Mock | P0 |
| `/dashboard/combos` | `P` | 列表和 CRUD 真实；需补官方 auto-combo、playground、完整策略编辑能力 | 功能不完整 | P1 |
| `/dashboard/combos/:id` | `P` | 有控制中心，但需对齐官方详情页全部 Tab、健康与变更操作 | 功能不完整 | P1 |
| `/dashboard/combos/live` | `M/X` | 组合和提供商来自真实接口，但“运行模拟”仅等待 600ms；官方是 WebSocket 实时状态、breaker overlay 和真实 cascade | 关键实现不一致 | P0 |
| `/dashboard/quota` | `R/P` | 当前实际使用 providers、catalog、quota pools 等真实数据，并解析 connection quotaData；旧 `/api/quota/overview`、`/api/quota/providers` helper 未被本页调用。仍需补官方 provider-limit/plan 维度和逐字段对账 | 核心真实，功能不完整 | P1 |
| `/dashboard/costs/quota-share` | `M/P` | pool/group 可返回真实数据，但 group 空或失败时注入 `GroupDemo`；官方还有计划、使用记录与更完整管理流程 | 部分 Mock + 功能缺失 | P0 |

### 4.3 OmniProxy：上下文压缩

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/context/settings` | `M` | 能请求官方配置，但失败时回退 localStorage；写失败也会在本地合并并表现为成功 | 假成功 | P0 |
| `/dashboard/context/combos` | `M` | CRUD 失败时使用 localStorage，assignments 含固定数据；刷新后不保证来自官方 | 部分 Mock | P0 |
| `/dashboard/context/caveman` | `M/X` | 配置部分可读，测试由 `setTimeout` 和本地字符串处理生成；官方有真实 preview、语言与 analytics | 核心测试错误 | P0 |
| `/dashboard/context/rtk` | `M/X` | 当前测试是前端模拟；官方有配置、discover、filters、import、真实 test | 核心测试错误 | P0 |
| `/dashboard/context/headroom` | `M/X` | 与多个引擎共用固定样例输出；官方走统一引擎配置、preview 与 analytics | 核心测试错误 | P0 |
| `/dashboard/context/session-dedup` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/ccr` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/llmlingua` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/lite` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/aggressive` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/ultra` | `M/X` | 同上 | 核心测试错误 | P0 |
| `/dashboard/context/omniglyph` | `M/X` | 使用前端延迟和固定 `1,456` 视觉 Token 结果；官方由真实转换链路驱动 | 核心测试错误 | P0 |
| `/dashboard/compression/studio` | `F/X` | 当前是固定 cascade 日志的“仿真重放”；官方调用 `/api/compression/compare`、`/compare/verify`、`/preview` | 完全不一致 | P0 |
| `/dashboard/compression/exclusions` | `M` | 失败时使用 localStorage 并伪造写成功 | 假成功 | P0 |

### 4.4 OmniProxy：CLI、Agent 工具和集成

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/cli-code` | `F/X` | 当前是固定“规划、生成补丁、测试通过”的 AI 终端；官方是 Claude/Codex/Cline 等 20+ CLI 的检测、配置、自动同步、安装指南和详情管理 | 实现了错误产品 | P0 |
| `/dashboard/cli-agents` | `X/U` | 当前 `/api/cli/agents` 404；官方有 agent 列表、运行控制和 `/dashboard/cli-agents/:id` 详情 | 错误契约 + 子页缺失 | P0 |
| `/dashboard/acp-agents` | `P/X` | `/api/acp/agents` 可返回真实数据，但当前主要是只读列表；官方有创建、更新、删除和配置流程 | 功能不完整 | P1 |
| `/dashboard/cloud-agents` | `X` | 当前 `/api/cloud/agents` 404；官方使用任务/消息/健康管理模型 | 错误契约 | P0 |
| `/dashboard/conductor` | `X` | 当前 `/api/conductor/workflows` 404；官方是 fleet、task、cancel、ask、STT/TTS 等能力 | 实现过度简化 | P0 |
| `/dashboard/tools/agent-bridge` | `X` | 当前接口模型与官方桥接配置、运行状态、规则操作未对齐 | 功能和契约不一致 | P1 |
| `/dashboard/tools/traffic-inspector` | `X` | 当前 `/api/tools/traffic-inspector` 404；官方有真实请求/响应检查和筛选 | 错误契约 | P0 |
| `/dashboard/discovery` | `X` | 当前 helper 对 `/api/discovery/scan` 发 GET，实测 405；官方是扫描动作及结果管理 | HTTP 方法错误 | P0 |
| `/dashboard/api-endpoints` | `X` | 当前 `/api/api-endpoints` 404；与官方自定义 endpoint 管理契约不符 | 错误契约 | P1 |
| `/dashboard/webhooks` | `P` | 列表接口真实；当前能力少于官方 CRUD、事件和交付记录 | 功能不完整 | P1 |
| `/dashboard/system/proxy` | `X` | 当前 `/api/system/proxy` 404；官方基于设置/代理运行状态管理 | 错误契约 | P0 |

### 4.5 分析中心

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/analytics` | `R/P` | 主要指标与日志来自真实接口；当前是明显 UI 重构，需补齐官方 routing、compression、diversity、cache health、route explain 等视图的字段对账 | 可保留 UI，功能需补齐 | P2 |
| `/dashboard/analytics/combo-health` | `R/P` | `/api/usage/combo-health-dashboard` 返回真实数据；需对齐官方筛选、breaker 和详情交互 | 主要为 UI 优化 | P2 |
| `/dashboard/analytics/utilization` | `R/P` | endpoint 真实，但要求完整 query 参数；需覆盖默认筛选和空参数行为 | 契约边界需修正 | P1 |
| `/dashboard/cache` | `M` | 统计/清理 API 真实，但语义缓存条目初始化为 `MOCK_SEMANTIC_ENTRIES`，删除只改前端状态 | 部分 Mock | P0 |
| `/dashboard/analytics/compression` | `M/P` | 可读取 run telemetry，但 helper 保留固定 telemetry fallback，且官方分析维度更多 | 部分 Mock + 功能缺失 | P0 |
| `/dashboard/analytics/search` | `R/P` | `/api/v1/search/analytics` 返回真实数据；当前是精简版，需对齐官方筛选和明细 | 主要为 UI 优化 | P2 |
| `/dashboard/analytics/evals` | `X` | 当前请求 `/api/analytics/evals` 404；官方使用 `/api/evals` 及 suite CRUD/run | 错误契约 | P0 |
| `/dashboard/provider-stats` | `R/P` | `/api/provider-stats` 返回真实数据；需对齐官方模型维度、时间窗口和导出 | 主要为 UI 优化 | P2 |

### 4.6 成本中心

| 当前/官方路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/costs` | `U/X` | 当前直接重定向到 `/dashboard/analytics`。官方是独立成本驾驶舱：时间窗、CSV/JSON 导出、provider/model/key/account/tier 探索、Token、预测、趋势和热力图 | 页面缺失，不是 UI 优化 | P0 |
| `/dashboard/costs/pricing` | `P` | `/api/pricing` 真实；当前缺官方 sources、model detail/edit、clear/sync 状态等能力 | 功能不完整 | P1 |
| `/dashboard/costs/budget` | `R/P` | 当前页面已使用 keys、`/api/usage/budget/bulk` 和 `/api/usage/budget`；本地预算模板只影响表单快捷项。需补官方批量操作和全部边界状态 | 核心真实，功能不完整 | P1 |
| `/dashboard/free-tiers` | `R/P` | 当前已使用 `/api/free-tier/summary` 并展示真实模型/额度；需对齐官方说明、筛选和空/超额状态 | 主要为 UI 优化 | P2 |
| `/dashboard/free-provider-rankings` | `R/P` | 当前已使用 `/api/free-provider-rankings`，分类、认证方式、配置/可用筛选和榜单字段均已覆盖大部 | 主要为 UI 优化，仍需逐字段验收 | P2 |
| `/dashboard/radar` | `M/X/U` | 目标官方实例未启用 Radar，相关接口返回 404；本地 BFF route 虽存在，但使用进程内 settings/cache、固定 baseline/referrals/offers/intel，不是 DB/官方数据；当前导航无条件展示，且 setup/combos/offers/intel 子路由缺失 | Feature flag 不一致 + 本地假目录 + 子页缺失 | P0 |

### 4.7 监控中心

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/activity` | `R/P` | 使用 `/api/compliance/audit-log`，数据真实；需对齐官方实时刷新和事件字段 | 主要为 UI 优化 | P2 |
| `/dashboard/logs` | `R/P` | 核心请求日志真实；部分 helper 把失败吞成空数组，需保留明确错误态，并补官方筛选/导出/详情 | 功能不完整 | P1 |
| `/dashboard/logs/proxy` | `R/P` | 核心真实；需对拍筛选、实时模式和详情 | 主要为 UI 优化 | P2 |
| `/dashboard/logs/console` | `R/P` | 核心真实；需对拍级别、来源和实时刷新 | 主要为 UI 优化 | P2 |
| `/dashboard/logs/timeline` | `R/P` | 真实日志驱动；localStorage 只保存视图偏好，不属于业务 Mock | 主要为 UI 优化 | P2 |
| `/dashboard/conversations` | `R/P` | 真实数据驱动；需补官方会话详情和关联追踪 | 功能不完整 | P2 |
| `/dashboard/health` | `P` | 当前主要展示 monitoring health；官方还聚合 db、cache、rate-limit、degradation、telemetry、autopilot、health matrix | 功能明显不完整 | P1 |
| `/dashboard/runtime` | `P` | 当前使用 monitoring health/model cooldown 等真实数据；本地 BFF runtime route 内含常量遥测，不能作为 fallback 发布 | 部分实现风险 | P1 |
| `/dashboard/resilience/connections` | `R/P` | `/api/resilience/connections` 真实；需对齐官方筛选和连接操作 | 主要为 UI 优化 | P2 |
| `/dashboard/audit` | `X` | 当前 `/api/audit` 404；官方使用 `/api/compliance/audit-log` | 错误契约 | P0 |
| `/dashboard/audit/mcp` | `X/M` | 当前错误契约；另有 MCP Dashboard 在错误时注入固定 audit records | 错误契约 + fallback Mock | P0 |
| `/dashboard/audit/a2a` | `X/M` | 当前错误契约；另有 A2A Dashboard 在错误时注入固定 tasks | 错误契约 + fallback Mock | P0 |

### 4.8 开发工具

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/translator` | `X` | 当前仅浏览器内转换 JSON；官方支持 detect、translate、send、history、stream transform、provider/model 和高级面板 | 实现了不同产品 | P0 |
| `/dashboard/playground` | `F/X` | 当前 `setTimeout` 后生成固定回复、耗时和 token；官方真实调用 `/v1/chat/completions`，支持 streaming、preset CRUD、对比、构建、导出和改写 prompt | 纯 Mock | P0 |
| `/dashboard/search-tools` | `F/X` | 当前搜索直接写固定结果；官方调用 search、web fetch、rerank，并支持 provider catalog、历史、比较和抓取 | 纯 Mock | P0 |

官方开发工具菜单受 debug 条件控制；当前无条件显示。是否显示属于功能开关语义，不是纯视觉差异。

### 4.9 Agentic 能力

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/mcp` | `X` | 当前 `/api/mcp/servers` 404；官方由 settings、`/api/mcp/status`、transport/config 管理驱动 | 错误契约 | P0 |
| `/dashboard/a2a` | `X` | 当前 `/api/a2a/sessions` 404；官方由 settings、`/api/a2a/status` 和任务能力驱动 | 错误契约 | P0 |
| `/dashboard/memory` | `X` | 当前 `/api/memory/banks` 404；官方有 `/api/memory` CRUD、health、summarize、retrieve-preview、reindex、embedding providers 和 settings | 实现过度简化 | P0 |
| `/dashboard/agent-skills` | `P` | 列表接口真实；当前只读，官方有内容预览、生成、刷新等操作 | 功能不完整 | P1 |
| `/dashboard/chaos` | `P` | config 接口真实；当前缺 run/reset、provider overrides、结果视图 | 功能不完整 | P1 |
| `/dashboard/omni-skills` | `X` | 当前基本复用 Agent Skills；官方 Omni Skills 有独立语义和能力 | 实现对象错误 | P1 |
| `/dashboard/plugins` | `P/X` | 列表接口真实但当前近乎只读；官方支持 scan/install/enable/disable/delete，并有 `/dashboard/plugins/:name/config` | 功能与子页缺失 | P1 |

### 4.10 其他功能

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/leaderboard` | `R/P` | leaderboard 接口真实；缺官方 SSE/实时更新和部分字段 | 功能不完整 | P2 |
| `/dashboard/profile` | `R/P` | 已不再是旧版硬编码用户，当前可读取 Gamification 数据；需对齐官方账户与资料边界 | 功能不完整 | P2 |
| `/dashboard/tokens` | `P/X` | 主要 endpoint 存在，但 transfer/invite 请求缺当前 key/身份选择时返回 400；本地 BFF 还有硬编码 `admin` 身份风险 | 契约不完整 | P1 |
| `/dashboard/cache/media` | `M/X` | cache stats/purge helper 存在但当前路径 404；生成流程用 `setTimeout`、硬编码模型和 Unsplash 图片伪造成功 | 关键流程 Mock | P0 |
| `/dashboard/batch` | `X` | 当前 `/api/batch/tasks` 404；官方使用 `/api/v1/batches` 和 `/api/v1/files`，支持真实创建、状态和详情 | 错误契约 | P0 |
| `/dashboard/batch/files` | `X` | 当前 `/api/batch/files` 404；官方支持 multipart upload、download、detail、delete | 错误契约 | P0 |

### 4.11 系统设置

| 当前路由 | 结论 | 当前问题/官方差异 | 差异性质 | 优先级 |
|---|---|---|---|---|
| `/dashboard/settings/general` | `R/P` | 基础 settings 真实；需做字段级读写回归 | 主要为 UI 优化 | P2 |
| `/dashboard/settings/appearance` | `R/P` | 主题和显示设置真实；需对齐官方持久化字段与默认值 | 主要为 UI 优化 | P2 |
| `/dashboard/settings/ai` | `X` | 当前使用 `responsesStatePolicy`、标量 `codexFastTier/codexAutoPing/claudeFastMode` 等字段；官方实际是 `responsesPreviousResponseIdMode`、`codexServiceTier` 对象、`codexAutoPing.connections`、`claudeFastMode` 对象。system prompt 结构也不一致 | 高风险 schema 错误 | P0 |
| `/dashboard/settings/modality-bridge` | `P` | 数据来自 settings；需和官方所有 modality/provider 字段逐项对账 | 功能不完整 | P1 |
| `/dashboard/settings/security` | `R/P` | 核心真实；需补官方校验、重启提示和错误处理 | 主要为 UI 优化 | P2 |
| `/dashboard/settings/routing` | `X/P` | 当前把 routing strategy、aliases、fallback chains 等写入通用 settings；官方由多个独立组件/契约组成，当前字段覆盖不足且部分为自定义模型 | 契约和业务模型不一致 | P0 |
| `/dashboard/settings/resilience` | `X` | 当前写通用扁平字段；官方 GET/PUT `/api/resilience`，包含 requestQueue、connectionCooldown、providerBreaker、waitForCooldown、comboCooldownWait、quotaShareConcurrencyLimit、providerCooldown | 高风险 schema 错误 | P0 |
| `/dashboard/settings/advanced` | `P` | 真实 settings，但与 AI/路由存在字段重叠；需按官方组件边界去重 | 功能边界不清 | P1 |
| `/dashboard/settings/access-tokens` | `R/P` | 核心真实；需回归 CRUD、复制、过期、撤销 | 主要为 UI 优化 | P2 |
| `/dashboard/settings/feature-flags` | `R/P` | 核心 settings 真实；需确保菜单和页面实际受相同 flag 控制 | 运行语义未闭环 | P1 |
| `/dashboard/settings/cache` | `P/X` | 当前基本只有 `modelCatalogCacheTtlMs`；官方 Cache Settings 能力更完整 | 过度简化 | P1 |
| `/dashboard/settings/sidebar` | `P/X` | 配置可保存，但当前 Shell 不支持官方分组标题、固定分区、debug 条件和 Help 区，导致设置无法完整生效 | 功能不完整 | P1 |

### 4.12 官方菜单缺失项与非菜单子路由

| 官方页面/路由 | 当前状态 | 结论 | 优先级 |
|---|---|---|---|
| `/dashboard/costs` 成本概述 | 被重定向到分析页 | `U/X` | P0 |
| Help：Docs、Issues、Changelog | 整个 Help 分区未渲染；changelog 页面无路由 | `U` | P1 |
| `/dashboard/onboarding` | 缺失 | `U` | P1 |
| `/dashboard/auto-combo` | 缺失 | `U` | P1 |
| `/dashboard/combos/playground` | 缺失 | `U` | P1 |
| `/dashboard/compression` | 官方为重定向到 Caveman canonical page；当前未提供该父路由 | `U` | P2 |
| `/dashboard/compression/live` | 缺失 | `U` | P1 |
| `/dashboard/context` | 缺失 | `U` | P2 |
| `/dashboard/limits`、`/dashboard/usage` | 缺失 | `U` | P2 |
| `/dashboard/relay` | 缺失 | `U` | P2 |
| `/dashboard/media-providers` 及 kind/id 详情 | 缺失 | `U` | P1 |
| `/dashboard/radar/setup`、`combos`、`offers`、`intel` | 缺失 | `U` | P0 |
| `/dashboard/plugins/:name/config` | 缺失 | `U` | P1 |
| `/dashboard/cli-agents/:id` | 缺失 | `U` | P0 |
| `/dashboard/cli-code/:id` | 缺失 | `U` | P0 |
| `/dashboard/gamification/admin` | 缺失 | `U` | P2 |
| `/dashboard/system/1proxy`、`/dashboard/system/mitm-proxy` | 缺失 | `U` | P2 |
| `/dashboard/changelog` | 缺失 | `U` | P1 |

这些子路由中有些不直接出现在侧栏，但由官方主页面按钮、卡片或深链进入，属于完整工作流的一部分。

## 5. Mock 与错误契约的代码证据

### 5.1 明确前端模拟

- `apps/admin/src/features/agents/cli-code.tsx`：`setTimeout` 生成固定终端过程。
- `apps/admin/src/features/devtools/playground.tsx`：`setTimeout` 生成固定回答和 token。
- `apps/admin/src/features/devtools/search-tools.tsx`：固定搜索结果，无真实搜索请求。
- `apps/admin/src/features/compression/compression-studio.tsx`：固定流水线日志。
- `apps/admin/src/features/other/media.tsx`：固定模型、延迟和 Unsplash 图片。
- `apps/admin/src/features/combos/combos-live.tsx`：模拟按钮只等待 600ms。
- `apps/admin/src/features/context/caveman.tsx`、`rtk.tsx`、`engine-detail.tsx`、`omniglyph.tsx`：本地生成压缩结果。
- `apps/admin/src/features/cache/cache.tsx`：`MOCK_SEMANTIC_ENTRIES` 和本地删除。

### 5.2 失败时伪装成功或返回固定数据

- `apps/admin/src/entities/api.ts` 的 compression config、context combos、exclusions：失败后读写 localStorage。
- 同文件的 context assignments、language packs、quota groups、9router models：保留固定 fallback。
- `apps/admin/src/features/quota-share/quota-share.tsx`：固定 `GroupDemo`。
- `apps/admin/src/features/endpoints/mcp-dashboard.tsx`：固定 audit records fallback。
- `apps/admin/src/features/endpoints/a2a-dashboard.tsx`：固定 tasks fallback。
- `apps/bff/src/routes/radar.ts`：进程内 `radarSettings`、`radar*Cache`、`getBaselineEntries()` 及固定 referral/offer/intel 数据；即使页面请求成功，也不能视为真实 Radar 数据。

视图偏好类 localStorage（主题、表格布局、提示关闭状态）不属于业务 Mock，不应一刀切删除。

### 5.3 高风险设置字段对照

| 能力 | 当前字段/接口 | 官方字段/接口 | 风险 |
|---|---|---|---|
| Responses 状态 | `responsesStatePolicy` | `responsesPreviousResponseIdMode` | 保存无效字段 |
| Codex service tier | `codexFastTier` 标量 | `codexServiceTier` 对象 | 结构不兼容 |
| Codex auto ping | 标量开关 | `codexAutoPing.connections` | 丢失连接级配置 |
| Claude fast mode | 标量开关 | `claudeFastMode` 对象及 supportedModels | 结构不兼容 |
| System prompt | `mode/customPrompt` 风格 | `enabled/prefixPrompt/suffixPrompt` | 行为不一致 |
| Resilience | 通用 settings 扁平字段 | GET/PUT `/api/resilience` 分区结构 | 整页写错契约 |

## 6. UI 优化与功能不一致的边界

以下可以作为当前 Web 的 UI 优化保留：

- 使用 Ant Design 重排卡片、表格、间距、颜色和响应式布局。
- 将官方长页面拆成 Tab、Drawer 或 Modal，只要所有字段、动作和状态仍可达。
- 改善 Skeleton、空状态、错误提示、复制反馈和移动端体验。
- 首页、Analytics、日志等页面在不丢业务维度的前提下重新组织信息层级。

以下不能标记为 UI 优化：

- 把官方页面替换成另一种产品概念，例如 CLI 配置中心变成 AI 编码终端。
- 把独立页面重定向到语义不同的页面，例如成本概述跳到用量分析。
- 删除官方 Tab、筛选、CRUD、导出、详情页或运行操作。
- 把真实请求替换为 `setTimeout`、硬编码数组、localStorage 业务数据或固定图片。
- API 失败后展示看似正常的数字，或写失败后提示成功。
- 自行发明字段、endpoint、HTTP method 或数据结构。
- 当前导航忽略官方 feature flag/debug 条件、分组语义和 Help 入口。

## 7. 下一阶段执行任务

### Phase 0：建立真实性底线

#### WEB-P0-01 删除业务 Mock 与假成功

范围：`entities/api.ts`、cache、quota-share、MCP/A2A Dashboard、compression、media、combos-live、devtools、CLI Code。

交付：

- 删除固定业务数据 fallback 和失败后的 localStorage 写成功。
- 所有失败统一进入明确 error state；空响应进入 empty state。
- 写操作只有在服务器返回成功后提示成功并刷新 query。
- 如果某能力本阶段暂不实现，页面显示“未接入/不可用”，不得显示演示结果。

验收：断开目标 API 后，页面不能出现任何固定统计、固定列表、固定成功 toast 或本地生成业务对象。

#### WEB-P0-02 建立 endpoint 契约清单与 smoke test

范围：为每个页面记录 method、path、query/body、响应 schema、写操作副作用，对照 `../Orbit`。

交付：

- 新增可重复运行的 contract smoke test，不只测 HTTP 200，还校验最小响应结构。
- 测试覆盖 NAS proxy 模式和无 NAS proxy 模式。
- 删除当前错误路径，禁止为错误 helper 再加兼容 alias。

验收：所有菜单页使用的 endpoint 在目标部署模式下存在；GET/POST/PUT/DELETE 与官方一致；404/405 清零。

#### WEB-P0-03 修复设置页高风险 schema

范围：AI、Routing、Resilience，随后复核 Advanced、Modality Bridge、Cache。

交付：

- 直接使用官方字段和对象结构，不保留双写兼容层。
- Resilience 改用 `/api/resilience` 专用契约。
- 每个字段完成 load -> edit -> save -> reload 回归。

验收：保存前后对比官方 API 原始 JSON，仅目标字段变化，刷新后 UI 与响应一致。

### Phase 1：恢复错误实现的核心页面

#### WEB-P1-01 CLI Code 与 CLI Agents

官方参考：`../Orbit/src/app/(dashboard)/dashboard/cli-code`、`cli-agents`。

交付：CLI 工具检测、过滤、配置生成/写入、自动同步、备份/恢复、安装指南、工具详情；CLI Agent 列表、运行控制和详情路由。删除当前 AI 编码伪终端。

验收：至少 Claude Code、Codex CLI、Custom CLI 的检测与配置闭环可用；详情深链刷新不 404。

#### WEB-P1-02 Playground、Translator、Search Tools

交付：

- Playground 接真实 chat completions/stream，补 preset、compare、builder、export。
- Translator 接 detect/translate/send/history/stream transform。
- Search Tools 接 search/web fetch/rerank，并补 provider、history、compare、scrape。

验收：浏览器 Network 可看到真实请求；服务端错误可复现到页面；不再存在固定回答或固定结果。

#### WEB-P1-03 压缩全链路

交付：统一接 `/api/compression/preview`、`compare`、`compare/verify`、engine config/analytics；Caveman 和 RTK 补其专有配置；combo、exclusion 只使用服务端数据。

验收：相同输入和配置下，当前 Web 与官方返回的 token、比率、stage、warning 可逐项对账。

#### WEB-P1-04 成本中心

交付：恢复成本概述；对 pricing、budget、free tier、free provider rankings 做完整功能对拍；按 feature flag 控制 Radar，并恢复主页面及四个子页面。

验收：时间窗、导出、成本探索维度、预算写入、免费额度、排行筛选、Radar 深链均与官方契约一致。

#### WEB-P1-05 Agentic 与工具页

范围：MCP、A2A、Memory、Cloud Agents、Conductor、Agent Bridge、Traffic Inspector、Discovery、API Endpoints、Plugins、Omni Skills。

交付：按官方页面逐项恢复读写和运行操作，不使用当前错误 endpoint；补 Plugins 配置子路由。

验收：每页至少有一个真实读链路和官方要求的完整写/动作闭环；刷新不丢状态。

#### WEB-P1-06 Audit、Health、Runtime

交付：Audit 改用 compliance/MCP/A2A 正确源；Health 聚合官方全部健康源；Runtime 移除 BFF 常量遥测，明确本机 BFF 与 Orbit server 的观测对象。

验收：页面每个指标都能追溯到响应字段；断开任一子源时只标记对应区域失败。

#### WEB-P1-07 Batch 与 Media

交付：Batch 使用 `/api/v1/batches`、`/api/v1/files` 完成上传、创建、状态、详情、下载和删除；Media 接真实 image/video/music/speech/transcription 请求，恢复 media provider 管理及详情子路由。

验收：真实文件和任务可跨刷新追踪；生成失败不产生占位媒体；结果 URL 来自服务器。

#### WEB-P1-08 导航、Feature Flag 与缺失子路由

交付：恢复成本概述与 Help；支持官方分组、固定分区、排序、隐藏项和 debug 条件；补 P0/P1 缺失子路由，移除语义错误的重定向。

验收：官方可见菜单在相同 flag/settings 下逐项可达；主页面所有深链均存在；刷新任一详情页不落入 404。

### Phase 2：真实页面的功能对拍和 UI 收口

#### WEB-P2-01 已接真实数据页面逐字段对账

范围：首页、Endpoint、API Manager、Providers、Combos、Analytics、Combo Health、Utilization、Search Analytics、Provider Stats、Activity、各日志、Conversations、Resilience、Gamification、General/Appearance/Security/Access Tokens。

交付：为每页建立“官方字段/动作 -> 当前组件 -> endpoint 字段”的对照表，补齐缺失筛选、导出、详情、刷新和写操作。

验收：不是仅截图相似；每个官方可操作控件都能在当前 Web 找到等价入口并产生相同副作用。

#### WEB-P2-02 视觉和交互 QA

交付：在桌面和窄屏下对拍 loading、empty、error、normal、large-data 五种状态；统一标题、面包屑、表格密度、Drawer/Modal、快捷键和可访问性。

验收：视觉差异均能被解释为有意 UI 优化，不再夹杂功能缺失。

## 8. 推荐执行顺序与依赖

```text
WEB-P0-01 Mock 清理
        + WEB-P0-02 契约清单
        + WEB-P0-03 设置 schema
                    |
                    v
CLI/Devtools  Compression  Costs  Agentic  Audit  Batch/Media
                    |
                    v
导航与缺失子路由
                    |
                    v
真实页面逐字段对账 -> 视觉 QA
```

建议以“一个官方页面及其所有子流程”为最小交付单元，避免再次出现只画列表、没有详情和写操作的半迁移状态。

## 9. 每个任务的 Definition of Done

每个页面合并前必须同时满足：

- 使用官方 method/path/schema，不使用兼容别名掩盖错误实现。
- 成功、空、失败、无权限、超时状态可区分。
- API 失败时不返回固定业务数据，不写 localStorage 业务副本，不提示成功。
- 所有写操作刷新真实查询；浏览器刷新后状态仍与服务器一致。
- 官方主页面上的 Tab、筛选、CRUD、运行操作、导出和详情深链均有等价能力。
- 关键数字可从 UI 追溯到原始响应字段。
- 当前 UI 改造不改变业务含义、权限、feature flag 和副作用。
- Ant Design Button、Input、Select、Segmented、DatePicker 等交互控件使用默认 `middle` 尺寸；除微型徽标外不新增 `size="small"`。
- 所有用户可见文案通过 `useI18n()`/`tt()` 提供；中文模式不直接拼接括号英文。
- `.shell-content-inner` 保持 `overflowX: "hidden"` 与 `maxWidth: "100%"`，桌面和窄屏均无非预期横向滚动。
- 通过 Admin/BFF typecheck、BFF tests 和 production build。
- 在官方 Web 与当前 Web 完成桌面截图/AX 结构对拍，并记录保留的 UI 优化。

建议验证命令：

```bash
pnpm --filter @omniroute/admin typecheck
pnpm --filter @omniroute/bff typecheck
pnpm --filter @omniroute/bff test
pnpm --filter @omniroute/admin build
```

## 10. 第一批可直接领取的任务包

为减少互相阻塞，第一批建议拆成以下独立 PR：

1. `web/no-fake-fallbacks`：删除 API helper 和页面固定 fallback，补 error/empty state。
2. `web/settings-contracts`：AI、Routing、Resilience 官方 schema 对齐。
3. `web/cost-center`：成本概述、预算、免费额度、免费排行。
4. `web/cli-tools`：CLI Code 与 CLI Agents 主/详情页。
5. `web/compression-runtime`：所有压缩测试和 Studio 接真实接口。
6. `web/agentic-contracts`：MCP、A2A、Memory、Cloud、Conductor。
7. `web/batch-media`：Batch/File/Media/Media Providers。
8. `web/navigation-parity`：Help、feature flag、分组和缺失深链。

其中 2、3、4、5、6、7 应依赖 `WEB-P0-02` 输出的契约清单；第一批不做大范围视觉重构。
