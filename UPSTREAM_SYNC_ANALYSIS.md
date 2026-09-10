# OmniRoute 上游 407 个 Commit 全量分析与 Orbit (`orbiot`) 同步实施方案

> **分析对象**：OmniRoute 官方分支 `upstream/release/v3.8.51`（最新提交 `ba597b631`，共 **407 个 Commit**）
> **目标系统**：重构独立部署版 **智枢 Orbit (`orbiot`)**（包含 `apps/*` 与 `packages/*`）
> **最后更新**：2026-09-11

## 上游增量同步游标

> **最后已处理的上游 Commit ID（不是 Orbit 本地提交）**：`ba597b631d22d85e56db6982f24b7d1ebe238df9`
>
> **上游分支**：`upstream/release/v3.8.51`
>
> **提交标题**：`fix(db): call_logs provider stats read true on empty and legacy data (#12832)`
>
> **游标含义**：该提交是本轮 407 个上游提交中最后、最新且已经完成处理的提交。下次同步先更新上游引用，再使用范围 `ba597b631d22d85e56db6982f24b7d1ebe238df9..upstream/release/v3.8.51` 获取游标之后的全部新提交；不要把 Orbit 本地最新提交当作同步游标。

机器读取值：

```text
UPSTREAM_SYNC_CURSOR=ba597b631d22d85e56db6982f24b7d1ebe238df9
UPSTREAM_SYNC_BRANCH=upstream/release/v3.8.51
```

> **功能类全量同步结论**：上游 79 个 `feat` 提交已按分布顺序完成逐项审计，`79 / 79` 均已处理（迁移、按 Orbit 架构等效实现、确认已由重构快照吸收或判定不适用），无 `🚧`、`⚠️` 遗留。统一构建与部署仍按约定暂停。
>
> **Node.js 运行时统一升级**：开发版本文件、根 `engines`、Docker 构建/运行镜像、GitHub Actions、OpenCode 插件、Skills 沙箱、运行时兼容检测及中英文提示均已统一到可复现的 Node.js `24.20.0` LTS；本机 nvm 默认版本及 Homebrew `node@24` 同步完成。
>
> **全量同步进度**：截至 2026-09-11，表格 407 行已全部终态化 —— `292` 项 ✅（迁移/等效/吸收/不适用），`115` 项 ⏭️ 排除，**无 `⚠️`、无 `⚡`、无 `🚧` 遗留**。2026-09-10/11 两轮完成 Batch A/B/C 共 30+ 项移植（含 codex 导入状态保护、memory 向量测量宽度/FTS5 诚实探测、插件 manifest 刷新与 hook 超时隔离、SSRF block-metadata 补齐等），全部通过定向 typecheck 与回归测试，未构建/未部署。

### 后续 Agent 交接摘要（2026-09-10）

- **执行范围**：仅处理 313 个 `feat/fix/perf/refactor` 代码类提交；完成数和剩余数以本文表格的实时 `✅/⚠️/⚡` 标记为准。
- **明确排除**：94 个 `ci/docs/test/chore/other`，以及用户指定的 2 个代码类提交 `6b587d004`、`e26a649d2`，均不再审计或迁移，统一标记为 `⏭️`。
- **续作顺序**：表格全部终态 —— 无 `⚠️`、`⚡`、`🚧` 项（`afb91a83b` 已于 2026-09-11 移植完毕）。全量同步完成，可进入统一构建/部署阶段。
- **工作区状态**：本轮代码、测试和文档已统一提交；后续 Agent 从该提交继续，不得 reset、checkout 或覆盖已有实现。
- **验证边界**：同步期间只运行定向测试、typecheck、lint 和架构审计；禁止执行 `pnpm build`、Docker build/push、部署、发布、Tag 或 NAS 操作。全部 407 个提交处理完成后再统一构建部署。

#### 可直接交给后续 Agent 的提示词

```text
在仓库 /Users/yanxianliang/shiguang/OmniRoute/orbiot 中，以 global 模式继续完成 UPSTREAM_SYNC_ANALYSIS.md 记录的 OmniRoute release/v3.8.51 全量同步。

当前执行范围只包含 313 个 feat/fix/perf/refactor 代码类提交。94 个 ci/docs/test/chore/other 提交，以及 6b587d004、e26a649d2，已经用户明确确认排除。表格已全部终态化（无 ⚠️、🚧 遗留，afb91a83b 已移植）；实际数量以文档表格最新标记为准。

执行要求：
1. 表格无 ⚠️、⚡、🚧 项（`afb91a83b` flat-rate 估算已于 2026-09-11 完整移植含回归测试）。全量同步已完成。
2. 每个提交都必须对照上游官方提交与当前 Orbit 实现：确有缺陷/缺失则按 apps/*、packages/* 分层架构迁移；当前实现已等效或更优则保留，但必须写出具体代码和测试证据；不适用则说明结构性原因。不要仅凭提交标题判断。
3. 从当前已提交基线继续；禁止 git reset、git checkout --、覆盖或回退现有实现，也不要擅自推送、创建 Tag。
4. 每完成一项立即更新 UPSTREAM_SYNC_ANALYSIS.md：将 🚧/⚠️/⚡ 改为 ✅，记录迁移位置、实现差异、验证命令和结果；同时维护顶部完成/剩余统计，避免文档与代码脱节。
5. 修复根因，不引入旧单体目录、兼容垫片、双实现、mock/fallback 假数据或与请求无关的重构。所有用户文案走 useI18n()/tt()，Ant Design 控件保持默认尺寸。
6. 同步期间只允许定向测试、typecheck、lint、静态检查和架构审计。绝对不要执行 pnpm build、Docker build/push、部署、发布、Tag、NAS 验证或任何构建部署动作。等 407 个提交全部处理完成后才统一构建部署。
7. 遇到上游路径与 Orbit 架构不一致时迁移语义，不要 cherry-pick 或整库 merge。验证失败要修复后再把文档标记完成。
8. 持续执行直到全部 313 个代码类提交处理完；最终确认 feat/fix/perf/refactor 不再有 🚧、⚠️、⚡。96 个 ⏭️ 项不要处理。完成后再输出按领域分组的完整报告，包括迁移、等效保留、不适用、验证结果和明确的未构建/未部署声明。
```

---

## 📋 同步任务跟踪进度看板 (Sync Task Board)

> 💡 本节维护从上游同步代码至 `orbiot` 的实时任务看板。完成某项任务后请在此勾选并更新状态。

### 进度概览 (Status Overview)
- **P0 级核心与安全修复**：`6 / 6 完成` (100%)
- **P1 级 Provider 与路由调度**：`6 / 6 完成` (100%)
- **P2 级管理台与体验增强**：`4 / 4 完成` (100%)
- **P3 级质量基线与 CI 门禁**：`2 / 3 完成` (67%)

### 🔴 P0 优先级：高危安全与核心稳定性修复 (立即实施)
- [x] **TASK-P0-01** [安全]: 移植 GHSA-5926 凭证导出与 CLI 配置写入 RBAC 拦截 (`49c4a620c`)
  - *目标文件*: `apps/control/src/settings/config/settings-config.controller.ts`
  - *说明*: 为 `export-json` 添加严格的鉴权与导出敏感数据保护。
- [x] **TASK-P0-02** [网关]: 移植配额查询 Singleflight 并发去重 (`3abd85509`)
  - *目标文件*: `packages/inference/src/services/quotaSaturation.ts`
  - *说明*: 为 `getSaturation` 添加 in-flight Promise Map，防止并发瞬时打穿后端。
- [x] **TASK-P0-03** [存储]: 修复 SQLite 启动时 WAL 锁竞争顺序 (`c8e2cb3ffc`)
  - *目标文件*: `packages/core/src/lib/db/core.ts`
  - *说明*: 将 `busy_timeout` 设置前置到 `PRAGMA journal_mode=WAL` 之前。
- [x] **TASK-P0-04** [脱敏]: 增强全局凭据脱敏正则与 5xx 拦截 (`89c42d36d`, `4a37c7f46`)
  - *目标文件*: `packages/core/src/lib/guardrails/credentialMasker.ts` & `packages/utils/src/errors/`
  - *说明*: 扩展 `AIza` 变长正则及 `sk-` 通配规则，在全局 5xx 错误响应中注入脱敏。
- [x] **TASK-P0-05** [流式]: 修复 Grok-Web / Zed / Z.ai 的 HTTP 200 流式假成功 (`ca2edfdca8`, `9d92d71014`, `855eda16d3`)
  - *目标文件*: `packages/inference/src/executors/grok-web.ts`, `packages/inference/src/executors/zed-hosted.ts`, `packages/inference/src/executors/zai-web/stream.ts`
  - *说明*: 识别 HTTP 200 流中夹带的 JSON 错误帧并主动截断异常。
- [x] **TASK-P0-06** [流式]: 修复非流式分支 Abort 映射与遥测丢失 (`3ab53d188`, `99282e105`)
  - *目标文件*: `packages/inference/src/handlers/chatCore.ts`
  - *说明*: 字符串形式的客户端 Abort 统一映射为 499 且不伪造 `clientResponse`；Orbit 现有直接执行路径已保留缓存遥测，不存在上游 `nonStreamingProviderLeg` 联合类型收窄问题。

### 🟡 P1 优先级：Provider 生态与路由调度核心能力 (尽快排期)
- [x] **TASK-P1-01** [路由]: 移植配额加权路由算法 (Quota-Weighted Routing) (`c1b34db50`)
  - *目标文件*: `packages/inference/src/services/combo/`
  - *说明*: Combo 调度时跳过空账号，按各账号剩余配额比例加权抽签。
- [x] **TASK-P1-02** [Provider]: 注册新增的 5 个 Provider (`cabbbe410`, `530096a3b`, `14dc6e851`, `a47d2e521`, `2e3cd599b`)
  - *目标文件*: `packages/providers/src/config/providers/`
  - *说明*: 引入 MaxAI, UC (uncensored.com), Perplexity Agent, SeekAi, LiquidAI。
- [x] **TASK-P1-03** [Provider]: 注册智谱 GLM-5.3-Flash Coding Plan 规格与计费配置 (`6f914b7a3`, `e0029eb5a`)
  - *目标文件*: `packages/providers/src/catalog/` & `packages/providers/src/config/pricing/`
  - *说明*: 补全 GLM-5.3-Flash 系列模型 ID、Token 计费与能力定义。
- [x] **TASK-P1-04** [Provider]: 同步火山引擎 (Volcengine) 多连接配额窗口绑定 (`0f81e7557`)
  - *目标文件*: `apps/control/src/providers/volcengine/`
  - *说明*: 已规范化 Coding/Agent Plan 的 5h、7d、日、月配额窗口，修复零额度误判；绑定时按显式连接、API Key、Key ID、默认名称、安全单连接顺序匹配，保留自定义名称和扩展数据，多连接歧义时新建而不覆盖；同时拒绝无有效窗口的套餐并从管理 API 响应剥离 Cookie/CSRF。新增 5 个回归用例，core/inference/control 类型检查通过。
- [x] **TASK-P1-05** [Provider]: 修复 Gemini 嵌套 Map 序列化与 Vertex 发现 (`57d7c8bc88`, `fe8ef4fa9`)
  - *目标文件*: `apps/gateway/src/provider-chat/` & `packages/providers/src/`
  - *说明*: 已在实际 Gemini/Antigravity schema 清理链路中提升属性级 `required: true`、移除非法标量 required，并将嵌套裸属性 Map 规范化为对象 schema；Vertex Anthropic 发现改用全局 `v1beta1/publishers/anthropic/models` 并解析 `publisherModels`。原看板 `0e1e9d892` 非官方有效提交，已校正为真实提交 `57d7c8bc88`。新增 4 个回归用例，inference/control 类型检查通过。
- [x] **TASK-P1-06** [目录]: 移植账号动态实时模型目录机制 (`ebdbd2c67`, `aa35d460d`)
  - *目标文件*: `packages/core/src/lib/providers/` & `apps/gateway/src/models/`
  - *说明*: 已将 AGY/Antigravity 的账号实时目录设为权威来源并合并同账号族目录；调度期将 picker 自定义模型叠加到 active synced catalog，同 ID 自定义元数据覆盖发现结果。Claude/Codex/GitHub/GHE Copilot OAuth 新连接默认启用自动同步，Claude 发现支持 OAuth/API Key 实时 `/v1/models`，不再固定返回静态目录。新增 5 个聚焦用例，providers/core/inference/control 类型检查通过。

### 🟢 P2 优先级：管理台体验与长尾能力 (持续迭代)
- [x] **TASK-P2-01** [控制台]: 升级 Request Logs 的可折叠 JSON 树状查看器 (`5684589ce`)
  - *目标文件*: `apps/console/src/features/logs/request-logs.tsx`
  - *说明*: 已新增原生可折叠 JSON 树组件，支持逐节点展开/折叠、全局展开深度调节、类型着色与完整 JSON 复制，并替换调用明细、请求载荷和响应载荷三个纯文本视图；控制按钮使用 Ant Design 默认尺寸并补齐中英文文案。console 类型检查通过。
- [x] **TASK-P2-02** [控制台]: 引入动态上下文压缩阈值调节滑块 (`96824288f5`)
  - *目标文件*: `apps/control/src/compression/` & `apps/console/src/features/compression/`
  - *说明*: 已采用官方 `compression/proactiveConfig` 存储契约，将原硬编码 70% 阈值改为 0.1–0.99 范围的同步热读设置，更新 API 写入后立即失效缓存；管理台新增 10%–99% 滑块与 70%/85% 关键刻度。原看板哈希无效，已校正为官方真实提交 `96824288f5`。新增 5 个相关用例，contracts/core/inference/control/console 类型检查通过。
- [x] **TASK-P2-03** [日志]: 评估并引入 Continuous Call-Log 导出 (BigQuery) (`385e90f44`)
  - *目标文件*: `packages/core/src/lib/logExport/`, `apps/control/src/log-export/` & `apps/console/src/features/logs/log-export.tsx`
  - *说明*: 已按 Orbit 拆分架构完整吸收：新增默认禁用的目的地/正文导出迁移与 CRUD、加密配置及只读占位符脱敏、基于 SQLite `rowid` 的增量数据源、正文/流水线按字节截断、可插拔目的地注册表、BigQuery JWT REST 客户端（建库建表、日分区/聚簇、`insertId` 去重、500 行/9 MiB 分块、瞬态与新表可见性重试）、成功后才推进的持久游标运行器、可配置小时级 JobRegistry 调度、管理鉴权控制 API、状态/测试/手动运行/游标重置接口及中英文管理台。新增 8 个聚焦回归用例；core/control/console 类型检查、架构审计、路由契约及 console 17 项测试通过。
- [x] **TASK-P2-04** [编排]: 评估 Orchestration 统一画布接入 (`63e4afa321`, `073b98462d`, `d2a027a156`, `6b4519c317`, `84b345d9c0`, `a628d28898`)
  - *目标文件*: `apps/console/src/features/orchestration/`
  - *说明*: 原看板 `2e0821b06` 不是官方有效提交，已校正为六个真实提交并按 Orbit 拆分架构完整吸收。新增 Cloud Agent/A2A/Conductor/Combo 四源容错快照、镜像去重、终态时效过滤、40 节点上限与真实溢出计数，提供 Agents/Routing/Overview/History 四视图、来源筛选、状态边、详情抽屉和 Conductor/A2A Repeat；A2A 生命周期写入既有历史表并按 30 天保留，memory hits 仅作为可关闭的观测元数据且截断为 200 字符。新增 `agents` WebSocket 通道并由 A2A/Cloud Agent 状态变更驱动即时刷新，断线保留轮询降级。新增 7 个聚焦用例，五个运行包类型检查、console 19 项测试、路由契约、网关独立性与架构审计均通过。

### ⚙️ P3 优先级：工程质量与门禁对齐 (验证与发布)
- [x] **TASK-P3-01** [测试]: 补充 Singleflight 并发测试与 SQLite 启动竞争回归用例
  - *目标文件*: `packages/inference/test/` & `packages/core/test/`
  - *说明*: 已覆盖同 key 三路并发只触发一次上游查询、拒绝 Promise 清理且保持 fail-open 缓存，以及主连接先设置 `busy_timeout` 再执行 WAL 锁操作、识别多驱动锁错误；4 个聚焦用例通过。
- [x] **TASK-P3-02** [门禁]: 执行全套 monorepo 边界与独立性审计
  - *命令*: `pnpm audit:app-boundaries && pnpm audit:gateway-independence && pnpm audit:route-contracts`
  - *说明*: 三项规定门禁均通过；同时修复 control 对日志导出、模型测试路由的 core 内部路径依赖，改为显式 allow-list 公共契约，并清除 inference 测试跨包直引 core 源码的问题。额外执行 `audit:package-boundaries` 亦通过，core/inference 类型检查、effort presentation 2 个聚焦用例与 `git diff --check` 均通过。
- [ ] **TASK-P3-03** [发布]: 待 407 个提交全部完成审计与吸收后，再统一构建新版镜像并部署至 NAS 验证真实模型调用；同步期间禁止提前构建或部署

---

## 一、全量提交统计与分类大盘

在这 407 个提交中，各业务领域与技术维度的提交数量及在 `orbiot` 中的状态分布如下：

| 业务领域 | 提交数 | 缺陷修复 (`fix`) | 新增特性 (`feat`) | 重构/性能 (`refactor/perf`) | 工程质量 (`ci/docs/other`) | orbiot 核心影响判断 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **安全与鉴权 (Security & Auth)** | **40** | 31 | 5 | 0 | 4 | 需重点移植安全拦截 |
| **网关流式与协议 (Gateway & Streaming)** | **64** | 48 | 7 | 2 | 7 | 需移植 Singleflight 与流式修复 |
| **路由调度与配额 (Routing & Quota)** | **59** | 33 | 17 | 3 | 6 | 需移植 Singleflight 与流式修复 |
| **Provider 与模型生态 (Providers & Models)** | **81** | 48 | 21 | 0 | 12 | 需更新模型生态与窗口绑定 |
| **数据库与存储缓存 (DB & Storage)** | **23** | 14 | 1 | 1 | 7 | 按需移植 |
| **管理台与 UI 交互 (Console & UI)** | **37** | 8 | 15 | 0 | 14 | 按需移植 |
| **插件/Agent/多模态桥接 (Plugins & Agents)** | **18** | 9 | 3 | 1 | 5 | 按需移植 |
| **工程架构/CI/质量基线 (Engineering & CI)** | **85** | 35 | 10 | 1 | 39 | 按需移植 |
| **总计 (Total)** | **407** | **226** | **79** | **8** | **94** | **全领域覆盖** |

---

## 二、按领域的全量 Commit 深度核查（当前 orbiot 是否存在问题 / 是否拥有功能）

### 2.1 安全与鉴权 (Security & Auth)（共 40 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 9 | `89c42d36d` | fix(security): redact AIza credentials of any length in error bodies (#12964) | `fix` | ✅ 已迁移：公共错误脱敏规则将 Google AIza 凭据由固定 35 位扩展为 20 位以上，覆盖截断、超长和未来格式 | 已完成；Utils 定向测试与 typecheck 通过 |
| 29 | `ce55151ca` | chore(ci): guard commit identity in pre-commit to stop author misattribution (#12772) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 35 | `a9f7598c6` | feat(db): fail-closed previous_response_id continuation for redacted video turns (#12150 P2b) (#12707) | `feat` | ✅ 已按 Orbit 架构同步：迁移 174、列补偿、持久标记与 continuation fail-closed | 已移植适用安全修复 |
| 37 | `7b2c9b554` | fix(sse): redact video transcript in pre-guardrail rejected-request logs (#12150 P2 item 7) (#12710) | `fix` | ✅ 已按 Orbit 架构同步：被拒请求写入 call_logs 前统一结构化脱敏视频转写字段 | 已移植适用安全修复 |
| 38 | `ec4f951e3` | test(ci): pin the openapi-security-tiers two-arm contract with an executing gate test (#12581) (#12652) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 43 | `f40c77e83` | fix(docker): document and harden cli profile trust boundary (#12570) (#12706) | `fix` | ✅ 已审计，不适用：Orbit Compose 无 `cli` profile、无 Docker socket/宿主目录挂载；各服务仅使用命名卷，原提交的宿主 root 信任边界不存在 | 无需移植；保持禁止引入 `/var/run/docker.sock` 的当前部署边界 |
| 44 | `c5d47dad8` | docs(security): document socket.yml scanner config + CI workflow link (#12575) (#12764) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 48 | `c3945a724` | fix(ci): security-tier gate must honor ALWAYS_PROTECTED_API_PATTERNS too (+ file-size rebaseline) (#12605) | `fix` | ✅ 已审计，不适用：Orbit 不包含官方 `check-openapi-security-tiers.mjs` 检查器及其 `ALWAYS_PROTECTED_API_PATTERNS` 配置 | 无需移植官方检查器补丁；Orbit 路由边界由现有独立审计脚本覆盖 |
| 58 | `57d7c8bc8` | fix(providers): sanitize boolean required and nested bare maps for Gemini (#12269) (#12624) | `fix` | ✅ 已吸收：Gemini schema Phase 0 已提升属性级 required:true、删除其他标量 required，并递归规范化嵌套 bare property map，同时避开 properties/$defs 等 schema map 容器 | 已有实现与回归测试覆盖；2 项定向测试通过 |
| 63 | `85b8d128e` | fix(auth): do not park healthy quota accounts as expired (#12452) | `fix` | ✅ 已按 Orbit 架构同步：有效期仍健康的 token 不再因瞬时 401 被永久标记 expired；过期竞态账号定时重探，真实终态保持封锁 | 已移植适用修复 |
| 64 | `8c1dfc416` | fix(combo): do not treat credits-exhausted 401 as auth skip (#12449) | `fix` | ✅ 已按 Orbit 架构同步：401 配额/余额耗尽按 quota 分类，Combo 不走鉴权跳过，Chat/Embedding 对 credits_exhausted 返回 402 | 已移植适用修复 |
| 77 | `2265ce761` | fix(security): harden public error boundaries (#12506) | `fix` | ✅ 已迁移：官方完整路径/堆栈/凭据/安全转义脱敏引擎下沉至 `@orbit/utils/errors`；HTTP/SSE、Moderation/OCR、MCP、provider validation、skills、代理/调用/pending/终态日志与持久化边界均完成安全投影 | 已完成；Utils 8 项、Core 6 项、Inference 11 项边界测试通过，四包 typecheck 与应用边界审计通过 |
| 79 | `5ba424767` | chore(quality): rebaseline file-size caps the error-boundary campaign grew past (#12654) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 85 | `2f6fdf16c` | fix(codex): close response failure boundary (#12444) | `fix` | ✅ 已迁移：Codex JSON/SSE/bridge 失败统一使用固定公开 message，并仅保留与 HTTP 状态匹配的封闭 code/type 白名单 | 已完成；`codex-public-error.test.ts` 2 项通过，Inference typecheck 通过 |
| 86 | `9469fa5f5` | fix(streaming): sanitize generic stream failure boundaries (#12457) | `fix` | ✅ 已迁移：通用流控制器日志与 OpenAI/Responses/Claude 终止帧统一通过 `buildErrorBody` 的公开错误投影，新增凭据/源码路径回归测试 | 已完成；`public-stream-error-boundary.test.ts` 通过 |
| 89 | `406fbd3dc` | fix(huggingchat): sanitize transport failures (#12467) | `fix` | ✅ 已迁移：HuggingChat 创建会话与发送消息的 fetch 异常先脱敏，再经统一错误体投影返回 | 已完成；Inference typecheck 通过 |
| 90 | `774e6db39` | fix(security): redact dashboard failure events (#12469) | `fix` | ✅ 已迁移：`request.failed` 实时事件不再携带原始诊断，统一返回凭据与源码路径脱敏后的错误投影 | 已完成；Dashboard lifecycle 回归测试通过 |
| 92 | `a721fc729` | fix(adapta): redact streamed upstream errors (#12438) | `fix` | ✅ 已迁移：Adapta HTTP 200 流中的 `errorText` 不再透传，改用固定公开错误文本 | 已完成；Inference typecheck 通过 |
| 94 | `4a37c7f46` | fix(security): close 3 advisories — search baseUrl exfil, sk- in the error sanitizer, bifrost relay header leak (#12620) | `fix` | ✅ 已按 Orbit 架构同步：区分 operator providerSpecificData 与 caller provider_options 的 search baseUrl 信任边界，仅允许无密钥且显式 opt-in 的 SearXNG 接受调用方覆盖；错误 passthrough 与完整 sanitizer 共用原始凭据规则；两条 Bifrost relay 路径统一剥离凭据、Cookie 与陈旧 framing headers，独立 relay 同时规范化非 2xx 错误体 | 已完成；Inference 安全回归 5 项通过，Inference/Gateway typecheck 与 diff check 通过 |
| 120 | `9af3ec511` | feat(video): redact transcript in the in-memory pending-request snapshot (#12430 item 6) (#12596) | `feat` | ✅ 已按 Orbit 架构同步：进入 chatCore 前替换进行中快照中的视频转写字段 | 已移植适用安全修复 |
| 122 | `49c4a620c` | fix(authz): hard-gate every credential export and CLI-config write (GHSA-5926-2w35-7h4q) (#12600) | `fix` | ✅ 已按 Orbit 架构吸收：ALWAYS_PROTECTED 覆盖日志导出、Codex profile、AGY apply-local，并通过动态 pattern 精确覆盖 Claude/Codex 凭据 export 与 apply-local，避免扩大到普通 provider 管理面；流量 HAR/进程面继续由 LOCAL_ONLY 保护 | 已有实现与清单回归覆盖；6 项定向测试、Core/Control typecheck 通过 |
| 123 | `3f3d27e26` | fix(ci): openapi-security-tiers checker must honor routeGuard patterns + imported prefixes (#12350) | `fix` | ✅ 已审计，不适用：Orbit 不包含该官方 OpenAPI security-tier checker，路由所有权与公开边界使用 Orbit 自有审计 | 无需移植基于官方源码布局的解析逻辑 |
| 130 | `cb38bfa6e` | feat(video): redact raw client-snapshot transcript fields in the detailed log (#12150 P2) (#12528) | `feat` | ✅ 已按 Orbit 架构同步：结构化克隆并覆盖 messages/input 三层候选字段 | 已移植适用安全修复 |
| 145 | `86e83d413` | fix(video): re-anchor transcript log-redaction so PII/credential maskers can't reopen the leak (#12150 P1 follow-up) (#12503) | `fix` | ✅ 已按 Orbit 架构同步：以完整 guardrail 链最终 payload 重锚 fullText，避免 PII/凭据遮罩使日志脱敏匹配失效 | 已移植适用安全修复 |
| 151 | `e243b04de` | fix(security): unbiased maxai X-Random nonce + stricter URL/regex assertions (#12502) | `fix` | ✅ 已随 MaxAI 接入吸收：X-Random 使用 crypto.randomInt 拒绝采样生成 6 位随机槽；Orbit 无上游相关宽松 URL/正则测试路由 | 已移植适用安全修复 |
| 155 | `500568a1c` | fix(providers): migrate web cookie TLS transport to wreq-js (#12429) | `fix` | ✅ 已按 Orbit 架构同步：五个 Web Cookie Provider 从 tls-client-node 临时文件 sidecar 迁移到固定版本 wreq-js 3.2.0，采用直连流式读取、按浏览器/OS/代理隔离的进程级 LRU transport pool、ephemeral cookie scope、绝对超时/取消与精确 transport 失效；Notion 移除可能绕过代理的 plain-fetch 降级路径 | 已完成代码与锁文件迁移；官方针对 Next standalone/npm 多平台制品的 native manifest 不适用于 Orbit 的容器内单平台 pnpm install/deploy 流程；34 项迁移/残留测试及 Inference typecheck 通过，原生装载随全部同步完成后的统一构建验证 |
| 158 | `5ab1e9fe5` | feat(video): redact transcript text from logs and durable memory (#12150 P1) (#12427) | `feat` | ✅ 已按 Orbit 架构同步：结构化生成日志脱敏影子，持久请求日志精确替换，并同时禁用请求/响应两侧长期记忆提取 | 已移植适用安全特性 |
| 167 | `7802f6ea1` | fix(uc): route UC error strings through sanitizeErrorMessage; allowlist the retired codex id (#12437) | `fix` | ✅ 已随 UC 接入吸收：WebSocket 建连与发送异常均经 sanitizeErrorMessage；Orbit 未接入上游独立 UC TTS 面 | 已移植适用安全修复 |
| 175 | `0ec750402` | fix(sse): preserve ZWNJ and ZWJ in sanitized responses (#12359) | `fix` | ✅ 已按 Orbit 架构同步：所有响应/流式/文本工具调用/Gemini/Antigravity 清理入口仅移除 ASCII 词内混淆 joiner，保留语言与 emoji 的 ZWNJ/ZWJ | 已移植适用修复 |
| 192 | `0389b0725` | fix(auth): prefer accounts without backoff in least-used rotation (#12375) | `fix` | ✅ 已按 Orbit 架构同步：least-used 首先按 backoffLevel 升序选择，再以 lastUsedAt/priority 决胜 | 已移植适用修复 |
| 211 | `678e6077e` | fix(kiro): do not permanently ban on 'User is not authorized to make this call' (#11809) | `fix` | ✅ 已按 Orbit 架构同步：Kiro/Amazon Q 缺少 profileArn 的特定 403 归类为可恢复 project_route_error，其他 403 仍保持 forbidden | 已移植适用修复 |
| 250 | `ad54249c5` | fix(security): strip Qwen/Alibaba console-session cookies from provider API responses (#12287) | `fix` | ✅ 已按 Orbit 架构同步：Provider 管理响应统一移除 Qwen/Alibaba Cookie 与 SecToken，非敏感元数据保持可见 | 已移植适用安全修复 |
| 267 | `e7a65d28d` | fix(oauth): keep Claude personal and Team organizations apart (#12222) | `fix` | ✅ 已按 Orbit 架构同步：Claude OAuth 以 organizationUUID 双边匹配区分个人与 Team 组织，相同组织及缺字段旧记录保持原去重行为 | 已移植适用修复 |
| 268 | `05490304b` | fix(oauth): mark empty Antigravity projectId as degraded and clear stale errors (#11284) (#12205) | `fix` | ✅ 已按 Orbit 架构同步：agy/antigravity 空 projectId 无条件标记 degraded；发现项目后恢复 active 并清空旧错误字段，warning 不写入连接记录 | 已移植适用修复 |
| 331 | `1b2c6f4c3` | fix(guardrails): restore injection-guard logging on middleware-only routes (#12117) | `fix` | ✅ 已按 Orbit 架构同步：未指定 logger 的 middleware-only 路由恢复 console 审计日志，显式 null 保持静默 | 已移植适用修复 |
| 335 | `039a42540` | fix(oauth): bind Google refresh to the client that issued the token (#12106) | `fix` | ✅ 已迁移：Google token refresh 按连接保存的 `builtin`/`custom:<clientId>` 签发者选择 client，Gemini 与 Antigravity 内置 client 分离，未知 provider fail-closed | 已完成；`google-oauth-client-binding.test.ts` 3 项通过，Inference typecheck 通过 |
| 376 | `81bf1ef98` | feat(leases): expose owner-authenticated connection display name (#11910) | `feat` | ✅ 已按 Orbit 架构同步：新增 owner/API key/generation 三重围栏的 status 动作，仅返回安全连接名与 provider；邮箱、生成身份、内部 ID 和凭据均不暴露 | 已移植适用特性 |
| 379 | `8bed10130` | fix(guardrails): prevent duplicate prompt-injection-guard log output (#11936) | `fix` | ✅ 已按 Orbit 架构同步：Chat/Completions/Messages/Responses/Relay Chat 的前置 middleware 显式静默，由 handleChat guardrail registry 唯一记录 | 已移植适用修复 |
| 380 | `ff0743071` | fix(auth): downgrade expected transient states from warn to debug (#11937) | `fix` | ✅ 已同步：无活跃账号和暂时无凭据属于预期选择状态，日志由 warn 降为 debug | 已移植适用修复 |
| 387 | `a3c19dd27` | fix(ci): accept CVE-2025-68121 in the prebuilt tls-client .so, auto-close base-red issues, guard Scorecard on the default branch (#12085) | `fix` | ✅ 已审计，不适用：Orbit 无 Trivy/tls-client 例外清单、release-green issue 自动化及 Scorecard workflow；现有发布工作流不调用这些机制 | 无需移植官方 CI 专属修复，也不引入过期 CVE 豁免 |


### 2.2 网关流式与协议 (Gateway & Streaming)（共 64 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 2 | `f7349dd77` | chore(quality): rebaseline chatCore.ts after the non-streaming regression fixes (#13045) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 5 | `3abd85509` | fix(quota): dedup concurrent getSaturation misses with singleflight (#12787) | `fix` | ✅ 已吸收：quota saturation 以 provider/connection/dimension key 共享并发 miss promise，并在 finally 清理 inflight；失败继续 fail-open 缓存为 0 | 已有实现与回归覆盖；2 项定向测试通过 |
| 10 | `3ab53d188` | fix(sse): restore abort mapping, cache telemetry and fence safety on the non-streaming leg (#12990) | `fix` | ✅ 已按 Orbit 架构同步 | 已移植适用修复 |
| 11 | `99282e105` | fix(sse): pin the ok variant of the non-streaming leg result in chatCore (#12963) | `fix` | ✅ 不适用（Orbit 无该联合类型路径） | 无需移植 |
| 13 | `d6f315018` | fix(chat): continue after a server-owned tool on Chat Completions (#12867) | `fix` | ✅ 已按 Orbit 分层架构同步：`packages/core` 新增服务端工具循环状态机（`lib/skills/serverOwnedToolLoop.ts`）与门禁（`lib/skills/serverOwnedToolLoopGate.ts`），interception 补齐 `classifyServerOwnedCalls` / `formatEscapeHatchResponse`，并让 `extractToolCalls` 支持按 sourceFormat 分类；`packages/inference` 非流式 Chat Completions / Messages 在 Orbit 自有工具独占本轮时改为同连接 follow-up 续跑：有界 3 轮、120s 循环预算、单项 32KiB / 累计 64KiB UTF-8 输出预算、调用-结果身份校验、不可序列化降级、累计 usage 聚合，follow-up 连接漂移以 409 fail-closed。为不改动默认行为，整条循环由 `ORBIT_SERVER_OWNED_TOOL_LOOP_ENABLED` 控制（默认关闭） | 已完成；新增 14 项定向用例（gate/分类/续跑/逃生舱/预算/连接漂移/usage 聚合/UTF-8 截断/transcript 校验）通过，core 与 inference typecheck 通过；未构建、未部署，端到端 provider follow-up 随最终统一构建验证 |
| 28 | `d857bd053` | fix(glm): drop extra 16th arg to SSE transform helper (#12770) | `fix` | ✅ 已吸收：GLM 调用 createSSETransformStreamWithLogger 仅传入有效参数，末位为 suppressThinkClose，不含无效 16th highWaterMark 参数 | 现有 Inference typecheck 已通过 |
| 33 | `92a617c23` | fix(sse): re-enable prompt compression for native Codex passthrough (#12834) | `fix` | ✅ 已迁移：native Codex Responses passthrough 不再被无条件排除于 prompt compression；operator exclusions 仍可关闭，reactive context rewrite 继续保持显式旁路 | 已完成；3 项定向回归与 Inference typecheck 通过 |
| 34 | `9d1a896c6` | fix(tests): retire dead model ids from the chat-pipeline integration suite (base-red #12581) (#12670) | `fix` | ✅ 已审计，不适用：该提交只修改官方 tests/integration/chat-pipeline.test.ts 的固定模型夹具；Orbit 拆分后的测试树不存在该文件与三处旧夹具 | 无生产变更可迁移 |
| 51 | `c41ec7f86` | chore(quality): rebaseline chat.ts for #12641's effective-input persistence (#12680) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 53 | `74c2d2639` | fix(responses-continuation): chain off the effective post-reconstruction input, not the pre-reconstruction client bytes (#12641) | `fix` | ✅ 已按 Orbit 架构迁移：保留 raw client body 的同时记录 previous_response_id 展开后的 effectiveInput，后续 continuation 优先基于完整实际输入串联并兼容旧 artifact fallback；视频转写脱敏同步覆盖 effectiveInput | 已完成；2 项定向回归、Inference/Core typecheck 与 diff check 通过 |
| 56 | `d36d077a4` | fix(resilience): keep Overloaded STREAM_EARLY_EOF off the provider breaker (#12626) | `fix` | ✅ 已吸收：新增统一的模型容量过载识别（HTTP/结构化 529、`Overloaded`/`overloaded_error`），单模型与 combo 路径均不再误触发 Provider 熔断；combo 全部因短时 OPEN 被跳过时复用 cooldown 预算等待复试。新增 3 项定向测试通过，core/inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 61 | `ac94dd9bc` | docs(arch): one-process recipe for tens of long /v1/responses (#12493) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 68 | `bb8e75a00` | fix(resilience): surface Responses failed.error.message in 502s (#12472) | `fix` | ✅ 已吸收：Responses API 返回 `status=failed` 时，502 诊断会携带经 trim 的上游 `error.message`，缺失/空白消息仍保持通用文案；最终响应继续经过既有统一脱敏。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 80 | `350ac8c12` | fix(sse): preserve 1min.ai partial output before stream errors (#12466) | `fix` | ✅ 已吸收：1min.ai 流在首段内容前报错时输出标准 502 错误帧，已有内容后报错则保留已发送前缀并触发终止错误，不再把上游错误拼入 assistant 内容；共享 readiness 回放改为按需拉取并提供有界取消。新增 3 项边界测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 82 | `627fcba60` | fix(sse): preserve Perplexity stream failures (#12465) | `fix` | ✅ 已吸收：Perplexity 首内容前失败改为标准安全错误帧，已有内容后的失败保留前缀并以 502 终止，不再伪装为 assistant 文本或落库失败会话；协议 reader 对 abort 使用有界清理且取消不再合成成功终态。与 1min.ai 共享边界共 5 项测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 83 | `ca2edfdca` | fix(grok-web): stop streaming errors from reporting false success (#12458) | `fix` | ✅ 已同步 | 已移植修复 |
| 84 | `d63d25f96` | fix(huggingchat): surface HTTP 200 JSONL failures (#12456) | `fix` | ✅ 已吸收：HTTP 200 JSONL 中的 generation error 统一转为 `HuggingChatStreamError`；首内容前失败返回可 fallback 的结构化 502，已有内容后失败保留前缀并以安全 502 终止，非流式路径同步修复，取消时不再伪造 stop/DONE。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 87 | `9d92d7101` | fix(sse): fail Zed streams without false success (#12455) | `fix` | ✅ 已同步 | 已移植修复 |
| 88 | `855eda16d` | fix(zai): treat HTTP 200 stream errors as failures (#12454) | `fix` | ✅ 已同步 | 已移植修复 |
| 91 | `4ef4e25fa` | fix(sse): surface Adapta non-stream SSE errors (#12459) | `fix` | ✅ 已吸收：Adapta 非流式调用遇到 HTTP 200 SSE `type:error` 时取消 reader 并返回通用结构化 502，不再生成空成功响应，也不泄露上游错误细节；正常 text-delta 聚合保持不变。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 97 | `f51cd295c` | chore(providers): bump Claude Code wire identity + Devin bridge pin to 2.1.258 (#12604) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 102 | `872990962` | fix(logging): raise the SSE payload collector's default cap (#12461) | `fix` | ✅ 已吸收：结构化 SSE collector 默认上限由 200/48KiB 提升至 2000/512KiB，避免长 reasoning 在完成事件前耗尽日志/continuation 采集容量，同时保留显式上限与截断标记。新增 2 项容量测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 103 | `0019a47f2` | fix(responses-continuation): fail closed on a collector-truncated, empty output array (#12460) | `fix` | ✅ 已吸收：previous_response_id 回放会拒绝 collector `_truncated`、空 output 及数组截断标记，不再用不完整/空历史静默重建下一轮；有效非空输出保持可继续。新增 2 项定向测试通过，core typecheck 通过 | 已迁移并验证（未构建/部署） |
| 105 | `4ec4ce410` | fix(sse): remap non-contiguous upstream tool_calls index to a gap-free output_index (#12445) | `fix` | ✅ 已吸收：Chat Completions 上游任意/非连续的 tool_calls index 按首次出现顺序映射为稳定、从 0 连续的局部索引，emit/close 共用映射，避免 Responses output_index 与最终 output 数组位置错位。新增 2 项映射测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 116 | `52456a1ce` | fix(quota): drop generic quota cache on upstream 429 (#12325) | `fix` | ✅ 已吸收：非 Codex 上游 429 会按 provider/connection 清除 generic quota wrapper，并标记下一次 usage 请求 `forceRefresh` 以绕过 Provider 内层缓存；并发刷新不会覆盖新 429 标记，刷新失败有 60 秒防锤击，探针请求保持隔离。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 127 | `e2e330a05` | perf(stream): compile hot-path regexes once, bound token caches, fix quadratic buffering (#12179) | `perf` | ✅ 已吸收并按 Orbit 加固：SSE/工具调用/Codex/配额重试等热路径正则提升为模块常量，GLM 与通用流支持可配置 high-water mark；Adapta/GigaChat token 与 inflight cache 加容量上限并清除过期项，browser pending context 增加 5 分钟回收；压缩 memo 改用 `structuredClone`。ZCode 分帧器进一步避免上游仍会在不完整大帧的每个 chunk 上 concat 的 O(n²) 路径，仅在完整帧到齐后合并。usage 无计量字段时快速返回，TinyCMS 外部探测增加超时。未采用上游跨请求共享临时 Set（并发污染）及会改变 reasoning signal 语义的实现。新增 3 项性能结构/行为测试并连同 6 项 usage/stream 回归通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 132 | `82c64d76d` | feat(providers): modernize CLOVA Studio chat and embeddings (#12277) | `feat` | ✅ 已吸收：CLOVA Studio 从旧 `/v1/openai` shim 切换为原生 Chat Completions v3，新增 `clova` 双向翻译器与按模型 URL 编码 executor；HCX-007/005/DASH-002 补齐 128K/32K context、输出上限、reasoning 与精确 vision 能力，支持 camelCase 采样、工具调用/partialJson、结构化输出、图片 data URI、named SSE 错误与 terminal snapshot 去重。Embedding v2 注册固定 1024 维单文本协议，OpenAI batch 按顺序扇出并合并 index/usage，拒绝空文本、token array、base64 encoding 与错误 dimensions，HTTP 200 错误 envelope 不再伪装成功。移除不再适用的 OpenAI `/models` 动态发现并更新控制台说明。官方移植的 50 项定向测试通过，providers/contracts/control/console/inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 156 | `7ed8ada43` | feat(providers): restore ChatGPT Web via clean-room browser transport (#12239) | `feat` | ✅ 已按 Orbit 架构同步：恢复 canonical `chatgpt-web`，以 Playwright storage-state 驱动独立 headed 浏览器上下文；完整吸收首方模块契约发现、Sentinel/Conduit 握手、SSE→WebSocket handoff、delta v1 解码、附件上传与 SSRF/DNS pinning、超时/取消、429 账号回退、OpenAI 响应适配及观察到的 GPT-5.5/5.6/Luna 目录；保留既有 `chatgpt-web-codex`，legacy `cgpt-web` 继续 fail-closed | 已完成；新增 migration 175 仅解除 canonical 写入 tombstone，54 项专项测试、Core/Providers/Contracts/Inference/Control/Console typecheck 与 diff check 通过；未构建、未部署 |
| 160 | `c420a51df` | fix(providers): finalize Nimble and Opper asset provenance (#12415) | `fix` | ✅ 已按 Orbit 资产布局吸收：删除无充分再分发依据的 `apps/console/public/providers/nimble-search.svg`（UI 自动回退文字头像）；保留的 Opper SVG 已验证为官方固定提交所对应 SHA-256。新增 2 项资产边界测试通过，console typecheck 通过 | 已迁移并验证（删除可由 Git 恢复；未构建/部署） |
| 161 | `d6412532c` | chore(quality): ratchet open-sse typecheck baseline to zero (#12418) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 177 | `62e2481ee` | fix(resilience): derive the chat_admission_busy Retry-After from observed lease occupancy (#12395) | `fix` | ✅ 已吸收：heavy admission lease 记录获取时间，结构与字节阶段的 `chat_admission_busy` 503 依据已耗尽 queue window 与最年轻活跃 lease 年龄生成 Retry-After，向上取整、最大 60 秒，并保留历史 1/2 秒下限。新增 2 项定向测试通过，core typecheck 通过 | 已迁移并验证（未构建/部署） |
| 183 | `3a5641839` | fix(sse): name the shadowed custom provider node in the no-credentials error (#12365) | `fix` | ✅ 已吸收：无凭证且尚未尝试任何连接时，诊断历史 OpenAI/Anthropic 兼容节点前缀是否被新内置 provider 的 ID/别名遮蔽；错误与 AUTH 日志会命名节点、冲突前缀和修复方式，路由优先级及 combo 404 回退契约保持不变，查询失败降级为原错误。新增 4 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 198 | `cabbbe410` | feat(providers): add MaxAI — signed OpenAI-compatible provider (chat, tools, vision, image-gen, doc-RAG) (#11461) | `feat` | ✅ 已同步核心 Provider 与聊天执行链 | 已移植适用特性 |
| 208 | `af0a9609f` | feat(sse): support native max reasoning effort and per-model clamping (#11875) | `feat` | ✅ 已按 Orbit 架构同步：`max` 升级为独立 canonical tier（`extra` 仍映射 `xhigh`），模型发现保留原生 `max`；provider sanitizer 为 GLM 5.2/5.3+、DeepSeek V4+、Kimi K3+、Command Code、OpenCode Go/Ollama Cloud 及别名保留或映射原生顶级 effort，并对 o1/o3、MiniMax、Grok 4.5/4.6、Muse Spark 按实际上下限钳制，o1-preview 移除不支持参数，GLM 5.3+ 强制启用 thinking | 已完成；16 项专项测试、Contracts/Core/Inference/Gateway typecheck 与 diff check 通过；未构建、未部署 |
| 227 | `8fc683437` | fix(system): propagate abort signal to stream reader in HTTP version checks (#12232) | `fix` | ✅ 已按 Orbit 的可配置 registry/release endpoint 架构吸收：版本元数据 reader 监听同一 AbortController 信号，超时或中止会主动 cancel reader、释放锁并清理定时器，避免 fetch 已中止但流读取永久悬挂；原 16 KiB 上限保持不变。新增定向测试通过，control typecheck 通过 | 已迁移并验证（未构建/部署） |
| 234 | `5e6c9a92d` | fix(sse): estimate usage in passthrough stream even with include_usage (#12151) | `fix` | ✅ 已吸收：passthrough 流即使请求 `include_usage`，上游在 finish 时仍未返回有效 usage 且已有正文时会生成 `estimated: true` 的估算；随后到达的 usage-only chunk 会去重，空响应不伪造 usage，并补齐 Gemini `totalTokenCount` 有效性识别。新增 4 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 240 | `abbbca216` | feat(sse): full language parity for output styles (es/de/fr/it/ru/zh + autoDetect) (#12289) | `feat` | ✅ 已按 Orbit 架构同步：terse-prose、less-code、ponytail、i-have-adhd 输出风格补齐西/德/法/意/俄/中文三档指令，Caveman 同步补齐意/俄/中文；输出阶段可从最后一条 user 文本或文本 content part 自动检测语言，无文本时回落默认语言，语言关闭时稳定使用英文；管理台提供完整语言集合、自动/固定选择 | 已完成；38 项输出风格/语言矩阵测试、Inference/Control/Console typecheck 与 diff check 通过；未构建、未部署 |
| 243 | `9629d78ec` | fix(translator): strip neutral tool_choice when tools absent in Responses-to-Chat (#12141) (#12166) | `fix` | ✅ 已吸收：Responses→Chat 转换在 tools 为空/缺失时移除无意义的 `tool_choice: auto/none`，避免 vLLM 等严格端点因缺少 tools 返回 400；有工具时保留中性选择，无工具的 required/强制选择仍保留并交由上游明确报错。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 244 | `0ff164701` | fix(sse): trust finish_reason over reasoning-ratio heuristic in response quality validation (#12262) | `fix` | ✅ 已吸收：当最终 content 为空但存在 reasoning 且无 tool call 时，明确的 `finish_reason: length/max_tokens` 会直接判为 token 上限截断，不再依赖 reasoning token 达到 90% 的启发式阈值；缺失 finish_reason 或 stop 的既有判断保持不变。新增 4 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 260 | `2e17161ea` | feat(sse): wire the PROVIDER_PROFILES window gate into the global provider cooldown (#12247) | `feat` | ✅ 已按 Orbit 架构同步：可选全局 Provider Cooldown 的 provider 级记录按 oauth/apikey profile 的失败阈值、滑动窗口与固定冷却时长生效，阈值以下不再误封整个 provider；连接级记录继续沿用既有指数退避，成功请求同时清空 provider 窗口，时间戳数组有界 | 已完成；6 项窗口/过期/成功清理/连接隔离测试、Inference typecheck 与 diff check 通过；未构建、未部署 |
| 271 | `8d388912a` | feat(providers): refresh vendored ChatGPT Web connector to v4.0.7 (#12181) | `feat` | ✅ 已吸收：按官方最终状态导入 46 个 v4.0.7 clean-room vendor 文件并移除旧 synthetic web-search，完成 Orbit 名称、数据目录、doctor/provider validation、sol/pro 能力与新版 browser-login/执行器主链路适配；补齐 `ajv`、`ajv-formats`、`tiktoken` 依赖。inference typecheck 通过，handshake、browser session、executor adapter、delta-v1 与 provider 共 42 项定向测试全部通过 | 已迁移并验证（未构建、未部署） |
| 277 | `3383adbbd` | perf(sse): defer cloneLogPayload until after SSE collector cap check (#12243) | `perf` | ✅ 已按 Orbit 架构同步：`createStructuredSSECollector.push()` 先向 reducer 灌入调用方原始 payload，再以原始 payload 计算事件体积并统一做 maxEvents/maxBytes 上限判定，仅对存活事件执行 `cloneLogPayload`，被丢弃事件不再付出深拷贝成本；为维持快照隔离，OpenAI reducer 改为保存首块 primitive（id/created/model）而非块引用，Responses reducer 新增 `ResponseSnapshot` 深拷贝 output/metadata，Claude reducer 的 Orbit 专有 `context_management` 亦改为深拷贝，`getEvents()` 仍返回防御性副本 | 已完成；新增 7 项快照隔离/延迟克隆用例、既有 2 项上限用例全部通过，inference typecheck 通过；未构建/部署 |
| 279 | `18dd83cd8` | fix(sse): sort injected tools deterministically for prompt caching (#12234) | `fix` | ✅ 已吸收：memory/skills 注入链返回前按 Chat `function.name` 或 Anthropic 顶层 `name` 对 tools 做稳定字典序排列，避免相同工具集合因注入顺序变化破坏 provider prompt cache；排序复制数组，不改写调用方原数组。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 283 | `ba200b8d2` | fix(chat-admission): clarify local 503 source (#12223) | `fix` | ✅ 已吸收：结构型重请求被 admission 拒绝时，503 明确说明容量来自本地 admission 且尚未尝试上游 provider 路由，避免用户将 `chat_admission_busy` 误判为 provider 故障；状态码、错误码、reason 和 Retry-After 契约不变。相关 3 项测试通过，core typecheck 通过 | 已迁移并验证（未构建/部署） |
| 288 | `50a6f7e32` | fix(translator): keep system content parts as Responses instructions (#12207) | `fix` | ✅ 已吸收：Chat→Responses 转换会把首个 system/developer 消息的文本 content parts 展平并以双换行拼入 `instructions`，保留 prompt-caching 客户端携带 `cache_control` 的系统提示；非文本 part 无对应表示时忽略，字符串和空数组行为不变。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 302 | `668beed5b` | fix(sse): absorb AbortError/request_signal_aborted in the client-abort crash guard (#12165) | `fix` | ✅ 已吸收：进程级 HTTP 客户端中止保护现识别 `name=AbortError` 且消息含 abort 的 SSE `request_signal_aborted` 与 DOMException 形态，常规断连不会再作为未处理异常终止服务；仅消息提及 abort 的普通 TypeError 仍保持崩溃语义。新增 3 项（含子进程存活/崩溃边界）测试通过，core typecheck 通过 | 已迁移并验证（未构建/部署） |
| 303 | `298ad0fd6` | fix(translator): strip plaintext reasoning content for opaque responses backends (#12128) (#12171) | `fix` | ✅ 已吸收：通用 `openai-compatible-responses*`、`custom-openai-responses*`、Codex/Responses 变体默认采用 opaque reasoning transport；转换为 Responses 后再次应用输入策略，移除严格后端不接受的明文 reasoning content，同时保留真实加密 continuation。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 313 | `4e4522c28` | fix(sse): strip type:'custom' from Claude tools on agentrouter dispatch (#12126) | `fix` | ✅ 已吸收：Claude 格式发往 AgentRouter 时只移除普通工具的 `type: custom`，避免其 Rust/New-API 反序列化器返回 unknown variant 400；版本化内置类型与无类型工具保持不变，MiniMax 等其他严格网关仍自动补 `type: custom`。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 314 | `9aa7c2459` | fix(sse): stop advertising video providers the dispatcher cannot run (#12131) | `fix` | ✅ 已吸收：Pollinations、MiniMax、Together、Replicate 及 endpoint 不可用的 NanoGPT 视频项标记 unsupported 并给出原因，不再进入可用模型目录；NanoGPT format 纠正为 `openai-video`，OpenAI-compatible handler 在节点无 baseUrl 时正确使用 registry 完整 endpoint，避免 null 崩溃。新增 3 项目录/dispatch/fallback 契约测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 317 | `43f2b2c28` | fix(sse): refuse an AI Horde queue that cannot fit the request budget (#12143) | `fix` | ✅ 已吸收：AI Horde 首次 check 后读取 `wait_time/queue_position/eligible_workers`，预估等待超过剩余请求预算时立即以 504 返回可操作诊断并取消 job；可容纳队列继续轮询，轮询间隔按预计等待的 1/10 在 1–8 秒间退避，降低共享 Horde API 压力。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 325 | `d13c6cb19` | fix(sse): emit native web_search_call for Responses web_search fallback (#12031) | `fix` | ✅ 已按 Orbit core-owned skills interception 架构吸收：成功执行内置 web_search fallback 后，在保留 `function_call_output` 的同时追加原生 Responses `web_search_call`（含 query 与过滤后的 sources）；失败或其他工具不生成该项。Responses 的 stream 请求命中 server-side fallback 时强制非流式，确保结果可组装。新增 2 项定向测试通过，core/inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 337 | `2da9ade59` | fix(sse): honor CLIProxyAPI environment API key (#12099) | `fix` | ✅ 已吸收：CLIProxyAPI data-plane 凭证优先读取持久化 `cliproxyapi_api_key`，缺失/空白或 settings 读取失败时回退至经 trim 的 `CLIPROXYAPI_API_KEY`；仅在 CLIProxyAPI-bound executor 边界替换原 provider 凭证。补充根 `.env.example` 与环境变量文档，新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 339 | `54a111438` | fix(sse): keep unavailable forced connections scoped (#12080) | `fix` | ✅ 已吸收：显式指定的 combo/header 连接若未被主动排除但已从活跃/策略过滤池消失，会走既有无可用凭证路径，不再静默改选同 provider 的其他账号；失败后排除、冷却、额度耗尽等既有释放 pin 并回退 sibling 的行为保持不变。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 348 | `4d20d3797` | fix(sse): keep cache-write tokens in OpenAI-shaped usage (#11814) | `fix` | ✅ 已吸收：共享 token accounting、流式/非流式 usage 提取、Responses→Chat 翻译和调用日志均识别顶层及 prompt/input details 中的 `cache_creation_tokens`/`cache_write_tokens`，避免 OpenAI-shaped Claude/OpenRouter/Devin/Codex bridge 丢失 cache-write；未上报继续为 N/A，明确上报 0 保留为 0。新增 3 项定向测试通过，contracts/inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 353 | `f5742c3a8` | chore(quality): tighten complexity/cognitive-complexity ratchets to the current tip; land the missed gateways.ts rebaseline (#11771) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 359 | `4c8074ba7` | fix(sse): give extended-thinking targets the reasoning readiness budget (#11959) | `fix` | ✅ 已吸收：所有 provider 上以 `-thinking` 结尾或带后续限定符的模型别名都会获得一次 30 秒首事件 reasoning warm-up 预算，Kiro/Devin 等非 Claude wire-format 路径不再被误判 504；与 Claude-format、Codex high reasoning 的同类预算互斥，不重复叠加。新增 3 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 371 | `66e02ec73` | fix(plugins): deliver onStreamComplete to disk-installed plugins (#11825) (#11934) | `fix` | ✅ 已吸收：插件 manifest schema/defaults、进程 loader、安装/升级/发现记录及激活注册链全部支持 `onStreamComplete`；流完成 payload 传递与 onRequest/onResponse 相同的 requestId 供关联。新增真实磁盘插件子进程投递测试通过，core/inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 377 | `41c613525` | fix(ollama): preserve multi-byte UTF-8 content split across stream chunks (#11921) | `fix` | ✅ 已吸收：Ollama SSE→NDJSON 转换在整个响应流复用带 `stream:true` 的 TextDecoder，跨网络块拆分的多字节 UTF-8 字符不再被替换为 U+FFFD。新增 CJK+emoji 字节中部切分测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 378 | `22011437f` | fix(providers): route OrcaRouter chat requests to /v1/chat/completions (#11923) | `fix` | ✅ 已吸收：OrcaRouter registry 的默认请求地址由裸 `/v1` 改为完整 `/v1/chat/completions`，避免上游 `404 Invalid URL (POST /v1)`；provider 目录提示同步纠正。新增端点契约测试通过，providers typecheck 通过 | 已迁移并验证（未构建/部署） |
| 384 | `097226b61` | fix(codex): normalize non-stream responses (#11951) | `fix` | ✅ 已吸收：Codex provider 标记 forceStream，使其始终流式的 Responses 上游在客户端 `stream:false` 时仍由 chatCore 读取终止 SSE 并聚合为 JSON，避免等待错误的非流式 EOF/响应形态。新增 registry 契约测试通过，providers typecheck 通过 | 已迁移并验证（未构建/部署） |
| 396 | `a1d6ff5fb` | fix(api): preserve caller-provided X-Correlation-Id on chat completions (#11760) | `fix` | ✅ 已吸收：Gateway chat completions 对合法调用方 `X-Correlation-Id` 做 trim、CRLF 清理和 256 字符上限校验，流式 keepalive 与非流式 handleChat 均沿用该 ID；缺失/空白/超长值继续安全生成。新增 2 项定向测试通过，gateway typecheck 通过 | 已迁移并验证（未构建/部署） |
| 400 | `92574de16` | fix(chat): preserve unstripped model string for passthrough provider routing (#11840) | `fix` | ✅ 已吸收：combo 显式改写到 passthrough provider 时保留调用方原始完整 model 字符串，避免 Cline/KiloCode 等代理收到被剥前缀的模型；target 缺少 providerId 时回退使用 provider。新增 2 项定向测试通过，inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 404 | `4e1188708` | fix(barrel): migrate open-sse, src/shared, src/sse, src/models, src/domain off the @/lib/localDb barrel import (#11795 Phase 4) (#12053) | `fix` | ✅ 已按 Orbit 包分层吸收：inference 已无 localDb 运行时依赖；core domain/shared 的 quota cache、cloud sync、API key resolver/policy、model sync 改为直接依赖 readCache/settings/providers/apiKeys/combos owning modules，降低 barrel 引入的循环依赖与错误打包面。新增静态契约测试通过，core typecheck 通过 | 已迁移并验证（未构建/部署） |
| 405 | `38a29661d` | URGENT fix(build): route ChatGPT Web MCP bundle through runBuildTool (Windows/Node 24 build crash) v.50/.51 (#11706) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |


### 2.3 路由调度与配额 (Routing & Quota)（共 59 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 3 | `0f81e7557` | feat(volcengine): canonical quota window mapping and safe multi-connection plan binding (#12950) | `feat` | ✅ 已吸收：Coding/Agent Plan 统一映射 5h、7d、日、月窗口并修复零额度误判；套餐绑定按显式连接、API Key、Key ID、默认名称、安全单连接顺序匹配，多连接歧义时新建且不覆盖，自定义名称/扩展数据保留，管理响应剥离 Cookie/CSRF。5 个回归用例及 core/inference/control typecheck 已通过 | 已迁移并验证（未构建/部署） |
| 14 | `ce49d969c` | refactor(combo): move handleRoundRobinCombo into roundRobinCombo.ts (#12811) | `refactor` | ✅ 已按 Orbit 架构同步：`handleRoundRobinCombo` 连同其私有 `resolveTargetTokenLimit`（原先夹在 `combo.ts` 的 import 块之间）整体 lift-as-is 到新模块 `packages/inference/src/services/combo/roundRobinCombo.ts`（`export async function handleRoundRobinCombo`），`combo.ts` 改为 `import { handleRoundRobinCombo } from "./combo/roundRobinCombo.ts"`，从 4028 行降到 2939 行；新模块只回引 `combo.ts` 已导出的 `releaseStickyPinOnFailure`、`clearStaleLKGP` 两个 hoisted 函数（无求值期循环依赖），其余依赖全部来自既有 combo/ 子模块与包内公共契约 | 已完成；移植 4 项源码契约守卫用例（定义位置/私有 helper 位置/finally 清理 rrLoopSafetyTimer/保留 sticky pin 释放）全部通过，inference typecheck 通过；未构建/部署 |
| 15 | `6b587d004` | refactor(combo): split executeTarget into gates, attempt, and loop (#12746) | `refactor` | ⏭️ 用户确认排除：当前项目已经完成整体结构重构；该提交仅重排核心执行路径，迁移风险大且不提供新增行为 | 不同步 |
| 16 | `c1b34db50` | feat(combo): quota-weighted routing — skip empty accounts, draw by leftover (#12789) | `feat` | ✅ 已同步 | 已移植特性 |
| 19 | `1b97f42ba` | fix(combo): treat a pin-only step as implicit connection allowlist (#12697) | `fix` | ✅ 已吸收：combo step 有 connectionId 而无/空 allowedConnectionIds 时隐式生成仅含该 pin 的硬 allowlist，失败后释放临时 forcedConnectionId 也不会扫描 sibling；fingerprint composite pin 展开时同步重写全部 allowlist ID，输入 schema 允许显式列表。新增 2 项定向测试通过，core/inference typecheck 通过 | 已迁移并验证（未构建/部署） |
| 22 | `d7721559a` | fix(combo): restricted keys listing a combo name no longer skip every member (#12899) | `fix` | ✅ 已吸收：请求级策略已允许 combo 名称时，组合预检不再用该名称 allowlist 错误淘汰全部内部 target；provider 通配 allowlist 仍逐 target 过滤，且 Orbit 扩展的 blockedModels/disableNonPublicModels 不会被组合名豁免绕过，reasoning effort 继续透传权限检查。新增 4 项定向测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 23 | `e8a91173d` | fix(combos): inherit model_context_overrides onto effort-suffixed targets (#12475) (#12926) | `fix` | ✅ 已吸收：combo 上下文兼容性检查先采用 effort 变体精确 override，未命中时剥离 none/minimal/low/medium/high/xhigh/max 后缀并继承同 provider 基础模型 override；大小写后缀兼容且精确变体继续优先。新增 3 项真实 SQLite override 回归测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 26 | `d4d2e68a1` | fix(dashboard): pass nodeMap into Runtime QuotaGroup (#12868) | `fix` | ✅ 已审计并按 Orbit 架构吸收：Orbit 的 Vite 管理台已移除官方模块级 QuotaGroup/闭包 nodeMap，不存在 ReferenceError；但同一非健康分支漏渲染 error monitors，现统一分组并补齐 error 卡片，避免仅错误状态时出现空白。新增 1 项分组回归测试通过，console typecheck 与 diff check 通过 | 已迁移等效修复并验证（未构建/部署） |
| 36 | `d345520d7` | fix(dashboard): read the combos usage-guide dismissal from an external store (base-red #12581) (#12671) | `fix` | ✅ 已吸收：组合使用指南的持久 dismissal 改由 useSyncExternalStore 读取，提供 SSR 安全快照、同页订阅通知与跨标签页 storage 事件同步；临时隐藏仍保持仅当前挂载有效，受限存储环境 fail-open 显示指南。新增 1 项外部存储回归测试通过，console typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 52 | `6ff7b2627` | fix(dashboard): keep a request's pending-tracking id stable across combo target retries (#12650) | `fix` | ✅ 已吸收：pending tracker 以请求级 correlationId 复用同一 ID，使管理台按首个 ID 轮询时可跨 combo target fallback 继续追踪；不同/缺失 correlationId 仍生成独立 ID，映射随既有 age/cap sweep 清理并由 reset 同步清空，兼容旧 HMR state。新增 3 项定向测试通过，core typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 54 | `f8a0f9c1f` | chore(quality): rebaseline combo.ts for the stacked reset-aware scoring (#12678) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 55 | `2a6eff0ae` | fix(combo): keep Antigravity Gemini usable when Claude weekly is empty (#12637) | `fix` | ✅ 已吸收：Antigravity/agy 通用配额转换、reset-aware/reset-window/auto 与逐 target cutoff 均携带 requestedModel，并按 Gemini/Claude family 隔离 5h/weekly 窗口及两层缓存；同连接的 Claude 周配额耗尽不再淘汰 Gemini，429 仍按连接清空全部 family 快照并强制刷新，非 Antigravity 保持单一作用域。新增 2 项 family 回归并连同既有 5 项配额测试全部通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 62 | `6aa3690de` | feat(providers): filter GitHub combo members against live catalog (#12473) | `feat` | ✅ 已吸收：GitHub/gh 显式 combo 成员在凭据预检前按 active authoritative live catalog 校验，缺失成员跳过、未同步目录 fail-open，目录读取按单请求/提供商 memoize；Copilot `/models` 同时剔除 policy 非 enabled 与 model_picker_enabled=false 条目，公共 catalog 契约已补齐。新增 4 项定向测试通过，core/inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 74 | `11e1c79e6` | fix(combos): clear LKGP pins on delete (#12425) | `fix` | ✅ 已吸收：combo 删除与其名称命名空间下全部持久 LKGP pin 在同一事务中清理，随后逐 key 失效读缓存；名称前缀及 `%`/`_` LIKE 通配均不会误删 sibling，未知 combo 不触碰状态。新增 3 项真实 SQLite 回归测试通过，core typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 76 | `16b0d4e3a` | fix(catalog): re-audit free-tier quotas against official pages (#12649) | `fix` | ✅ 已吸收：按上游 2026-09-02 官方来源复核事实更新 Orbit 的双层免费额度目录、可路由模型注册和说明文档。Gemini/Ollama Cloud 因无公开 token 数字改为 uncapped 且不计入 headline；Groq 改为 5 个现役模型各自 200K TPD（每模型 6M/月、无共享 pool），淘汰旧 ID并补 qwen3.8；Nara 改为 8 个计划模型共享 7M/day（210M/月），同步 Telegram 绑定提示；Mistral 1B 池补充带日期的控制台证据，Cerebras 从 legacy recurring map 移除。新增 4 项定向测试通过，providers/inference/core typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 101 | `4866f927a` | fix(combo): universal-handoff fixes — bare-fallback note, same-request scoping, silent-failure logging (#12338) | `fix` | ✅ 已吸收：universal handoff 仅在当前请求首个 target 上注入或生成，same-request fallback 保留原始消息而不会被无上下文交接说明替换；fallback 成功仍无条件记录实际服务模型，供下一请求判断。无摘要的 bare note 明确禁止臆造缺失上下文，旧/新摘要生成器对空历史、非 2xx 与不可解析响应均记录可诊断 outcome（测试环境静默）。新增 2 项定向测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 110 | `831ea040c` | feat(quota): Moonshot Open Platform balance and TPD lock for custom nodes (#12590) | `feat` | ✅ 已吸收：识别 Moonshot 官方域名与自定义 baseUrl，查询账户余额并写入统一 quota；现有 quota preflight/429 分类负责 TPD 锁定 | 已迁移到 usage 分包架构 |
| 112 | `40c80756e` | fix(quota): keep Antigravity Gemini usable when Claude weekly is empty (#12566) | `fix` | ✅ 已吸收：Antigravity/agy 配额预检、auto 与其他 combo 策略均按 Gemini/Claude 模型族筛选 quota windows，族级窗口存在时不再让全局 `limitReached` 串扰另一族；执行器、core-owned 错误与账号 fallback 将 quota exhaustion 写为族级模型锁和 `providerSpecificData.antigravityFamilyRateLimitedUntil`，启动选号时恢复双 provider alias 锁，RPM/QPM/普通错误仍不扩大为族级或整连接冷却。Orbit 的 core quota cache 已有同等模型族判定，无需引入 core→inference 反向依赖。新增 7 项定向测试通过，core/inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 114 | `35caeb31f` | feat(settings): persist headroomUrl for the Headroom proxy (#12487) | `feat` | ✅ 已吸收：设置 PATCH schema 新增经 trim、限长 500 且仅允许 HTTP(S) 的 `headroomUrl`，空值保留以启用回退；Headroom 状态与启动统一按“持久设置 > `HEADROOM_URL` > localhost:8787”解析，外部地址继续只探测不由 Orbit 启停。高级设置页新增地址保存、状态展示和本地启停入口。新增 3 项定向测试通过，core/control/console typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 129 | `3740839e2` | fix(combo): fall back to full pool when collapsed sole survivor is context-too-small (#12278) | `fix` | ✅ 已吸收：请求兼容性过滤若只剩一个候选且其已知 context window 仍小于请求需求，会恢复原候选池供后续较大窗口模型尝试；vision 请求仍只恢复确认支持视觉的目标，未知 context 的幸存者不会复活因 tools/output 等硬能力淘汰的目标。大型池压缩至 1–2 个时将拒绝原因提升至 info 便于诊断。新增 3 项定向测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 173 | `26d20a000` | fix(api-manager): preserve allowedCombos entries the Combo picker cannot render (#12397) | `fix` | ✅ 已吸收：Orbit API Key 编辑器新增 All/Restrict combo 权限与实时组合列表；`rt-*`、已删除组合等 picker 无法渲染但后端可识别的 `allowedCombos` 条目会从 wildcard 中分离、以只读标签展示，并在 All→Restrict 往返及保存时原序保留，避免误写 `[]` 变成 deny-all。后端既有 schema 已允许这些非空规则，无需兼容层。新增 2 项定向测试通过，console typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 176 | `5a3411112` | fix(resilience): count resolved 5xx results against the provider breaker (#12360) | `fix` | ✅ 已吸收：CircuitBreaker `execute()` 新增 resolved-result 分类（success/failure/ignore），聊天执行包装明确把计数交给持有 single/combo/live-test 请求上下文的调用层，避免已 resolve 的 5xx 先被误记成功、再与 `_onFailure()` 抵消；single-model 成功与可计数 5xx 各只记录一次，combo/live test 保持既有独立计数，Orbit 后续已有的 request-scoped、网络路径与 529/overloaded 排除规则不回退。新增 8 项定向断言并连同 3 项 overloaded 回归通过，core/inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 182 | `8d16a50df` | fix(api): keep the images wrapper on combo routes and default Codex to b64_json (#12362) | `fix` | ✅ 已吸收：Codex 图像生成和编辑在未传 `response_format` 时默认返回 `b64_json`，仅显式请求 `url` 才生成 data URL；image combo 成功路径不再剥掉 handler 已生成的 OpenAI `{created, data}` 外层结构，若兼容旧 handler 返回裸数组则补回该结构，图像数量计费也改为读取正确层级。新增 3 项定向测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 189 | `290f723ec` | fix(guardrails): keep auto combos exempt from the vision bridge credential guard (#12373) | `fix` | ✅ 已吸收：Vision Bridge 将 `auto`/`auto/*` 识别为虚拟组合，不再用不存在的 `auto` provider 凭据行将其误判为不可用；仍扫描实际 vision pool，只有至少一个成员可用时才原样返回虚拟组合并交由下游轮转，缓存命中也重新验证真实成员凭据；整个 pool 不可用及具体 fixedModel 无凭据时继续 fail closed。新增 5 项定向测试通过，core typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 193 | `e7b144828` | fix(combo): name output_tokens as the exclusion reason instead of structured output (#12374) | `fix` | ✅ 已吸收：当 `max_tokens` 超过 combo 全部候选的已知输出上限时，capability exhaustion 不再误报为“不支持 structured output”，而是明确报告请求 token 数与池内最高已知 ceiling；按 Orbit 完整 `provider/model` 的 target 结构解析能力，避免重复限定导致 ceiling 误算为 0。新增定向测试通过，inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 212 | `5a0a131bc` | feat(usage): devin-cli agentic quota + openrouter credits in Provider Limits (#12256) | `feat` | ✅ 已吸收：Devin Connect protobuf 日/周 Agentic quota 已接入；OpenRouter credits/free windows 已由现有 fetcher 展示 | 已迁移 |
| 214 | `cf53b9220` | feat(combos): add universal handoff feature flag (#12167) | `feat` | ✅ 已吸收：新增 `UNIVERSAL_CONTEXT_HANDOFF_ENABLED` 运行时总开关并接入 handoff 配置解析，默认开启且可热切换 | 已迁移并通过 inference 类型检查 |
| 222 | `a86b9019a` | feat(auto-combo): declare observed reliability as a scoring factor (#12317) | `feat` | ✅ 快照已吸收：auto-combo scorer 与 speed ranking 均含 observed reliability/失败率权重 | 保留当前更完整的分层评分实现 |
| 223 | `438db55c4` | feat(providers): manual "Clear cooldown" action in the cooling panel (#12224) | `feat` | ✅ 当前实现更完整：Provider Health Autopilot 已提供按连接清除 cooldown 的诊断动作，模型 cooldown 面板也支持单项/全部清除 | 无需复制旧面板实现 |
| 224 | `6dd82b77d` | fix(guardrails): pass providerId to getResolvedModelCapabilities in checkComboVision (#12112) (#12169) | `fix` | ✅ 已吸收：combo Vision Bridge 决策将 step 的显式 `providerId`/`provider` 传入能力解析，正确识别 `nvidia/nemotron-*` 等 provider 内部含命名空间的模型；Orbit combo compatibility 的 context、vision、structured/output-token 判断统一加入 provider-aware target 解析，同时区分普通完整 `provider/model` 与 provider-native namespaced ID，避免重复限定。新增 2 项定向测试通过，core/inference typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 226 | `5ff6513ca` | fix(combos): send null to clear an agent feature instead of omitting it (#12177) | `fix` | ✅ 已吸收：combo 编辑器对清空 system message、tool filter 和关闭 context cache protection 的操作发送显式 `null`，创建时空值仍省略；共享 ComboItem 合约与 update schema 接受 nullable，create schema继续拒绝 null，repository 既有 null-means-delete 语义完成实际持久化清除且 omitted 字段保持不变。新增 6 项定向测试通过，contracts/core/console typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 232 | `3b82d8508` | docs(auto-combo): complete the mode pack table and gate what it claims (#12316) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 233 | `d19572fb9` | fix(combo): expose every scoring weight the engine actually uses (#12314) | `fix` | ✅ 已吸收：Auto/LKGP scorer 的 15 个真实因子全部进入 combo validation schema 与控制台滑块，补齐 `connectionDensity`、`quality`，并将 schema/UI 默认值逐项对齐引擎 `DEFAULT_WEIGHTS`（总和 1.0）；移除控制台无效的 `latency`/`cost` 三键画像，模式包改用引擎实际识别的 `ship-fast`、`cost-saver`、`quality-first`、`offline-friendly`，手动滑块自动切回 custom。新增 4 项覆盖一致性测试通过，core/inference/console typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 235 | `2f33f2c20` | feat(routing): report why the zero-cost guard excluded a candidate (#12319) | `feat` | ✅ 已吸收：strict zero-cost 判定从布尔结果扩展为 safe 或 7 类可诊断原因（not-in-catalog、regime-not-free、no-hard-stop、contradictory-noauth、exhausted、state-unknown、no-connection），明确区分新鲜 exhaustion 与缺失/过期 quota state；只读 auto candidate inspector 不再应用该过滤，而是在每个候选上返回 `freeAccessExclusion`，dispatch 路径仍按原规则 fail-closed，ToS 独立过滤不变。同步路由文档，新增 3 项定向测试通过，inference/gateway typecheck 与 diff check 通过 | 已迁移并验证（未构建/部署） |
| 239 | `9d0499595` | chore(quality): baseline-headroom skips generated and vendored files in the fileSize worst-file signal (#12291) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 251 | `eeba38204` | fix(combo): bound the pre-dispatch unavailable skip so a stale label cannot dark a pool (#12168) (#12285) | `fix` | ✅ 已吸收：`comboPredicates.ts` 新增 `UNAVAILABLE_LABEL_GRACE_MS`(60s，与 core `connectionRecovery.ts:119` 的 `ERROR_LABEL_GRACE_MS` 显式对齐) 与 `isWithinUnavailableGrace(lastErrorAt)`；`getPersistedConnectionCooldownSkipReason` 的裸 `unavailable` 分支由无条件跳过改为 `status === "unavailable" && isWithinUnavailableGrace(connection.lastErrorAt)`，超出宽限期或无 `lastErrorAt` 的孤儿行放行，避免 `ALL_TARGETS_SKIPPED` 且零上游尝试的死锁 | 已完成；新增 8 项定向用例（近期跳过/过期放行/孤儿放行/未来冷却仍跳过/终端状态仍跳过/helper 边界）全部通过，inference typecheck 通过；未构建/部署 |
| 254 | `073b98462` | feat(dashboard): orchestration canvas — /dashboard/orchestration with Agents/Routing/Overview tabs (part 2/2) (#12261) | `feat` | ✅ 已随 TASK-P2-04 吸收：统一编排画布已提供 Agents/Routing/Overview/History 视图、四源快照与状态边 | 已迁移并验证（未构建/部署） |
| 262 | `4bcd8cee9` | fix(combo): always clear the loop-safety timer, not just on the happy path (#11804) (#12245) | `fix` | ✅ 已吸收：`dispatchWithCooldownRetry` 的 loop-safety 定时器句柄提升到函数作用域 `activeLoopSafetyTimer`，每次 `setTry` 迭代武装后立即发布，并将整个 `setTry` 循环与收尾返回包进 `try/finally`，在 finally 中统一 `clearTimeout`；原先仅 `if (anySuccess)` 分支清理（注释原文 “clear the safety timer on the happy path”），导致 all_targets_skipped / all_accounts_inactive / aggregated status / final fallback / global timeout 五条错误路径各泄漏一个 600s 定时器，其闭包长期持有 `orderedTargets` 与 exhausted 集合。504 兜底行为不变 | 已完成；新增 3 项源码结构守卫用例（finally 清理 / 句柄提升到循环外 / 504 武装未被削弱）并与既有 combo 用例共 20 项全部通过，inference typecheck 通过；未构建/部署 |
| 272 | `debb82bdd` | feat(usage): add Kilo Code balance and Kilo Pass quotas (#12178) | `feat` | ✅ 已吸收：并行查询 Kilo balance 与 Kilo Pass tRPC，独立降级并归一化 USD quota | 已迁移 |
| 278 | `a4b4bca2e` | fix(combo): stop retries when pinned Codex model is unavailable (#12240) | `fix` | ✅ 已吸收：`combo/nativeCodexTurnPin.ts` 新增 `NATIVE_CODEX_PINNED_MODEL_UNAVAILABLE_CODE`、`createPinnedModelUnavailableResponse()`（400 `invalid_request_error`，非可重试）、`isPinnedTargetModelScopedUnusable()`（熔断 OPEN/供应商冷却/凭据门为瞬时原因 → 不终止；模型锁定、per-model 配额、配额耗尽 cutoff、额度感知亲和不足 → 视为模型级不可用）与 `areAllPinnedTargetsModelScopedUnusable()`；`combo.ts` 的 native turn pin 分支由“目标缺失即返回可重试 409”改为：目标缺失或全部模型级不可用均释放 quota-share 名额并返回 400，保留 pin 以便下一轮正常路由，避免在一个已失效的模型上烧完重试预算后抛 503 | 已完成；inference typecheck 通过，新增 7 项定向用例（400 载荷/空集/全锁终止/有健康兄弟不终止/熔断 OPEN 视为瞬时/健康目标/源码守卫 2 处 400 与名额释放）全部通过；未构建/部署 |
| 280 | `ae37413af` | fix(resilience): isolate local host execution errors from provider circuit breakers (#12233) | `fix` | ✅ 已吸收：`@orbit/core` 的 circuit-breaker 契约新增 `isLocalExecutionError()`（按 errno 码 ENOENT/EACCES/EPIPE/ERR_CHILD_PROCESS_STDIO_MAXBUFFER 与 spawn/command-not-found/child-process-exit/local host execution 报文识别本机进程失败），并在 `resilience/circuit-breaker` 再导出与 `public/resilienceCircuitBreaker.d.ts` 声明；inference 侧 `comboPredicates.shouldRecordProviderBreakerFailure`/`shouldSkipConnDisable` 与 `handlers/chatPredicates.shouldTripProviderBreakerForResult` 统一排除本机执行错误，避免把 Orbit 自身进程故障记成上游 provider 故障而熔断 | 已完成；core/inference typecheck 通过，core circuit-breaker 公共契约测试 2/2、新增 6 项定向用例全部通过；未构建/部署 |
| 286 | `2bd3023e0` | fix(combos): prioritize SQLite row id over inner JSON id and notify delete errors (#12213) | `fix` | ✅ 已吸收：`sqliteComboRepository.withRowId` 由「仅当 inner JSON 无 string id 时才套用行主键」改为无条件 `if (comboId) parsed.id = comboId`，杜绝复制/导入后 data JSON 残留模板 id 导致 `GET /api/combos` 返回错配 id、后续 DELETE/PUT 404；删除失败提示方面 Orbit 控制台 `features/combos/combos.tsx` 的 `handleDeleteCombo` 既有 `try/catch + message.error(...)` 分支已等效，无需改动 | 已完成；core typecheck 通过，新增行主键优先用例（getCombos/getComboById/getComboByName 均归一化到行主键，且用列表返回的 id 删除成功）1/1 通过；未构建/部署 |
| 287 | `d0529c036` | fix(providers): gate the Codex auto-ping usage read on the shared quota throttle (#12209) | `fix` | ✅ 已吸收：`apps/worker/src/jobs/quota-auto-ping.ts` 的 `QuotaAutoPingDeps` 新增可注入 `throttleQuotaFetch`，`pingConnection` 在跳过检查与凭据刷新之后、`getCodexUsage` 之前 `await deps.throttleQuotaFetch()`，使这条每分钟无人值守执行的 Codex 配额读取同样受 `quotaFetchThrottle`(#6009/#6058) 限速；未被跳过的连接才占用名额，轮询节奏不变。`packages/inference/package.json` 新增 `./services/quotaFetchThrottle` 子路径导出供 worker 消费（#11904 仅此一条 Codex 读取未走闸门） | 已完成；worker typecheck 通过，新增 3 项定向用例（两次连接为 throttle→fetch→throttle→fetch 顺序、熔断跳过不占名额、凭据刷新失败不占名额）全部通过；未构建/部署 |
| 299 | `18c71b91d` | feat(auto-combo): add weighted score router strategy (#12155) | `feat` | ✅ 已吸收：注册 `score` 策略，透传自定义权重与 explorationRate | 已迁移并通过 contracts/inference 类型检查 |
| 305 | `b7a0c5413` | chore(lint): batch 5 of #12146 — combos, endpoint, provider-stats, api-manager and costs react-hooks violations resolved (#12174) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 309 | `718accb03` | chore(quality): register search-432 cooldown test in stryker tap.testFiles (#12170) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 316 | `ececf91e9` | fix(search): treat HTTP 432 and plan limit errors as transient cooldown (#12139) | `fix` | ✅ 已迁移：上游 HTTP 432 与 plan-limit 错误按瞬时冷却处理，Orbit search 链路同步该分类 | 已迁移并验证（未构建/部署） |
| 320 | `cda832c3a` | feat(settings): raise sticky round-robin limit caps to 1000 (#12015) | `feat` | ✅ 已吸收：schema 已是 1000，并修正 Provider 控制台残留的 10 上限 | 已迁移并通过 console 类型检查 |
| 321 | `1dd046814` | fix(combo): honor an operator-set context_length at request time (#12090) | `fix` | ✅ 已迁移：combo 请求时遵循 operator 设置的 context_length；inference 测试注册 provider runtime ports 后 11/11 通过 | 已迁移并验证（未构建/部署） |
| 327 | `838fc00f2` | fix(resilience): decouple rate-limit execution expiration from queue-wait budget; preserve errors in oversized call-log artifacts (#12027) | `fix` | ✅ 已迁移：rate-limit 执行过期与排队等待预算解耦（settings.executionMaxWaitMs + rateLimitManager 解析）；超限 call-log artifact 截断 body 但保留 error（4KB 上限），2 项定向测试通过 | 已迁移并验证（未构建/部署） |
| 328 | `a2c5d8a2f` | feat(quota): use official OpenCode Go usage API (#12124) | `feat` | ✅ 快照已吸收：`opencodeQuotaFetcher` 与三窗口 `usage/opencode` 已使用官方 usage API | 保留当前分包实现 |
| 340 | `82f09f4c8` | fix(api): align combo body and legacy key access (#12070) | `fix` | ✅ 已迁移：apiKeys rowParsers.parseAllowedCombos 对齐 legacy key access 语义，row-parsers 定向测试通过 | 已迁移并验证（未构建/部署） |
| 342 | `6a41a7813` | fix(catalog): derive vision/modalities for built-in auto combos from effective target pool (#12046) | `fix` | ✅ 已迁移：built-in auto combo 按 effective target pool 派生 input/output modalities，auto-combo-catalog-modalities 3/3 通过 | 已迁移并验证（未构建/部署） |
| 349 | `1f4dc830f` | chore(quality): velocity phase — loosen every numeric baseline by 20% until v4.0, monitor headroom nightly (#12125) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 354 | `52521984d` | fix(lease): remove global static reservation and gate routing on live active lease occupancy (#11775) | `fix` | ✅ 已迁移：exclusive lease 移除全局静态预留，路由按 live active lease occupancy 门控；validation schemas 增加 connectionAccessMode/allowedCombos，exclusive-lease-live-occupancy 6/6 通过 | 已迁移并验证（未构建/部署） |
| 358 | `9903a6d2e` | refactor(auto-combo): fix divergent scoring in combo health reporting (#11854) | `refactor` | ✅ 已同步：抽取并复用 `evaluateAutoCandidates`，运行时评分返回完整 factors；健康评分检查器使用真实候选构建、额度过滤、缓存亲和度及同一评分结果，同时保留 Orbit 的熔断状态解释 | 已吸收 |
| 389 | `2e3cd599b` | feat(routing): add LiquidAI LFM2.5-2.6B free tier via OpenRouter (#11752) | `feat` | ✅ 已同步 | 已移植特性 |
| 395 | `55691e041` | fix(usage): allow quota refresh for FREE lease-reserved connections (#11758) | `fix` | ✅ 已迁移：providerLimits 增加 isConnectionUnavailableToAuxiliaryActivity 守卫，FREE lease-reserved 连接允许配额刷新，provider-limits-lease-refresh 测试通过 | 已迁移并验证（未构建/部署） |
| 399 | `d26fe0380` | feat(routing): add relayMode for schema-locked context handoffs (#11839) | `feat` | ✅ 已吸收：schema、配置解析、摘要消息选择和 universal handoff 注入均支持 `schema-locked` | 已迁移并通过 inference 类型检查 |


### 2.4 Provider 与模型生态 (Providers & Models)（共 81 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | `ba597b631` | fix(db): call_logs provider stats read true on empty and legacy data (#12832) | `fix` | ✅ 已迁移：call_logs provider stats 对空/legacy 数据读 true（toNumber 兜底）+ 176 迁移补 provider stats 索引；call-logs-provider-stats 4/4 通过 | 已迁移并验证（未构建/部署） |
| 17 | `ebdbd2c67` | feat(models): live account catalog for Claude, Codex, Copilot, AGY (#12866) | `feat` | ✅ 已随 TASK-P1-06 吸收：Claude/Codex/Copilot/AGY 账号实时目录接入权威发现与调度目录合并 | 已迁移并验证（未构建/部署） |
| 18 | `aa35d460d` | fix(catalog): union picker customModels into the dispatch-time live catalog (#12597) (#12934) | `fix` | ✅ 已迁移：getActiveProvidersWithSyncedModel UNION picker customModels 进 dispatch-time live catalog，custom-models-live-catalog 测试通过 | 已迁移并验证（未构建/部署） |
| 20 | `f12b87c80` | fix(claude): extra-usage switch does not skip 5h preflight (#12803) | `fix` | ✅ 已迁移：claude extra-usage 开关在 quotaPreflight/combo/quotaExhaustionCutoff/quotaCache 全链路跳过 5h preflight，claude-extra-usage-preflight 测试通过 | 已迁移并验证（未构建/部署） |
| 21 | `c042a5188` | feat(grok-cli): show and redeem banked reset credits on Provider Limits (#12805) | `feat` | ✅ 已吸收：实现 Grok gRPC-web reset inventory/redeem 编解码、用量抓取回填、Edge runtime 分派，并在配额卡显示与使用 reset credit | 已迁移 |
| 25 | `600abe68d` | fix(dashboard): moonshot voucher/cash leftover follows bucket balance (#12733) | `fix` | ✅ 已迁移：moonshot 余额解析 unlimited:false，voucher/cash 剩余按 bucket balance 计算，moonshot-balance-pct 3/3 通过 | 已迁移并验证（未构建/部署） |
| 27 | `25bc16d87` | fix(dashboard): batch delete no longer toasts failure after success (#12711) | `fix` | ✅ 结构不适用：Orbit dashboard 批量删除走 AntD Popconfirm + react-query 失效刷新，无 ConfirmModal/onAfter 结构，不存在成功后误报失败 toast 的缺陷 | 不适用（已对照 Orbit 现状验证） |
| 30 | `b345c7f6c` | feat(opencode): opencode v2 plugin publishing the OmniRoute catalog (#12870) | `feat` | ✅ 已吸收：新增 `@orbit/opencode-plugin-v2`，按 Orbit 品牌/环境变量适配动态 catalog、combo、缓存和鉴权 | 218/218 测试通过，类型检查通过 |
| 31 | `f9a1cc8a9` | fix: resolve SqliteError no such table compression_run_telemetry during cleanup (#12682) | `fix` | ✅ 已等效：Orbit cleanup 已用 tableExists 保护压缩遥测表，不会触发 SqliteError no such table | 等效保留（已对照 Orbit 现状验证） |
| 45 | `366099a08` | fix(i18n): quote <name> placeholder in OMNIROUTE_AUTO_SYNC_CLAUDE_PROFILES description (#12505) (#12769) | `fix` | ✅ 已迁移：featureFlagDefinitions 中 OMNIROUTE_AUTO_SYNC_CLAUDE_PROFILES 描述引用 profiles/<name> | 已迁移并验证（未构建/部署） |
| 46 | `82f78b3b3` | fix(api/pricing): surface validation error message as string, not raw object (#12494) (#12771) | `fix` | ✅ 已迁移：pricing 验证错误以字符串透传（validateBody/isValidationFailure），public/pricingValidation.d.ts 同步 | 已迁移并验证（未构建/部署） |
| 47 | `891cb26b2` | fix(db): back-fill last_ping_at + last_pinged_reset_key on provider_connections (#12470) | `fix` | ✅ 已迁移：ensureProviderConnectionsColumns 补 last_ping_at/last_used_at 列回填，db-schema-columns-last-ping 测试通过 | 已迁移并验证（未构建/部署） |
| 50 | `488f57e9d` | feat(catalog): eligibility-gated free-tier bucket (#12669) | `feat` | ✅ 已随 `a65e90d177` workspace 重构吸收：代码迁至 `@orbit/providers`；`FREE_REGIME_TRAITS` 已包含资格门控与预算桶。不是本地独立优化，原上游 hash 因快照式迁移未保留 | 无需重复移植 |
| 57 | `36be267a1` | fix(providers): add CLAUDE_CODE_CLIENT_VERSION and GITHUB_COPILOT_CLI_VERSION env overrides (#12632) | `fix` | ✅ 已迁移：contracts 新增 CLAUDE_CODE_CLIENT_VERSION pin + getClaudeCodeClientVersion/getClaudeCodeClientBillingVersion/getClaudeCodeUserAgent（env 安全覆盖）；providers providerHeaderProfiles 增加 getGitHubCopilotCliVersion/getGitHubCopilotChatUserAgent 并让全部 header builder 请求时取版本；anthropicHeaders/claudeCodeCompatibleIdentity/claudeIdentity/ccBridgeTransforms/glmProvider/shared/usage 全链路改 getter；新增 providers 10 项 + inference 1 项回归测试全部通过，providers/inference/contracts typecheck 归零 | 已迁移并验证（未构建/部署） |
| 66 | `8c8d23a98` | fix(api): bound hung GET /v1/models catalog rebuilds (#12628) | `fix` | ✅ 已迁移：catalogCache 冷路径合并重建加 CATALOG_BUILD_TIMEOUT_MS 上限（默认 8s），超时回发 last-good 200（X-Model-Catalog-Source: last-good）；新增 2 项回归测试通过，inference typecheck 归零 | 已迁移并验证（未构建/部署） |
| 67 | `b0557543b` | fix(opencode-plugin): lengthen /v1/models timeout and attach HTTP status (#12607) | `fix` | ✅ 已迁移（v2 插件等效移植）：opencode-plugin-v2 的 defaultOrbitModelsFetcher 默认超时 10s→30s（DEFAULT_MODELS_TIMEOUT_MS，显式 timeoutMs 仍优先），HTTP 非 2xx 错误附加 statusCode/status 字段；新增 2 项测试 + 既有 options/fetch-timeout 回归 18/18 通过 | 已迁移并验证（未构建/部署） |
| 72 | `9cbc4f118` | fix(models): publish effort_tiers on Kimi K3 base models only (#12299) (#12371) | `fix` | ✅ 已迁移：syncedCapabilities 增加 #12299 carve-out —— kimi-owned + K3 模型 id（k3/k3-256k/kmca 前缀）的同步 base 条目豁免 isSkippedEffortProvider 排除，发布 effort_tiers；非 K3 kimi、codex、glm 维持排除；新增 6 项测试通过，inference typecheck 归零 | 已迁移并验证（未构建/部署） |
| 75 | `d6771779f` | fix(cli): preserve Claude settings on config set (#12432) | `fix` | ✅ 已迁移：generateClaudeConfig 改写 Claude Code env 式配置（ANTHROPIC_BASE_URL/AUTH_TOKEN/MODEL + GATEWAY_MODEL_DISCOVERY）；CLI config set claude 通过 mergeClaudeSettings 合并既有 settings（hooks/statusLine/env 保留）；新增 CLI 端到端测试 1/1 通过（dev 模式冷启动 ~80s，测试超时上调至 300s） | 已迁移并验证（未构建/部署） |
| 78 | `109cf0f26` | fix(providers): reclassify Cerebras as a one-time $5 signup credit (#12591) | `fix` | ✅ 已迁移：Cerebras 重分类为一次性 $5 注册 credit —— 定价表改 paid rates（防 classifyTier cost-based 判 free）、LEGACY_FREE_PROVIDERS/FREE_TIER_BUDGETS 移除、freeModelCatalog 行改 one-time-initial（去 hardStopGuaranteed）、freeNote 更新；4/4 测试通过 | 已迁移并验证（未构建/部署） |
| 93 | `239d8fc67` | fix(providers): separate MaxAI and UC credential contracts (#12431) | `fix` | ✅ 已随官方当前执行器同步 | 已移植修复 |
| 107 | `c091534ff` | fix(providers): stop an unrelated-provider tiktoken bundling failure from crashing /api/providers (#12355) | `fix` | ✅ 已迁移：chatgptWebCodexAdmin 将 getChatGptWebCodexDoctorStatus 改为 lazy wrapper（切断 doctor.ts → codex 执行器 → token-estimate → tiktoken WASM 静态链）；provider-management/provider-detail 的 finalizeValidatedChatGptWebCodexSecrets 改为 chatgpt-web-codex 分支内动态 import；inference/control typecheck 归零 | 已迁移并验证（未构建/部署） |
| 111 | `a47d2e521` | feat(providers): add SeekAi OpenAI-compatible New-API gateway (#12557) | `feat` | ✅ 已同步 | 已移植特性 |
| 115 | `c2d2b0ac1` | feat(providers): surface CSV import row errors and ship a template (#12504) | `feat` | ✅ 已吸收：Provider 导入支持 JSON/CSV、CSV 模板下载，并展示最多 10 条带行号/名称/Provider 的服务端逐行错误 | 已迁移 |
| 117 | `0f5fc78d8` | feat(providers): search connections by name and baseUrl (#12495) | `feat` | ✅ 已吸收：连接筛选保留名称/邮箱/ID/认证类型，并补充 `baseUrl` 匹配 | 已迁移 |
| 118 | `c9fb06e26` | fix(grok-cli): treat omitted SuperGrokPro creditUsagePercent as 0% (#12312) | `fix` | ✅ 已等效：grokQuotaFetcher 已用 creditUsagePercent ?? 0 兜底，缺失 percent 按 0% 渲染 weekly bar，与上游 #12312 行为一致 | 等效保留（已对照 Orbit 现状验证） |
| 119 | `9ddb8e0a9` | fix(docs): restore the Next build — REMOVED_PROVIDERS.md had no frontmatter (base-red #12581) (#12610) | `fix` | ✅ 不适用：修复对象是上游 docs/reference/REMOVED_PROVIDERS.md 的 frontmatter 缺失导致 Next build 失败；orbiot 无该文档与 check-docs-frontmatter 门禁 | 不适用（已对照 Orbit 现状验证） |
| 121 | `2c4ad3e55` | docs(readme): introduce OmniRouteTray — the macOS menu-bar companion (#12276) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 131 | `679578322` | feat(providers): refresh Fable, Cursor, and Devin catalogs (#12367) | `feat` | ✅ 已随 `a65e90d177` workspace 重构吸收：Provider 所有权迁至 `@orbit/providers`；Devin catalog 与上游 release blob SHA-256 完全一致，Cursor/Fable 行为已迁入对应新模块 | 无需重复移植 |
| 133 | `cdd07df70` | feat(providers): refresh NVIDIA hosted models (#12538) | `feat` | ✅ 已随 `a65e90d177` workspace 重构吸收：NVIDIA snapshot 与上游 release blob SHA-256 完全一致 | 无需重复移植 |
| 134 | `032adb080` | feat(providers): refresh Z.ai Web models and browser transport (#12524) | `feat` | ✅ 已随 `a65e90d177` workspace 重构吸收：Z.ai Web registry blob SHA-256 与上游 release 完全一致，browser transport 位于拆包后的 inference 模块 | 无需重复移植 |
| 136 | `fdee0ec20` | deps: bump the production group across 1 directory with 4 updates (#12399) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 152 | `bf0d902df` | docs(providers): register providers removed at their operator's request and guard against reintroduction (#12478) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 159 | `53b037051` | test(grok): format web executor suite (#12412) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 164 | `7c119dd7e` | fix(memory): resolve rerank provider node cache import (#12421) | `fix` | ✅ 结构不适用：修复对象是上游 Next app 的 @/lib/localDb barrel 陈旧路径；orbiot 无 rerank-providers 路由与 localDb barrel，control 直接走 @orbit/core db 模块 | 不适用（已对照 Orbit 现状验证） |
| 165 | `6da241824` | chore(providers): remove a keyless provider integration at its operator's request (#12440) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 169 | `970419541` | fix(providers): repair the maxai credential block truncated by merge auto-resolve (#12433) | `fix` | ✅ 不适用：上游 merge 事故（webSessionCredentials.ts 语法损坏 + models route TS2322）的善后提交；orbiot 无该损坏，无需移植 | 不适用（上游事故善后） |
| 170 | `752aac65d` | fix(ci): repair release-root regressions — pack dedup, web-session syntax, uc-image ids (#12423) | `fix` | ✅ 部分移植：probeUtils.isTransientProbeError 消息 regex 加宽（table/schema is locked、database is busy）；webSession 语法修复与 pack dedup 为上游事故善后（不适用）；UC image bare-id 顺序不适用（orbiot 为 per-provider registry 结构，cheaperinference 已有显式 COLLISION NOTE 规避） | 已迁移可适用部分（未构建/部署） |
| 171 | `2c6e6cd13` | fix(providers): list gemini-business models in the registry (#12389) | `fix` | ✅ 已迁移：新增 registry/gemini/business entry（12 个 executor MODEL_CATEGORY_MAP 模型，toolCalling/supportsReasoning:false，alias gembiz），注册进 providers/index.ts；catalog 回归 4/4 通过 | 已迁移并验证（未构建/部署） |
| 174 | `990aeca1d` | fix(api): list self-aliased providers in canonical models catalog mode (#12381) | `fix` | ✅ 已迁移：catalog.ts 四个发射循环（static/synced/custom/alias-backed）加 self-aliased 判定（canonicalProviderId === alias 时 alias 行即 canonical 行，canonical mode 不再漏发）；canonical 分支 !== alias 守卫保留防 double-up；catalog 回归 11/11 通过 | 已迁移并验证（未构建/部署） |
| 180 | `01d97beb8` | fix(translator): drop unsigned thinking blocks instead of fabricating a Claude signature (#12386) | `fix` | ✅ 已迁移：openai-to-claude.ts 对无 signature 的 thinking 块改为丢弃（!part.signature 覆盖空串与缺失两种形态），不再伪造 DEFAULT_THINKING_CLAUDE_SIGNATURE；新增 3 项测试通过 | 已迁移并验证（未构建/部署） |
| 187 | `1146c9b5b` | fix(catalog): write NUL key separators as escape sequences instead of raw bytes (#12403) | `fix` | ✅ 已迁移：catalog.ts 已是 \0 escape 形式（orbiot 原生正确）；清理 videoBridgePromotionAggregator.ts 中的 raw NUL byte → \u0000 escape（上游同文件同位置），全仓 Python 扫描确认无 raw NUL 残留 | 已迁移并验证（未构建/部署） |
| 190 | `393c305a7` | fix(providers): resolve the Codex auto-ping model from the live catalog instead of a retired id (#12361) | `fix` | ✅ 已迁移：quota-auto-ping 的 ping model 不再 pin gpt-5.1-codex-mini，每 tick 经 resolveQuotaAutoPingModel 从 live catalog 解析（registry 顺序 + 排除 effort 变体 + isModelSelectable 生命周期门控）；无可选模型时暂停并以状态变更去重告警；inference 包新增 reasoningSuffix 导出；worker typecheck + 3/3 测试通过 | 已迁移并验证（未构建/部署） |
| 194 | `8e474914e` | fix(providers): mark groq compound and allam-2-7b as non-reasoning models (#12379) | `fix` | ✅ 已迁移：groq registry 声明 groq/compound 与 allam-2-7b 为 supportsReasoning:false（未声明模型经启发式默认 reasoning-capable，Groq 对 reasoning_effort 回 HTTP 400） | 已迁移并验证（未构建/部署） |
| 195 | `090ae83e1` | fix(docker): find the Chrome binary in chrome-linux64 for the codex browser image (#12376) | `fix` | ✅ 不适用：修复对象是上游 docker/chatgpt-web-codex-browser/Dockerfile 的 Chrome 二进制路径（chrome-linux64）；orbiot 无该 Docker 镜像 | 不适用（orbiot 无 codex browser 镜像） |
| 196 | `6a91002b3` | fix(release): drain the 2026-09-02 base-red — rerank-providers import + api-typecheck baseline ratchet (#12414) | `fix` | ✅ 不适用：上游 release CI 善后（rerank-providers 路由动态 import 指向 + api-typecheck baseline 重生成）；orbiot 无该路由与 baseline 门禁 | 不适用（上游事故善后） |
| 197 | `530096a3b` | feat(providers): add UC (uncensored.com) — persona (un-metered) + direct (metered) (#11513) | `feat` | ✅ 已同步核心 Provider 与聊天执行链 | 已移植适用特性 |
| 205 | `a298dc6b7` | feat(check): make serviceKinds required and add the reverse-walk provider consistency gate (#11392) | `feat` | ✅ 已等效：orbiot scripts/check-provider-consistency.ts 已强制 serviceKinds 字段并做双向一致性走查（registry vs catalog allowlist），与上游 #11392 gate 等效 | 等效保留（已对照 Orbit 现状验证） |
| 206 | `451dd7387` | fix(memory): list and serve embedding/rerank models from every configured provider (#11390) | `fix` | ✅ 已迁移（等效机制）：embeddingRegistry 新增 deriveEmbeddingProviderForChatProvider（chat/completions base → /embeddings 派生，curated 优先）；qdrant 快速选择为已配置但无 curated 条目的 provider 追加派生选项（<provider>/embed 自由文本），parseEmbeddingModel Phase 3 已支持自由派生；control typecheck 归零 | 已迁移并验证（未构建/部署） |
| 219 | `c9f9b6274` | feat(providers): expose usage-supported in provider plugin manifest (#12214) | `feat` | ✅ 已吸收：Provider 插件清单按当前 `USAGE_SUPPORTED_PROVIDERS` 注册表输出 `usage-supported` | 已迁移 |
| 229 | `5253b93b8` | feat(rankings): order free providers by measured reliability (#12218) | `feat` | ✅ 已等效：free-tier service 的 sortBy 已支持 reliability（z.enum(["elo","reliability"])）并接入 usage 过滤，与上游 #12218 可靠性排序等效 | 等效保留（已对照 Orbit 现状验证） |
| 230 | `51587084c` | fix(docs): the free-tier catalog ships no per-row confidence tag (#12318) | `fix` | ✅ 不适用：修复对象是上游 check-docs-counts-sync 文档计数门禁与 free catalog confidence 字段说明；orbiot 无该文档与脚本 | 不适用（orbiot 无该门禁） |
| 231 | `bdf218387` | fix(resilience): per-model 402 on a passthrough gateway no longer terminalizes the whole connection (#12266) | `fix` | ✅ 已迁移：resolveTerminalConnectionStatus 增加 isPerModelQuotaProvider 参数（bare 402 对 passthrough/gateway 不再判 credits_exhausted）；#3027 per-model lockout 分支扩展至 402（reason credits）；单凭证 provider 的 402 仍整连接 terminal；inference typecheck 归零 + auth 回归 3/3 | 已迁移并验证（未构建/部署） |
| 236 | `33bdc386b` | fix(free-tier): never serve a Radar overlay older than the shipped catalog (#12215) | `fix` | ✅ 已迁移：free-tier summary 增加 overlayIsFresh 闸门（generatedAt < FREE_CATALOG_CURATED_AT 或未知的 overlay 拒绝服务），陈旧时经 getCatalogWithoutOverlay 回退（保留 operator 本地覆盖/墓碑）；applyFeed 对无 feed 条目的 baseline 应用本地覆盖；radar 契约测试同步 4/4 通过 | 已迁移并验证（未构建/部署） |
| 255 | `30a26d9dc` | docs(agents): protected-surface merge rule — operator approval for agent-instruction files (#12253) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 257 | `3c8b55381` | chore(quality): register native-codex turn-pin tests in stryker tap.testFiles (#12263) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 273 | `c49ee53bc` | feat(providers): add RPD to rate limit overrides (#12147) | `feat` | ✅ 已吸收：连接更新校验、数据库写入清洗与领域类型均接受 `rateLimitOverrides.rpd` | 已迁移 |
| 282 | `1b6437231` | test(free-tier): counting vs deciding regimes (#12226) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 290 | `ede327a61` | docs(dashboard): redraw onboarding tier-flow SVGs for the real 4-tier model (#12211) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 292 | `63e4afa32` | feat(dashboard): orchestration canvas — unified model + snapshot hook (part 1/2) (#12156) | `feat` | ✅ 已随 TASK-P2-04 吸收：统一模型及多源容错快照已接入 Orbit 拆分架构 | 已迁移并验证（未构建/部署） |
| 294 | `73db936f9` | fix(api): keep registry width and type on embedding models (#11761) | `fix` | ✅ 已迁移：catalog.ts hasEquivalentSpecialtyModel 改 findEquivalentSpecialtyModel，embedding 命中时回填 registry 维度与 type:"embedding"；gemini-embedding-001 维度 768→3072；catalog 回归 12/12 通过 | 已迁移并验证（未构建/部署） |
| 297 | `e12fb110f` | [URGENT] fix(dev): reduce instrumentation executor fan-out (phase 3) (#12078) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 300 | `9392bd55c` | fix(translator): preserve falsy primitive values in Gemini and Antigravity function response results (#12191) | `fix` | ✅ 已迁移：gemini-to-openai/antigravity-to-openai 的 functionResponse.result 改显式键提取（"result" in resp），falsy 原值（false/0/""/null）不再塌缩为整个 response 或 {} | 已迁移并验证（未构建/部署） |
| 301 | `90366903c` | fix: prevent Claude Code session kills via liveness-aware readiness + auto model echo (#12189) | `fix` | ✅ 已迁移：streamReadiness 支持 liveness-aware deadline（每收到 chunk 重置截止时间，maxTimeoutMs 硬顶）；policy 结果暴露 maxTimeoutMs；chatCore 检测 Claude Code CLI（user-agent/originator）自动启用 model echo 防 --resume 恢复失败；inference typecheck 归零 + readiness 回归 3/3 | 已迁移并验证（未构建/部署） |
| 306 | `78fd3504d` | chore(lint): batch 2 of #12146 — resolve the react-hooks compiler violations in dashboard/providers (#12163) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 319 | `af65171e3` | fix(ci): clear the base-reds the afternoon merge batch left on release/v3.8.51 (round 5: provider count 352, TS2554/TS2677) (#12144) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：纯测试/CI base-red 修复（round 5），无运行行为变更。 |
| 323 | `6f914b7a3` | feat(zai): add GLM-5.3-Flash Coding Plan support (#11801) | `feat` | ✅ 已同步 | 已移植特性 |
| 329 | `908c1b823` | fix(codex): preserve existing provider state when bulk-import upserts a matching connection (#12122) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：codexImport.ts 新增 preserveExistingCodexConnectionState（按 email+workspaceId 匹配已有连接，PSD 以导入覆盖存量合并、删除转发 priority）；normalizeCodexImportRecord 补 tokenExpiresAt；bulk import handler 每条记录先取 getProviderConnections 再合并后 upsert。同步 oauthRuntime.d.ts。tsc core/control=0 |
| 334 | `55f6b9808` | fix(executors): DuckDuckGo ERR_BN_LIMIT without blind retry + proxy pool support (#12110) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：duckduckgo-web.ts 418 分支先 parseDuckDuckGoError 解析，ERR_BN_LIMIT 直接 processResponse 返回（不再烧一次 VQD）；ERR_CHALLENGE 保留原重试。registry/duckduckgo-web 增加 poolConfig（min2/max5/cooldown1-10s），orbiot executor 已支持 session pool。tsc=0 |
| 336 | `14dc6e851` | feat(providers): add Perplexity Agent API provider (#12103) | `feat` | ✅ 已同步 | 已移植特性 |
| 341 | `09428da3d` | fix(dashboard): prevent provider icons collapsing to zero size (#12054) | `fix` | ✅ 不适用：修复对象是上游 Next 专属 ProviderIcon 组件（objectFit+auto 宽高在 Chromium 下塌缩 0×0）；orbiot console 用 TOPOLOGY_PROVIDER_ICONS 组件映射按 size 渲染，无该回归路径 | 不适用（UI 机制不同） |
| 343 | `ff4ac6c4d` | fix(provider/nous): inject required user tag into inference requests (#11861) (#12044) | `fix` | ✅ 已迁移：default 执行器对 nous-research 注入必需 tags（无 user= 时补 user=<user|omniroute>，保留已有 string tags）；上游 400 missing tags/missing user tag 均消除；inference typecheck 归零 + 回归 2/2 | 已迁移并验证（未构建/部署） |
| 344 | `51e4930d0` | fix(build): prune non-production trees in NFT trace excludes and tsconfig (#12028) | `fix` | ✅ 不适用：修复对象是上游 Next outputFileTracingExcludes 与 tsconfig 排除项；orbiot 为 Docker 单体仓库，无 NFT 追踪 | 不适用（构建管线不同） |
| 345 | `476b20bd6` | fix(providers): cloudflare-ai flattens message content unconditionally, but the #2539 constraint is model-scoped — this blocks image input to Cloudflare vision models (#12002) | `fix` | ✅ 已迁移：cloudflare-ai 内容扁平化改 model-scoped —— 全文本数组仍扁平化为字符串，含非文本 part 的数组原样透传（多模态模型可接收图片），不再无条件抛错 | 已迁移并验证（未构建/部署） |
| 346 | `fe8ef4fa9` | fix(providers): use v1beta1 Model Garden publisher list for Vertex Anthropic discovery (#11998) | `fix` | ✅ 已等效：orbiot Vertex Anthropic 发现已直调 v1beta1 publishers/anthropic/models 且 parser 同时解析 publisherModels/models 信封（测试已覆盖） | 等效保留（已对照 Orbit 现状验证） |
| 347 | `5d07bf32f` | feat(catalog): add feature flag to disable thinking level variants in catalog (#11971) | `feat` | ✅ 已吸收并保留现有增强：新增 `ORBIT_DISABLE_THINKING_LEVEL_VARIANTS` 在生成阶段禁止 synced thinking variants；`HIDE_EFFORT_VARIANTS` 继续独立负责公共响应聚合 | 已迁移 |
| 351 | `32702d313` | test(providers): regenerate the translate-path golden for OrcaRouter (#11923) (#12118) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 363 | `e0029eb5a` | feat(pricing): add GLM-5.3-Flash pricing, model specs, and catalog registration (#11830) | `feat` | ✅ 已同步 | 已移植特性 |
| 366 | `131e413cb` | fix: mark Vercel AI Gateway as passthroughModels (#11771) | `fix` | ✅ 已迁移：vercel-ai-gateway catalog 条目补 passthroughModels: true | 已迁移并验证（未构建/部署） |
| 374 | `15b164866` | feat(providers): expose a usage-fetch capability in the provider plugin manifest (#11903) | `feat` | ✅ 已吸收：Provider 插件清单依据当前 usage dispatcher 注册表输出 `usage-fetch`，同时处理 canonical id 与 alias | 已迁移 |
| 382 | `79b2e92c4` | fix(codex): fail over image generation for imported free plans (#11948) | `fix` | ✅ 已迁移 (isCodexFreePlan 增加 chatgptPlanType 回退；handleCodexImageGeneration 增加 403 retryable 守卫；新增 codex-free-plan-image-generation.test.ts 3/3 通过) | 建议移植修复 |
| 386 | `8180b3213` | fix(codex): restore imported account state (#11954) | `fix` | ✅ 已迁移 (codexImport.ts 镜像 chatgptAccountId→workspaceId 以命中 workspace upsert；payload 重置 isActive/errorCode/lastError*/backoffLevel/rateLimitedUntil 并透传 priority；新增 codex-import-state-restore.test.ts 4/4 通过) | 建议移植修复 |


### 2.5 数据库与存储缓存 (DB & Storage)（共 23 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 4 | `29593377c` | fix(db): extract WAL maintenance, surface TRUNCATE no-op (#12853) | `fix` | ✅ 已按 Orbit 架构同步：`checkpointDb` 抽离后经新增 `parseWalCheckpointResult`（`core.ts:551`）解析 `PRAGMA wal_checkpoint(...)` 返回行；`busy = 1` 表示另一连接仍持有 WAL、TRUNCATE 实为静默 no-op，现以 `console.warn` 显式暴露 pending 帧数，行形状异常时 fail-open 不伪造告警 | 已完成；core/inference typecheck 通过；未构建/部署 |
| 6 | `678af2ea3` | fix(db): ignore non-finite rate_limited_until writes, preserve null clear (#12788) | `fix` | ✅ 已按 Orbit 架构同步：`setConnectionRateLimitUntil` 头部新增守卫，`until !== null && (!Number.isFinite(until) || until <= Date.now())` 直接 return，避免把 `NaN`/`Infinity` 写入 TEXT 列污染后续读取，也避免已过期时间戳覆盖活跃冷却；`null` 仍是唯一清除路径（`clearConnectionRateLimit`） | 已完成；新增 2 项真实 SQLite 回归用例通过，core typecheck 通过；未构建/部署 |
| 8 | `10fef01d2` | docs: sync migration and strategy counts with the code (#12970) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 42 | `0df5be5b0` | docs(gamification): align XP Rewards table with code (#12501) (#12667) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 60 | `5f9c358e9` | fix(monitoring): serve cached credentialHealth off the request path (#12533) | `fix` | ✅ 已迁移 (cache.ts 新增 getCachedCredentialHealthSummary 快照且 summary 委托之；monitoring-health.service 改 stale-while-revalidate 后台刷新；worker sweep 每 batch 让出事件循环；契约测试与新增单测通过) | 建议移植修复 |
| 81 | `7ae8bf4e0` | fix(db): harden migration recovery snapshots (#12435) | `fix` | ✅ 已迁移 (新增 migrationRunner/preMigrationBackup.ts 内容寻址快照：同状态复用、原子 hard-link 发布、失败 fail-closed；runMigrations 接收 databaseExistedBeforeInitialization 并对 skeleton DB 强制快照；backup.ts shrink 基线仅限时间戳备份 + ENOENT 容错 + newest-first 列表；dataPaths eval-probe 守卫 + 退出清理；constants 074→081 兼容条目。未移植 schemaState/logger 结构性拆分。测试 2/2+14/14 通过) | 建议移植修复 |
| 95 | `8a95a2bce` | fix(settings): cache-config alwaysPreserveClientCache was a runtime no-op (#12304) | `fix` | ✅ 已迁移 (cache-settings.service：GET 从扁平 settings 读取 alwaysPreserveClientCache，PUT 经 updatePersistedRuntimeSettings 持久化，不再写 runtime 不消费的 cache 节) | 建议移植修复 |
| 154 | `450e92ecf` | chore(quality): base fixes — stryker tap.testFiles + node_modules cache key (#12482) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 184 | `c8e2cb3ff` | fix(db): install busy_timeout before the connection's first statement (#12394) | `fix` | ✅ 审计后判定已存在：主连接初始化链已在 `journal_mode = WAL` 与 `synchronous = NORMAL` 之前执行 `PRAGMA busy_timeout = 2000`（`core.ts:1247-1248`），首个语句即携带 busy handler，不会在另一进程短暂 checkpoint WAL 时因拿不到共享锁而立即失败 | 无需移植；保持现有实现 |
| 203 | `e26a649d2` | perf(ci): cache node_modules in the npm-ci-retry composite (#8084 D3) (#12408) | `perf` | ⏭️ 用户确认排除：纯 CI `node_modules` 缓存优化，属于已明确不需要同步的 CI 范围 | 不同步 |
| 252 | `412298b62` | chore(proxy): purge the legacy 1proxy residue — sync/rotator modules, dead DB exports, dead settings tab and flag, docs (#12091) (#12290) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 270 | `903d1e0c5` | fix(db): use module.require for CommonJS runtime driver loading (#12230) | `fix` | ✅ 审计后判定已等效：Orbit 将运行时驱动加载统一收敛到 `adapters/runtimeRequire.ts`，优先使用可用作用域内的 `require`，否则回退 `createRequire(import.meta.url)`；`better-sqlite3`/`node:sqlite` 均走该入口（`driverFactory.ts`、`omp.ts`），不存在上游需要修复的裸 `require` 在 ESM 下失效问题 | 无需移植；保持现有实现 |
| 291 | `ce1b14297` | docs(diagrams): rename number-carrying diagram files to stable names (#12210) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 293 | `7ca5e1c67` | chore(lint): batch 6 of #12146 — memory, radar, audit, analytics, cache, usage, activity, home and RequestLoggerV2 react-hooks violations resolved (#12208) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 311 | `7f49b342b` | chore(lint): batch 0 of #12146 — type the call-log-cap sqlite rows instead of 45 as-any casts (#12157) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 326 | `9b9ea88d4` | fix(migrations): add renamed migration compatibility for 056/073/077/101 (#12036) | `fix` | ✅ 已按 Orbit 架构同步：新增重命名迁移兼容表 `RENAMED_MIGRATION_COMPATIBILITY`（`migrationRunner/constants.ts:11`），迁移判定前经 `migrationRunner.ts:710` 遍历，把历史重命名版本的 `_orbit_migrations` 记录映射回当前版本号，避免升级库因旧名未匹配而重复执行或漏执行 056/073/077/101 | 已完成；core typecheck 通过；未构建/部署 |
| 356 | `d213ef030` | feat(dashboard): show cache percentage in request logs (#11970) | `feat` | ✅ 已吸收：请求日志 CR 指标显示相对输入 token 的缓存百分比并限制在 0–100% | 已迁移并通过 console 类型检查 |
| 385 | `70af41b9f` | fix(db): invalidate connection cache after upsert (#11953) | `fix` | ✅ 审计后判定已存在：`updateProviderConnection` 在 `_updateConnectionRow` 事务提交与 `backupDbFile("pre-write")` 之后立即执行 `invalidateDbCache("connections")`（providers.ts:994-995），与上游补丁插入点、语义一致 | 无需移植；保持现有实现 |
| 391 | `ccee48d34` | fix(db): drop three consumer-less 1proxy exports — dead-code base-red on release/v3.8.51 after the barrel deletion (#12055) (#12087) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 无上游 1proxy provider 死代码导出（grep 命中均为 featureFlag/sidebar 无关字符串），barrel 删除波及面不存在。 |
| 402 | `2ec24e7c0` | fix(core): resolve DB init race condition and reasoning translation (#12003) | `fix` | ✅ 已等效 (responseTranslator.ts：仅 reasoning 内容时回填 message.content，避免空 content；MCP stdio 半部不适用——orbiot 工具处理器惰性取 DB，注册期无 init 副作用) | 建议移植修复 |
| 403 | `50bc8ab8a` | fix(barrel): delete the @/lib/localDb barrel — every consumer migrated (#11795 Phase 5) (#12055) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 无 '@/lib/localDb' barrel（import 结构已直连，重构目标已完成态）。 |
| 406 | `2463781e0` | fix(barrel): migrate src/lib/ off the localDb barrel to direct db imports (#59) (#12052) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：同上，orbiot 无 localDb barrel 迁移诉求。 |
| 407 | `aa861a80d` | fix(barrel): migrate src/app/ off the @/lib/localDb barrel import (#11795 Phase 2) (#12051) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：同上。 |


### 2.6 管理台与 UI 交互 (Console & UI)（共 37 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 49 | `008da6d19` | feat(dashboard): link a log entry's Conversation Context to its owning conversation (#12646) | `feat` | ✅ 已吸收：日志会话标签链接到所属会话并通过 query 参数自动选中 | 已迁移到当前 React Router 控制台 |
| 70 | `57d9357d8` | fix(i18n): wrap ccOnboardingKeyPlaceholder in ICU single quotes across all 43 locales (#12369) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：en.json/zh-CN.json 两处 ccOnboardingKeyPlaceholder 值以 ICU 单引号包裹尖括号（orbiot 仅此 2 个 locale）。 |
| 100 | `ffdc73606` | feat(dashboard): parent-link, genuine-continuation badge, and modal perf fixes (#12448) | `feat` | ✅ 快照已吸收：conversation turn graph 持久化 parentId，tree API 与会话详情基于真实父子链路渲染 | 保留当前独立 conversations 模块实现 |
| 113 | `f81ce2a23` | feat(dashboard): adaptive context-budget dial on compression panel (#12488) | `feat` | ✅ 已吸收：补充 contextBudget 模式与预留输出 Token 调节，沿用现有热重载保存 API | 已迁移到独立压缩设置页 |
| 144 | `a628d2889` | feat(dashboard): orchestration canvas fase 2 — repeat action + A2A memory hits (2.6/2.7) (#12508) | `feat` | ✅ 已随 TASK-P2-04 吸收：已支持 Conductor/A2A Repeat 与可关闭、限长的 memory hits 观测元数据 | 已迁移并验证（未构建/部署） |
| 147 | `51cd154da` | build(deps): bump github/codeql-action from 4.37.8 to 4.37.9 (#12349) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 148 | `b1fd07df2` | build(deps): bump github/codeql-action/analyze from 4.37.8 to 4.37.9 (#12346) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 149 | `a334c9b0c` | build(deps): bump github/codeql-action/init from 4.37.8 to 4.37.9 (#12345) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 150 | `143c087d4` | feat(i18n): locale-expansion tooling — add-locale orchestrator, aliases, translation-ratio gate; retire duplicate 'in' locale (#12496) | `feat` | ✅ 不适用且当前约束更严格：orbiot 明确只维护 en/zh-CN 双语，所有 UI 文案走 `useI18n()/tt()`，不存在重复 `in` locale 或低翻译率 locale | 不引入上游 40+ locale 生成链 |
| 153 | `84b345d9c` | feat(dashboard): orchestration canvas fase 2 — History tab over persisted A2A runs (2.2) (#12479) | `feat` | ✅ 已随 TASK-P2-04 吸收：History 视图读取持久化 A2A 生命周期并应用 30 天保留策略 | 已迁移并验证（未构建/部署） |
| 157 | `451d4cd93` | test(build): guard the artifact path policy arrays against duplicates (#12422) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 172 | `f41a9bd83` | feat(admin): localize the anomalies page and add it to the sidebar (#12401) | `feat` | ✅ 快照已吸收：异常页使用 `tt()` 双语文案，路由与管理侧边栏已注册 | 保留当前 Ant Design 页面实现 |
| 178 | `5a490b19e` | feat(gamification): show API key names on the leaderboard (#12385) | `feat` | ✅ 已吸收：管理端仅查询 id/name 并为榜单附加显示名，控制台保留 ID 作为辅助标识 | 已迁移并避免暴露密钥材料 |
| 179 | `4f4aa7419` | feat(gamification): show the real daily streak on the profile page (#12377) | `feat` | ✅ 已吸收：level API 返回真实单 key/聚合 streak，Profile 移除硬编码 7 天 | 已迁移 |
| 185 | `bb5c6d148` | feat(gamification): enforce the per-key XP rate limit on the award path (#12390) | `feat` | ✅ 已吸收：XP 写入前执行 anti-cheat gate，并修正 SQLite 时间格式导致窗口恒空的问题 | 已迁移 |
| 200 | `6b4519c31` | feat(dashboard): orchestration canvas fase 2 — agents WS channel (2.1) (#12409) | `feat` | ✅ 已随 TASK-P2-04 吸收：已增加 agents WebSocket 通道并保留断线轮询降级 | 已迁移并验证（未构建/部署） |
| 201 | `afb91a83b` | fix(analytics): expose flat-rate estimates on cost dashboards (#11460) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：统一源 SQL 注入 `stored_cost`/`is_aggregated` 归档标记（sources.ts 全部 6 条腿）；7 个成本查询 GROUP BY 按日重排保留逐日成本口径（usageAnalytics.ts，行类型同步加字段）；`rollupUsageHistoryBeforeDate` 改为按 token-shape 逐请求定价（flatRateAsZero=false）×请求数，事务内 REPLACE 语义实现崩溃重试幂等（aggregateHistory.ts）；`usageStats.calculateAggregateCost` 对 flat-rate 提供商屏蔽 storedCost 保持账单口径；analytics handler 增加 opt-in 参数 `includeFlatRateEstimates=true`（8 个调用点贯穿 + standard 对比零化归档字段）并回传 `includesFlatRateEstimates`；console 成本看板 opt-in + 估算口径标注（警示条/CSV 头注/标签切换/预测注记，中文硬编码与该页惯例一致，i18n key 不适用）。新增 `packages/core/test/flat-rate-estimates-regressions.test.ts`（8 用例）+ 修复 db-core 契约预置失败（resetDbInstance）；6 包 + control + console tsc 全绿，未构建/未部署。 |
| 204 | `713440be0` | revert(ui): point CTAs back at their real destinations (#12410) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 215 | `d2a027a15` | feat(dashboard): orchestration canvas fase 2 — quick wins + hardening (2.3/2.4/2.8/2.11/2.12, #12270, #12271) (#12393) | `feat` | ✅ 已随 TASK-P2-04 吸收：已完成来源筛选、镜像去重、终态过滤、节点上限与详情交互加固 | 已迁移并验证（未构建/部署） |
| 216 | `17a53d2eb` | feat(quality): complete test:scoped — --full map rebuild, stdin selection, CI loader parity (#8084 D1) (#12353) | `feat` | ✅ 已吸收并适配 monorepo：impacted-test selector 使用 `apps/packages` 源码与测试路径；`test:scoped` 直接发现受影响 workspace package，支持 staged/full 别名及根配置变更时全包回退 | shell 语法、帮助入口与 selector 4 项断言通过 |
| 218 | `158647618` | fix(release): drain the 2026-09-01 base-red window — passthrough usage regression + radarPage i18n keys (#12327) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 网关为独立重构（无 open-sse 透传用量估算机制，grep 无 injectedUsage/passthroughResponsesId）；radar 页用内联双语字符串，不消费 radarPage.* i18n key。 |
| 238 | `accdfa9f3` | fix(usage): console-aware Token Plan guidance + subscription hint on bailian 401 (#12288) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：qwen-token-plan.ts 无 cookie 指引改经 resolveConsoleSite('', provider) 按控制台分流（ALIYUN: modelstudio…login_aliyunid_ticket / QwenCloud: home.qwencloud.com…login_qwencloud_ticket）+品牌化前缀；audioMiscProviders.ts bailian 401/403 文案补 'Token Plan 订阅过期/失效' 提示。tsc=0 |
| 246 | `d920e6495` | build: omit the standalone output target for contributor builds (#12204) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 247 | `7f008ed09` | build: stub the instrumentation entrypoints in the contributor profile (#12203) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 248 | `e3c440e80` | build: skip standalone packaging in the contributor profile (#12198) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 249 | `d898d1a91` | build: force the webpack bundler in the contributor build profile (#12197) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 258 | `aa2aec5e5` | docs: Chaos Mode setup guide + weighted strategy semantics (#12250) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 259 | `6c93e74f2` | fix(quality): base-red pair — stryker tap registration + turn-pin suites aligned to the window gate (#12255) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：stryker 配置 + 测试套件对齐（quality），无运行行为变更。 |
| 274 | `0e5e19551` | build: add contributor fast profile (#12192) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 307 | `c664505db` | chore(lint): batch 3 of #12146 — dashboard/settings react-hooks violations resolved (#12162) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 308 | `ef2a89bd6` | chore(lint): batch 1 of #12146 — dashboard/cli-code react-hooks violations resolved (#12160) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 338 | `6096ea51f` | test(ui): correct inactive auto-fetch expectation (#12098) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 352 | `485c2dcdb` | fix(dashboard): make RequestLoggerDetail loadable outside Next — CSS via globals.css + CJS/ESM interop (#11703 base-reds) (#12114) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot console 为 Vite（非 Next），无 RequestLoggerDetail/react18-json-view，CJS/ESM interop 问题不复现。 |
| 355 | `385e90f44` | feat(dashboard): continuous call-log export to pluggable destinations (BigQuery first) (#11945) | `feat` | ✅ 已随 TASK-P2-03 吸收：已实现可插拔持续日志导出、BigQuery 目的地、增量游标、调度与管理台 | 已迁移并验证（未构建/部署） |
| 361 | `8f38dcd32` | fix(dashboard): use opaque background and readable text color on cost chart tooltips (#11960) | `fix` | ✅ 已等效 | ✅ 已等效 (2026-09-11)：orbiot analytics.tsx 三处 tooltip 均为不透明 #1E293B + #94A3B8 可读文字，上游修复的透明底/低对比问题在 orbiot 不存在。 |
| 373 | `3852e0534` | fix(build): fail fast when an externalised optional native dep was silently dropped (#11863) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 无 scripts/build/postinstall、check-native-deps 预检工具链（上游属新增能力而非既有 bug 修复）。 |
| 390 | `5684589ce` | feat(dashboard): collapsible JSON tree viewer for request/response payloads (#11703) | `feat` | ✅ 已随 TASK-P2-01 吸收：请求、响应及调用详情已使用可折叠 JSON 树并支持深度控制与复制 | 已迁移并验证（未构建/部署） |


### 2.7 插件/Agent/多模态桥接 (Plugins & Agents)（共 18 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 40 | `8c4fb8faf` | chore(deps): pin browserslist override to ^4.28.8 (#12592) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 59 | `3b7c541f7` | feat(opencode-plugin): map gateway cost/usage/tok/s onto OpenCode payloads (#12636) | `feat` | ✅ 当前实现更直接：v2 Promise 插件 API 无响应拦截钩子；网关现直接在标准 usage payload 输出 cost/token usage 与排除 TTFT 的 `tokens_per_second`，OpenCode 原生消费，无需 v1 响应重写 | 已以网关侧等效方案吸收 |
| 125 | `c41d8755d` | fix(ci): document eloqnt MIT exceptions and isolate A2A vitest (#12595) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：license allowlist 文档 + A2A 测试隔离（CI/test）。 |
| 128 | `8df944cd4` | feat(browser): adopt Obscura as primary headless browser engine with Chromium fallback (#12286) | `feat` | ✅ 已吸收：浏览器池按 Obscura → cloakbrowser → Chromium 顺序降级，支持外部 CDP/自定义 binary/port | 已迁移并品牌适配 |
| 140 | `a986ef2e2` | deps: bump browserslist from 4.28.2 to 4.28.8 (#12396) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 166 | `93fdc16e7` | chore(lint): adopt eslint-plugin-react-hooks 7.1.1 (#12428) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 181 | `70f33e323` | fix(executors): let the ambient proxy stand when an OpenCode account has none (#12380) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：proxyFetch.ts 新增 hasAmbientProxyContext()；opencode.ts 单账户快速路径仅在无 ambient 代理时 runWithDirectFetchContext，避免 direct 哨兵覆盖外层代理上下文（地理封锁 403）。tsc=0 |
| 202 | `c1ac943c7` | refactor(video): unify the JPEG frame data-URI contract (#12322) | `refactor` | ✅ 已同步：统一 JPEG 帧 data URI 前缀、校验、解码和字节估算契约；contact sheet 在解码前执行 4 MiB 大小保护，drilldown/helpers 复用同一契约 | 已吸收 |
| 207 | `9327990be` | fix(memory): measure the embedding width instead of waiting for a probe (#12180) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：embeddingPort.ts 新增 withMeasuredDimensions（以实测向量长度回填 dimensions 并按约定重建 signature）；store.ts scheduleVectorUpsert ensureReady 使用测量后 resolution 且尊重 ready:false；reindex.ts 重构为 measureUnknownWidth（先 probe 一条测宽并复用向量）+ ensureReindexStoreReady + reindexOneItem。tsc=0 |
| 220 | `8ef344795` | chore(deps): freeze onnxruntime-node and eslint-plugin-react-hooks out of dependabot groups (#12329) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 265 | `9058e39b6` | docs(cli): document CLI_PRIME_AGENT_BIN and correct the CLI Agents count | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 281 | `26eeead26` | fix(memory): honest probe-driven FTS5 keyword status + memory_id rowid sync (#12231) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：migrationRunner.supportsFts5 导出；scoring.ts 新增 sanitizeFts5Query 并应用于 buildFtsRows/retrievePreview/vectorStore 混合检索 MATCH（空查询退化 0=1）；retrieval.ts 新增 keywordEngineStatus（探测式，替代硬编码 available:true），schema keyword 改 boolean/enum(FTS5,none)+reason，同步 memoryRuntime.d.ts；store.ts createMemory 插入/更新后 UPDATE memory_id=rowid 自愈。tsc=0 |
| 330 | `d812585b5` | fix(plugins): refresh stored manifest from disk on activate so new hook fields reach existing installs (#12120) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：db/plugins.ts 新增 updatePluginManifest（重写 manifest+hooks+updated_at）；manager.ts 新增 refreshManifestFromDisk（activate 时重读 plugin.json：safeValidateManifest+名称一致+入口包含门禁，fail-safe 回退 DB 快照），activate 改用它。tsc=0 |
| 332 | `00bc397cd` | fix(plugins): do not kill the plugin process when a fire-and-forget hook times out (#12116) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：loader.ts 新增 NOTIFICATION_HOOKS（onStreamComplete），超时仅丢弃该次投递并 resolve(undefined)，不再 SIGTERM/SIGKILL 子进程；新增 LoadPluginOptions.hookTimeoutMs 可注入。tsc=0 |
| 360 | `56dddfce3` | fix(antigravity): send complete loadCodeAssist metadata (ideType/platform/pluginType as numeric enums) (#11969) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：antigravityHeaders.ts getAntigravityLoadCodeAssistMetadata 改数值枚举 ideType:9/platform:2/pluginType:2（protobuf-JSON int32）；按 orbiot #8098 钉 darwin/arm64 语义固定 platform=2（不按宿主解析）。同步 dist d.ts，onboardAntigravityUser 参数类型改 Record<string,number>。tsc=0 |
| 364 | `dfc84ba03` | fix: regenerate package-lock.json for packages/browser-pool workspace (#11784) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：package-lock.json 重生成（依赖锁文件，无代码变更）。 |
| 375 | `2471a0d95` | feat(plugins): add OMNIROUTE_PLUGINS_DIR to override the plugin scan directory (#11827) (#11906) | `feat` | ✅ 已吸收并品牌适配：支持 `ORBIT_PLUGINS_DIR` 覆盖插件扫描目录 | 已迁移并补充 `.env.example` |
| 392 | `1c37fff05` | fix(memory): honor category filter in GET /api/memory (#11699) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：MemoryFilter 增加 category；genericBackend queryParams 映射 category（默认 'category'）+ buildListQuery 透传；obsidianBackend 按 metadata.category 过滤；store.listMemories 增加 json_extract(json_valid 保护) 条件；sqliteBackend 透传。orbiot 无独立 GET /api/memory 基础路由（子路由体系），数据层能力已补齐。tsc=0 |


### 2.8 工程架构/CI/质量基线 (Engineering & CI)（共 85 个提交）

| 序号 | Commit Hash | 提交说明 | 提交类型 | orbiot 当前状态与代码核查 | 建议同步动作 |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 7 | `86b1cb84f` | feat(release): reconcile-changelog tool + version-anchored fragment aggregation (#12987) | `feat` | ✅ 已吸收：迁入版本锚定 changelog 聚合、未覆盖提交解析与 reconcile 工具；适配无根版本号的 monorepo，支持 `--help` 并在未传版本时明确失败 | 已注册 `release:reconcile`；语法与帮助入口通过，真实 PR 对账需 gh 登录 |
| 12 | `fcc2dcd1a` | docs(changelog): reconcile the v3.8.51 living section — fold 366 fragments, cover every cycle commit, credit every contributor (#12971) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 24 | `6d6b6027c` | fix(pwa): do not intercept navigations so Chrome can retry HTTP/2 (#12767) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 无 sw.js/导航拦截式 service worker（gateway dist 引用的 PwaRegister 源文件不存在于源码树）。 |
| 32 | `2b2d34eb5` | fix(cursor): guard non-array tool_calls in request translator (#12691) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：openai-to-cursor.ts 两处 tool_calls 判定加 Array.isArray 守卫（防非数组值 TypeError）。tsc=0 |
| 39 | `3858923f6` | fix(ci): ship .npmrc in published package so legacy-peer-deps applies to consumers (#11544) (#12699) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：发布包附带 .npmrc（打包/CI 配置）。 |
| 41 | `7da6e10c4` | fix(docker): pin 4 CLI tools to exact versions (#12576) (#12703) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot Dockerfile 不安装这 4 个 CLI 工具（无 npm -g 安装段），版本漂移问题不存在。 |
| 65 | `3d2bcc9f1` | feat(api): emit gateway-measured tokens-per-second excluding TTFT (#12631) | `feat` | ✅ 已吸收：stream timing 以总耗时减 TTFT 计算 generation duration，并在真实/估算 usage 上附加 `tokens_per_second` | 已迁移 |
| 69 | `04ba19fa6` | chore(quality): rebaseline apiKeys.ts for #12352's preserved ACL (#12673) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 71 | `6e35ad01c` | fix(cli): remove duplicate positional argument in tunnel create command (#12368) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：tunnel.mjs create 命令去除重复位置参数（.command("create [type]") 与 addArgument 双注册）。tsc n/a（.mjs） |
| 73 | `9271a34ec` | fix(api): preserve API key ACL on creation (#12352) | `fix` | ✅ 已迁移 (createApiKey 扩展 options 接收 modelAccessMode/allowedModels/allowedCombos 并经 normalizeApiKeyPermissionsUpdate 规范化后落库；createKeySchema 增加字段+一致性校验；keys 路由透传；apiKeysDb.d.ts 与 dist types 同步；顺带修复契约测试遗漏 getApiKeyDisplayNames 的历史漂移) | 建议移植修复 |
| 96 | `910f58c5c` | docs(quality): document how the CodeQL ratchet refreshes and how to tighten it (#12611) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 98 | `ad500de9e` | chore(quality): rebaseline file-size caps the hartmark batch grew past (#12623) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 99 | `1baa8c363` | fix(quality): re-point the zcodeProtocol public-creds allowlist to line 313 (#12615) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：check-public-creds 质量脚本行号重指（脚本工具）。 |
| 104 | `2e4a79ca5` | fix(quality): detect duplicate tool_calls entries in one response (#12446) | `fix` | ✅ 已迁移 (validateQuality.ts 新增 findToolCallSpecViolation 并入质量门；attemptLogging 持久化后审计 provider.spec_violation；新增 tool-call-spec-violation.test.ts 3/3) | 建议移植修复 |
| 106 | `7881e7eb7` | fix(conversations): resolve turn content OmniRoute never sends back to the client (#12447) | `fix` | ✅ 已迁移 (conversationTurnContent.ts：解析范围扩展到 providerRequest.body（含 Chat Completions tool_calls 回退）与 clientResponse.output，indexTurns 去重) | 建议移植修复 |
| 108 | `d35387034` | fix(resourcePressure): log numeric detail on every rejection, recover faster (#12293) | `fix` | ✅ 已迁移 (resourcePressure.ts：拒绝日志带 key=value 数值明细（heap/PSI/cgroup/缓存年龄）；resourcePressurePolicy.ts：PSI 阈值上调 50% (30/60/15)、恢复 streak 3→1) | 建议移植修复 |
| 109 | `d9526cefe` | chore(quality): rebaseline file-size caps the HouMinXi batch grew past (#12619) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 124 | `e1cf54237` | chore(deps): bump fast-uri to 3.1.7 in the electron lockfile (#12601) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 126 | `7d0b264ed` | chore(electron): drop openAsHidden/wasOpenedAsHidden, removed in Electron 44 (#12554) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 135 | `2a6d45abe` | deps: bump electron from 43.4.1 to 44.0.0 in /electron (#12217) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 137 | `60ea5f885` | deps: bump the development group across 1 directory with 2 updates (#12347) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 138 | `fa64266e3` | deps: bump qs from 6.15.2 to 6.16.0 (#12512) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 139 | `df97d46f4` | deps: bump fast-uri from 3.1.5 to 3.1.7 (#12514) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 141 | `d6770bda0` | deps: bump @xmldom/xmldom from 0.9.10 to 0.9.12 (#12513) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 142 | `fcddea789` | deps: bump @humanfs/node from 0.16.7 to 0.16.8 (#12515) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 143 | `1a0375fba` | chore(quality): tighten the CodeQL ratchet baseline from 11 to 6 (#12530) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 146 | `7448590b8` | deps: bump @xmldom/xmldom (#12500) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 162 | `a25ac4d97` | fix(types): make system prompt injection noImplicitAny-safe (#12416) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：上游为 noImplicitAny 类型级加固；orbiot systemPrompt.ts 已通过严格 tsc --noEmit（core/inference/control/worker 全 0），无该类型债。 |
| 163 | `089e70cbc` | fix(quality): validate typecheck baseline schema (#12419) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：typecheck baseline schema 校验（质量工具）。 |
| 168 | `6d556c242` | fix(quality): record the 2026-09-02 merged growth in the file-size baseline (#12434) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：file-size baseline 记录（质量工具 ratchet）。 |
| 186 | `eb09e894c` | docs: align env and troubleshooting docs with the code (#12404) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 188 | `674d39137` | fix(cli): resolve the Bun preload path against the package root (#12387) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot CLI 无 --preload setupPolyfill 的 server 子进程 spawn 机制（受影响架构不存在）。 |
| 191 | `d337c5d30` | test(executors): restore the #10986 reasoning-only fallback guards (#12364) | `test` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 199 | `382e2e85d` | chore(quality): re-tighten the file-size ratchet to the real LOC (plan 3.8.52 task 0) (#12411) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 209 | `24b784e9b` | [Performance] Enable React Compiler for automatic memoization (#11783) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 210 | `96824288f` | feat(compression): make proactive context-compression threshold a live setting (#11564) | `feat` | ✅ 已随 TASK-P2-02 吸收：压缩阈值已改为持久化实时设置并提供 10%–99% 管理台滑块 | 已迁移并验证（未构建/部署） |
| 213 | `c702a27ed` | perf(compression): OOM mitigations for large payload hashing, memoization, and token estimation (#7847) (#11844) | `perf` | ✅ 已同步：流式 JSON SHA-256、无大字符串 JSON 长度计算、base64 图像剥离/有界 token 估算、live-zone/stream collector/hard-budget 内存优化、memo 命中统计和命中标记均已迁移，并适配 Orbit 的 structuredClone 实现 | 已吸收 |
| 217 | `7f25d67d0` | feat(radar): explain access rules before opt-in (#12342) | `feat` | ✅ 已吸收：订阅前明确签名目录下载、本地覆盖优先、零请求/提示词/密钥上传和可随时退出 | 已迁移到当前 Radar 页面 |
| 221 | `a784b4206` | fix: resolve compression worker file using runtime anchors instead of… (#12183) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：compressionWorkerPool.ts workerUrl() 保留 import.meta.url 首选（tsc/tsx 下精确），新增 runtimeAnchors(cwd/argv[1])+firstAncestorWith（≤8 级向上走查）兜底解析 packages/inference/dist|src 的 compressionWorker.{js,ts}，防 bundler 重写 import.meta.url 后 Worker spawn 必崩。tsc=0 |
| 225 | `17792ce0a` | Update README.md (#12194) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 228 | `ad4b67d63` | feat(radar): show the rate limits and training disclosure the feed already sends (#12320) | `feat` | ✅ 已吸收：目录表显示 RPM/RPD/TPM/TPD 与训练披露 | 已迁移 |
| 237 | `78a0e4b10` | fix(usage): declare the Adobe Firefly usage fetcher the dispatcher already calls (#12321) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：usage.ts USAGE_FETCHER_PROVIDERS 补 'adobe-firefly'/'firefly'（switch 派发已在位，注册表漏列导致 manifest/配额报无 fetcher）。tsc=0 |
| 241 | `fe5f4b0ef` | chore(quality): remove unreachable code and restore test discovery (#11950) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 242 | `c818655b5` | chore(deps): refresh runtimes and adopt ESLint 10 (#11259) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 245 | `f301d34ce` | fix(dev): qualify Turbopack runtime boundaries (#12258) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：Turbopack dev 运行时边界限定（Next dev-server 专属，orbiot console 为 Vite）。 |
| 253 | `f5e70950d` | chore(ci): point the circular-deps gate at dpdm's real JS entrypoint (#11615) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 256 | `d53da4fdc` | chore(quality): dedupe tap.testFiles entries added by racing base-red fixes (#12265) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 261 | `5eaafe8e1` | Revert "docs: recommend gstack for AI-assisted workflows (#11770)" (#12248) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 263 | `7f9195cd2` | chore(lint): batch 7 of #12146 — final src tail: 37 react-hooks violations across 33 files resolved (#12244) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 264 | `06e7a6d50` | Revert "docs: recommend gstack for AI-assisted workflows (#11770)" (#12249) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 266 | `a249a9dc2` | docs(api): document every implemented route in openapi.yaml (276 → 692 paths) (#12212) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 269 | `dc6daf27b` | fix(dev): silence webpack runtime module warnings (#12228) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：webpack dev 运行时告警静默（dev-server 专属，orbiot 无 next.config）。 |
| 275 | `e0b9eb08e` | Update README.md (#12202) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 276 | `4d92ea996` | Update README.md (#12193) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 284 | `978f32984` | fix(deepseek-web): stop Turbopack dev panic in the PoW worker path resolver (#12221) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：Turbopack dev PoW worker 路径解析 panic（Next dev 专属）。 |
| 285 | `7ba5b7a74` | Change hasFree from true to false for featherless.ai (#12216) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 289 | `8acdd5302` | docs: recommend gstack for AI-assisted workflows (#11770) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 295 | `4b5266d3f` | fix(dev): isolate batch dispatch from instrumentation (#12081) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：batch dispatch 与 Next instrumentation 隔离（Next 专属机制）。 |
| 296 | `f8b01c966` | fix(dev): make logging resources HMR-singleton (#12079) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：logging 资源 HMR-singleton（Next dev HMR 专属）。 |
| 298 | `2fbd0f5c2` | fix(dev): isolate root layout settings reads (#12076) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：root layout settings 读取隔离（Next app router 专属）。 |
| 304 | `6706c382d` | docs(audit): align every published number with the code and harden check:docs-counts (#12200) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 310 | `bbbcc7938` | chore(lint): batch 4 of #12146 — shared/components react-hooks violations resolved (#12159) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 312 | `897c3f8c9` | fix(cli): register alias resolver hooks in-thread on modern runtimes (#12073) (#12083) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：orbiot 无 CLI 级 ESM alias resolver hook 子系统（无 aliasResolver.mjs/module.register）。 |
| 315 | `8a1d9bf91` | feat(resilience): default the credential health check sweep to 60 minutes (#12138) | `feat` | ✅ 快照已吸收：`DEFAULT_HEALTH_CHECK_INTERVAL_MIN = 60`，每连接可覆盖/禁用 | 无需重复迁移 |
| 318 | `8b7afc0eb` | feat(quality): new-code mode for the complexity and dead-code ratchets (Clean as You Code) (#12142) | `feat` | ✅ 已吸收并适配：迁入 new-code diff/worktree 核心及 complexity/dead-code ratchets，扫描范围由上游单体目录改为 Orbit 的 `apps/packages/scripts` | 已注册质量命令并通过脚本语法检查 |
| 322 | `26bfda3cb` | feat(resilience): operator-configurable global credential health check interval (#12043) | `feat` | ✅ 当前已等效：支持 `CREDENTIAL_HEALTH_CHECK_INTERVAL` 全局覆盖，并保留每连接分钟级覆盖与 `<=0` 禁用 | 无需再增加重复设置源 |
| 324 | `e93c5e765` | fix(diagnostics): keep the call-log error when the size limit strips the bodies (#12026) (#12095) | `fix` | ✅ 已迁移 (callLogArtifacts.ts 换用 preserveErrorForSizeLimit：UTF-8 安全截断 + 循环引用安全序列化，三处 size-limit 回退层统一走该 helper) | 建议移植修复 |
| 333 | `3d1529496` | fix(leases): project status lease row to lease columns so joined connection PII never escapes (#12115) | `fix` | ✅ 已等效：orbiot lease() 映射已是显式字段投影（逐字段构造 ExclusiveConnectionLease），joined connection_* 列（email/display_name）不会经类型逃逸到 lease 对象，与上游 #12115 修复等效 | 等效保留（已对照 Orbit 现状验证） |
| 350 | `77f6f7370` | fix(ci): clear the two base-reds the 2026-08-30 merge batch left on release/v3.8.51 (round 3) (#12123) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：CI base-red round 3（.env.example/docs 注释）。 |
| 357 | `0b19c5a09` | feat(nodejs): add 5dive as a configure target (#11852) | `feat` | ✅ 已吸收：CLI manifest/configure/独立 setup-5dive 均已注册，密钥通过 stdin，支持 sudo、profile、seat pin 与 dry-run | 已迁移并品牌/端口适配；6 项 helper 断言与 CLI typecheck 通过 |
| 362 | `4c187de99` | fix(docs): resolve relative markdown and wiki links across Fumadocs and GitHub wiki (#11834) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：docs 相对链接/wiki 解析工具（docs 基建）。 |
| 365 | `b07eaafcc` | fix(cli): probe both IPv4 and IPv6 loopback for server readiness (#11766) (#11794) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：cli pid.mjs pollHealthOnce/isPortListening 同时探测 127.0.0.1 与 ::1（并发，任一 ready 即 ready；error 归并后 listening 判定）。tsc n/a（.mjs） |
| 367 | `212fba734` | docs: document native dependency check escape hatch (#12101) | `docs` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 368 | `25aa95f0d` | chore(deps): bump github/codeql-action/init from 4.37.7 to 4.37.8 (#11925) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 369 | `23144ad64` | chore(deps): bump github/codeql-action from 4.37.7 to 4.37.8 (#11926) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 370 | `4254b1fce` | chore(deps): bump github/codeql-action/analyze from 4.37.7 to 4.37.8 (#11927) | `chore` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 372 | `823dae0e9` | fix(skills): expand shorthand property types in injected tool schemas (#11857) | `fix` | ✅ 已等效 | ✅ 已等效 (2026-09-11)：skills/injection.ts 简写属性展开逻辑已在位（上游本提交实质仅改注释+新增测试）。 |
| 381 | `41f4f8377` | fix(release): never let the tag-push Create Release append auto notes to the curated body (#12096) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：tag-push Release 自动 notes 追加（CI 发布流程）。 |
| 383 | `e96e40c03` | fix(images): forward Antigravity image size (#11952) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：imageGeneration.ts 新增 normalizeImageGenerationSize（1K|2K|4K，image_size/imageSize 双键），handleGeminiImageGeneration 的 imageConfig 补 imageSize，日志摘要携带 aspect_ratio/image_size。tsc=0 |
| 388 | `e620c50f3` | fix(api): clear the six API-route TypeScript regressions the new gate landed red on (#12094) | `fix` | ✅ 不适用 | ✅ 不适用 (2026-09-11)：上游为 API 路由 TS 回归修复；orbiot control tsc --noEmit 已归零，无回归可清。 |
| 393 | `c2c97aff8` | ci: add API route TypeScript regression gate (#11705) | `ci/deps` | ⏭️ 用户确认排除：不纳入本轮同步范围 | 无需审计或迁移 |
| 394 | `faebf6de5` | fix(shared): block cloud-metadata hosts under default remote-image guard (#11755) | `fix` | ✅ 已迁移 | ✅ 已迁移 (2026-09-11)：remoteImageFetch.ts validateRemoteImageUrl 补 block-metadata 分支 → parseAndValidateNonMetadataUrl（默认模式原本漏拦云元数据主机，SSRF 缺口）。tsc=0 |
| 397 | `49827c1db` | fix(dev): bound webpack and Tailwind scans (#12075) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：webpack/Tailwind 扫描边界（next.config dev-only，orbiot 不适用）。 |
| 398 | `47ea113b9` | fix(ci): reconcile release test contract drift (#12082) | `fix` | ⏭️ 用户确认排除 | ⏭️ 用户确认排除：release 测试契约漂移对齐（CI 契约，无生产行为变更）。 |
| 401 | `da678bd3f` | feat(config): add support for runtime system prompt configuration and hot-reloading (#11841) | `feat` | ✅ 当前实现更完整：globalThis 共享 prefix/suffix prompt 配置，设置保存后运行时刷新且覆盖 OpenAI/Claude 消息形态 | 无需复制旧单 prompt 实现 |


---

## 三、orbiot 源码级深度对照要点汇总

经过对 `orbiot` 源码的对照排查，以下为直接影响生产环境运行的核心要点：

### 1. 修复类问题：当前 orbiot 是否存在这些问题？

- ⚠️ **GHSA-5926-2w35-7h4q 凭证导出与 CLI 写入越权**（`49c4a620c`）：**存在**。`apps/control/src/settings/config/settings-config.controller.ts` 的 `export-json` 路由仅验证会话是否存在，未增加严格的 RBAC 权限拦截。
- ⚠️ **配额并发击穿（Singleflight 缺失）**（`3abd85509`）：**存在**。`packages/inference/src/services/quotaSaturation.ts` 的 `getSaturation` 缺少 in-flight Promise 合并机制，高并发未命中时并发穿透请求。
- ⚠️ **SQLite 启动死锁/竞争**（`8820f1df2`, `29593377c`）：**存在**。`packages/core/src/lib/db/core.ts` 中 `PRAGMA journal_mode=WAL` 先于 `PRAGMA busy_timeout=2000` 执行，多进程下容易抛 `SQLITE_BUSY`。
- ⚠️ **AIza / sk 凭证脱敏规则不完全**（`89c42d36d`, `4a37c7f46`）：**存在**。`packages/core/src/lib/guardrails/credentialMasker.ts` 仅匹配固定长度，且公共 5xx 错误未做强制脱敏。
- ⚠️ **流式响应假成功（HTTP 200 夹带错误帧）**（`0015949a2` 等）：**存在**。`packages/inference/src/utils/stream.ts` 尚未对 Grok-Web/Zed/Z.ai 等错误帧流做主动异常截断。
- ⚠️ **LKGP 状态未随 Combo 删除清理**（`1b97f42ba`）：**存在**。`packages/core/src/lib/quota/quotaCombos.ts` 删除组合未清理 Pin。
- ✅ **已自修复项**：`nara` 的 `modelsUrl` 与 `providerSets` 发现接线；`kimi-web` 的 Token 刷新按钮。

### 2. 新增功能类：当前 orbiot 是否具备这些功能？

- ✅ **配额加权路由（Quota-Weighted Routing）**（`c1b34db50`）：**已同步**。支持排除耗尽账户、1% 软阈值兜底池、按剩余额度与在途负载加权抽取，并保留会话/缓存亲和后的占位转移与释放。
- ✅ **账号实时模型目录（Live Account Catalog）**（`ebdbd2c67`）：**已同步**。Claude/Codex/Copilot/AGY 使用账号实时发现结果并与调度目录合并。
- ✅ **Orchestration 可视化编排画布（阶段 2）**（`63e4afa321`、`073b98462d`、`d2a027a156`、`6b4519c317`、`84b345d9c0`、`a628d28898`）：**已同步**。已提供统一四源快照、Agents/Routing/Overview/History 视图及实时刷新。
- ✅ **JSON 树状折叠查看器**（`5684589ce`）：**已同步**。请求、响应和调用详情均已使用交互式 JSON 树。
- ✅ **动态上下文压缩阈值调节**（`96824288f5`）：**已同步**。阈值支持持久化、热读与管理台实时调节。
- ✅ **连续日志导出（BigQuery）**（`385e90f44`）：**已同步**。已提供可插拔目的地、增量游标、调度、管理 API 与控制台。

### 3. Provider 更新类：当前 orbiot 支持情况

- ✅ **新增 Provider（5 个）**：`MaxAI`、`UC (uncensored.com)`、`Perplexity Agent`、`SeekAi`、`LiquidAI` 已注册并接入对应执行能力。
- ✅ **火山引擎 (Volcengine)**：已同步多连接套餐安全绑定、规范化配额窗口与控制台凭据响应脱敏（`0f81e7557`）。
- ✅ **智谱 GLM / Z.ai**：已同步 **GLM-5.3-Flash Coding Plan** 目录、1M 上下文/128K 输出规格、视觉能力、推理档位、请求默认参数与价格。
- ✅ **Gemini / Vertex AI**：已同步布尔 `required`、嵌套裸 Map schema 修复（`57d7c8bc88`）及 v1beta1 Model Garden Anthropic 发现（`fe8ef4fa9`）。
- ✅ **ChatGPT Web Connector**：已升级至 v4.0.7 clean-room browser 传输，42 项定向测试与 inference typecheck 通过。

---

## 四、Commit 同步方案与实施路线图 (Sync Implementation Plan)

由于 `orbiot` 已经完成了 `apps/*`（control/gateway/realtime/worker/console）与 `packages/*`（core/contracts/http/utils/providers/inference）的清晰架构拆分，**绝对不能直接全库 `git merge`**（否则会引入旧 BFF 目录破坏单体拆分边界）。

推荐采用 **「领域按批移植 + 独立契约验证 + 门禁保护」** 的三阶段落地方案：

### 4.1 阶段一：高危安全补丁与网关稳定性修复 (P0 - 立即实施)

直接从 `Orbit` 上游对应 Commit 摘取逻辑并移植到 `orbiot` 的对应模块中：

1. **移植 GHSA 鉴权硬拦截**（`49c4a620c`）

   - 目标文件：`apps/control/src/settings/config/settings-config.controller.ts`

   - 动作：为 `export-json` 和 CLI 配置写入添加强鉴权与敏感数据保护。
2. **移植 Quota Singleflight 并发去重**（`3abd85509`）

   - 目标文件：`packages/inference/src/services/quotaSaturation.ts`

   - 动作：为 `getSaturation` 添加 in-flight Promise Map，防止并发瞬时打穿后端。
3. **修复 SQLite 启动锁竞争**（`8820f1df2`, `29593377c`）

   - 目标文件：`packages/core/src/lib/db/core.ts`

   - 动作：将 `db.pragma('busy_timeout = 2000')` 移至 `db.pragma('journal_mode = WAL')` 之前。
4. **增强全局凭据脱敏正则**（`89c42d36d`, `4a37c7f46`）

   - 目标文件：`packages/core/src/lib/guardrails/credentialMasker.ts` 与 `packages/utils/src/errors/`

   - 动作：扩展 `AIza` 与 `sk-` 通配规则，在全局 5xx 拦截器注入脱敏。
5. **修复 SSE 流式错误假成功**（`0015949a2`, `e1c0c66fe`）

   - 目标文件：`packages/inference/src/utils/stream.ts`

   - 动作：在流解析管道中识别 JSON 错误帧并主动转换为网关异常中断。

### 4.2 阶段二：Provider 生态扩展与路由核心能力 (P1 - 建议尽快排期)

1. **移植配额加权路由 (Quota-Weighted Routing)**（`c1b34db50`）

   - 目标文件：`packages/inference/src/services/combo/`

   - 动作：实现基于账户剩余配额比例的加权抽签轮询算法。
2. **更新 Provider 注册表与模型规格**

   - 目标文件：`packages/providers/src/config/providers/` 与 `packages/providers/src/catalog/`

   - 动作：补齐 MaxAI, UC, Perplexity Agent, SeekAi, LiquidAI 注册表条目；注册 GLM-5.3-Flash Coding Plan。
3. **移植 Provider 核心修复**

   - 目标文件：`apps/control/src/providers/volcengine/` 与 `apps/gateway/src/`

   - 动作：同步火山引擎窗口映射（`0f81e7557`）与 Gemini 序列化修复（`0e1e9d892`）。

### 4.3 阶段三：管理台体验与长尾能力 (P2 - 持续迭代)

1. **升级控制台日志查看器**（`5684589ce`，已完成）

   - 目标文件：`apps/console/src/features/logs/request-logs.tsx`

   - 结果：已将原 `<pre>` 视图替换为可折叠、高亮的交互式 JSON 树组件。
2. **动态上下文压缩阈值**（`96824288f5`，已完成）

   - 目标文件：`apps/control/src/compression/` 与 `apps/console/src/features/compression/`

   - 结果：已提供实时阈值调节滑块、持久化设置与热读接口。
3. **引入 Orchestration 画布**（`63e4afa321` 等六个真实提交，已完成）

   - 目标文件：`apps/console/src/features/orchestration/`

   - 结果：已接入统一画布、四源快照、历史视图、Repeat 操作与 agents 实时通道。

### 4.4 同步质量门禁与验证命令

同步期间仅执行不产生产物的类型检查、定向测试与架构审计。必须等 407 个提交全部完成审计与吸收后，再统一执行构建、发布验证与 NAS 部署：

```bash
# 1. 同步期间：类型检查（不执行 build）
pnpm typecheck

# 2. 同步期间：架构独立性与边界审计
pnpm audit:app-boundaries
pnpm audit:package-boundaries
pnpm audit:gateway-independence
pnpm audit:route-contracts

# 3. 全部同步完成后统一执行
pnpm build
pnpm smoke:route-imports
pnpm smoke:split-deployment
pnpm verify:release
```
