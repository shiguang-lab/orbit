# Shiguang Gateway 独立化重构方案与自动审查

状态：代码、镜像、数据导入和拆分服务的本地验收已完成；Provider 上游矩阵仍需在目标环境
提供真实凭据后执行。运行时、数据库、日志、任务、实时通道和管理 API 均由本项目自身提供，
部署不依赖外部同名服务。

本次验收已将冷快照导入独立 Docker volume，并验证数据表内容、密钥解密、原生 SQLite/vector、
接口、实时端口和后台任务。生产切换仍需在发布环境执行同一导入流程，并完成每个已启用 Provider
的真实上游矩阵验证。

最终发布只能以 `pnpm audit:release-readiness` 的严格结果为准。该门禁会把源码/路由、
SQLite 快照、白名单外部状态和每个启用 Provider 的真实上游 smoke 合并审查；缺少任何
输入、凭据或 endpoint 都会失败，不能用静态路由覆盖结果替代。

审查基线：2026-09-04；本仓库 `18acb17`；同级官方 Orbit 源码 `../Orbit`，当前快照
`e7822d4d2`（版本 `3.8.51`）。官方源码仅作为本次盘点和一次性数据导入的来源，
不得成为独立部署运行时的依赖。

## 1. 结论先行

目标不是继续把 Admin/API 放在官方 Orbit 前面做代理，而是把所需能力、数据模型和
运行时复制进本项目，形成一个可单机运行、可水平扩展、可断开官方 Orbit 的产品。

推荐路线是“模块化单体先完成等价，再按稳定边界拆服务”：

1. 先把官方 Orbit 作为只读上游快照，导入本项目自己的数据库和密钥体系。
2. 把路由、SSE/翻译、Provider executor、数据库、任务和安全模块迁入本仓库的
   `packages/*`，删除 `../Orbit` path、NAS proxy、兼容路由和动态 import。
3. 用同一套领域包同时驱动 `edge-gateway`、`control-api`、`realtime` 和 worker，
   先保持一个可部署镜像，待契约稳定后再拆容器。
4. 切换期间进行官方 Orbit 与独立实例的只读/影子对比；切换后在网络层阻断官方地址，
   CI 继续用自动审查脚本防止依赖回流。

当前实现将 689 个 API 加 9 个根 `route.ts` 文件纳入 `packages/gateway-runtime`，由本地
dispatcher 承载；当前有 22 个
 Fastify 适配文件（193 个显式 handler），其余 route 通过同一进程的本地路由
 dispatcher 执行。`pnpm audit:gateway-independence`、`pnpm audit:brand`、数据校验和容器 smoke
均已通过；Provider 真实上游可用性仍取决于部署环境提供的凭据和网络。

## 2. 官方 Orbit 能力盘点

官方架构文档把系统定义为 Next.js API routes + `src/sse`/`open-sse` 路由核心：统一
OpenAI 兼容入口，负责 Provider 翻译、流式输出、fallback、token 刷新、用量记录和
管理台。官方 release 文档还明确了 MCP 三种传输、A2A JSON-RPC/SSE、SQLite WAL、
实时 WebSocket、嵌入式服务和本地 Provider/OAuth 管理。

### 2.1 对外数据面（必须 1:1 保留）

| 能力域 | 协议/入口 | 目标实现包 |
|---|---|---|
| 聊天与代码代理 | `/v1/chat/completions`、`/v1/messages`、`/v1/responses`、流式 SSE | `packages/gateway-core`、`packages/translation` |
| 实时协议 | `/v1/ws`、Responses WebSocket、live dashboard WS（默认 20132） | `apps/realtime` |
| 模型与多模态 | `/v1/models`、`/v1/embeddings`、`/v1/images/generations`、`/v1/audio/transcriptions`、`/v1/audio/speech`、`/v1/videos/generations`、`/v1/music/generations`、OCR | `packages/provider-runtime` |
| 工具型 API | `/v1/search`、web fetch、rerank、moderations、文件/批处理 | `packages/gateway-core`、`packages/jobs` |
| 兼容协议 | `/v1beta` Gemini、Ollama aliases、provider 专用路由、CLI/VS Code aliases | `packages/protocol-adapters` |
| 路由决策 | 19 种策略、Auto Combo、模型/Provider/账号 fallback、配额预检、工作流阶段路由 | `packages/routing-domain` |
| 请求处理 | role normalization、structured output 转换、think tag、token 计数、响应清洗、系统 prompt、请求去重/缓存 | `packages/request-pipeline` |

### 2.2 Provider 与凭据

- Provider catalog、Provider connection、Provider node、模型同步、自定义模型、别名、
  参数过滤、拦截规则、健康测试、过期和配额窗口。
- 官方快照的架构说明包含 351/104 的历史计数；远程 `release/v3.8.51` 文档已出现
  355/108、18 个 embedding provider 等漂移。实现时以导入快照中的注册表和自动生成的
  manifest 为准，禁止把文档中的旧数字硬编码成业务逻辑。
- 22 个 OAuth provider 模块（Claude、Codex、Cursor、GitHub、Kiro、Qoder、Antigravity、
  Zed 等），API key、OAuth refresh、CLI token、keychain/本地导入和脱敏展示必须全部保留。
- Provider executor 必须覆盖 API-key、OAuth、浏览器 cookie、CLI/app-server、兼容节点、
  图像/音频/视频/搜索等类型；executor registry 只能由本地包加载。

### 2.3 管理面与运营能力

按官方 `src/app/api` 一级目录归并为以下 14 个域；这些域合计覆盖当前 102 个 API 组：

1. **Auth/Security**：`auth`、`admin`、`policies`、CSRF、JWT/OIDC、API key scope、
   IP filter、SSRF/outbound URL guard、guardrails、审计。
2. **Providers/Models**：`providers`、`provider-nodes`、`provider-models`、`models`、
   `provider-metrics`、`provider-stats`、`synced-available-models`、`oauth`、`codex`、
   `cursor-cli`、`dahl`、`upstream-proxy`。
3. **Routing/Resilience**：`combos`、`model-combo-mappings`、`fallback`、`routing`、
   `resilience`、`rate-limit`、`rate-limits`、`headroom`、`session-pools`、`token-health`。
4. **Usage/Cost**：`usage`、`pricing`、`quota`、`budget`（通过 catch-all/usage 路由）、
   `telemetry`、`free-tier`、`free-models`、`free-provider-rankings`、`radar`、`search`。
5. **Logs/Observability**：`logs`、`monitoring`、`health`、`compliance`、`provider-metrics`、
   `routing/decisions`、`db/health`、`storage/health`。
6. **Compression/Context**：`compression`、`context`、`memory`、`intelligence`、
   `model-capability-overrides`、`settings/compression`。
7. **Agent protocols**：`mcp`（stdio/SSE/Streamable HTTP，工具审计）、`a2a`（JSON-RPC
   2.0、SSE、Agent Card、task lifecycle）、`acp`、`agent-skills`、`skills`。
8. **Cloud/Conductor**：`cloud`、`conductor`、`issue-agent`、`copilot`，包含任务创建、
   状态刷新、取消、消息和凭据管理。
9. **Keys/Sync**：`keys`、`sync`、`relay`、`registered-keys`、设备和 token lifecycle、
   ETag 配置 bundle、云同步。
10. **Settings/System**：`settings`、`init`、`system`、`version-manager`、`restart`、
    `shutdown`、`tags`、`openapi`、`docs`、`network`。
11. **Files/Jobs**：`files`、`batches`、`jobs`、`db-backups`，包括导入导出、恢复、
    checkpoint、定时任务和 webhook 重试。
12. **Embedded services**：`services` 下的 9Router、CLIProxyAPI、Mux、Bifrost、Dario，
    以及 `/api/services/[name]/logs` SSE；需要 supervisor、健康探针、安装/升级/启停、
    日志环形缓冲和端口冲突处理。
13. **Local tooling**：`cli`、`cli-tools`、`tools`（Agent Bridge、Traffic Inspector、
    MITM、证书、DNS、tproxy、代理抓包）、`local` Redis 控制。
14. **Feeds/Integrations**：`plugins`、`webhooks`、`gamification`、`telegram`、
    `discovery`、`assess`、`chaos`、`modality-bridge`、`vnc-session`、`github-skills`。

自动审查脚本会直接从官方快照枚举实际组和 route 文件，以上清单是架构分组，不替代
机器清单；每个 route 都必须生成契约测试和 owner。

### 2.4 持久化与基础设施

#### 2.4.1 独立基础设施交付基线

`deploy/docker-compose.infrastructure.yml` 是独立基础设施编排，提供 PostgreSQL 16 与
Redis 8 两个独立服务、独立 named volume、健康探针及 `shiguang-gateway-infra` 内网。
应用 compose 仅连接该网络，不把数据库或 Redis 打进应用镜像。应用当前通过
`REDIS_URL`/`QUOTA_STORE_REDIS_URL` 使用 Redis 的限流、共享配额和事件能力；Redis 中的键
均视为可重建状态，不能替代权威数据。

`apps/importer/src/migrate-sqlite-to-postgres.mjs` 提供一次性、只读 SQLite→PostgreSQL
转换：校验 `PRAGMA integrity_check`，保留表/列名和行值，在 `gateway` schema 写入数据，
并在 `gateway._migration_runs`、`gateway._table_manifest` 记录源 SHA-256、表数和行数。
目标 schema 已存在时命令拒绝执行，只有明确的 `--replace-schema` 才允许重建目标 schema。
该转换脚本不会读取或修改官方运行中实例；NAS 操作必须使用已冻结的冷快照目录。

PostgreSQL 成为应用权威库的发布门禁是：仓储层完成 PostgreSQL 原生事务/锁语义、FTS5/
sqlite-vec 对应索引重建、全量 route 与 worker 验收，并完成 SQLite 与 PostgreSQL 行数及
关键字段对账。在门禁通过前，SQLite 快照仍是当前运行时权威库，不能删除或覆盖。

官方实现的关键事实：Node.js（当前源码要求 Node 22/24+）、Next.js 16.3、React 19、
`better-sqlite3` + WAL、`sqlite-vec`、可选 ioredis、Playwright/Chromium 浏览器池、
独立 live WebSocket 端口 20132，以及 Docker volume 保存 `/app/data`。官方迁移目录当前
有 169 个 SQL migration 文件；脚本盘点到 130 个 `CREATE TABLE` 声明（包含虚拟表和
重复声明），不能只复制几张“核心表”。

必须迁移的状态类别：

- Provider/模型/组合/别名/参数过滤/拦截/配额和连接运行时状态；
- API keys、key groups、权限、设备、token limits、CLI tokens、relay/proxy assignments；
- usage history、call logs、proxy logs、详细日志、小时/日聚合和 telemetry；
- cache、reasoning cache、compression analytics、memory + FTS/vector metadata；
- A2A/MCP/skills/plugins/webhooks/jobs/evals/gamification/discovery/radar；
- settings、feature flags、IP/proxy/mitm、backup/sync/version-manager、迁移元数据。

但“数据库快照”不等于“所有数据”。官方实现还把状态写在数据库以外，必须逐项处理：

| 存储位置/组件 | 官方用途 | 初始独立部署策略 | 是否替换 |
|---|---|---|---|
| `${DATA_DIR}/storage.sqlite`（better-sqlite3/WAL） | 配置、Provider、key、用量、审计、任务、缓存和迁移元数据的权威库 | 冷快照导入；单节点只允许一个 SQLite writer | **先保留**，保证语义和数据完整性 |
| `db_backups/`、`log.txt`、`${DATA_DIR}/call_logs/`、`<repo>/logs/` | 数据库备份、运行日志、请求原文/响应制品 | 与 DB 一起做 manifest、校验和、恢复演练；不能只拷贝 SQLite | 单节点保留本地 volume；HA 时迁移到 S3/MinIO |
| `sqlite-vec` + FTS5 | 本地 memory 向量和全文检索 | 随 SQLite 导入后重建索引并校验 | **先保留** |
| Qdrant（可选） | 大规模/跨实例 memory 向量主库 | 若启用，单独导出 collection、payload、向量维度和 embedding model；不可只导入 DB | 大规模或多副本时保留；小规模不必引入 |
| Redis（ioredis） | 分布式限流、共享 quota counter/cache、事件 fan-out | 不作为权威数据；迁移期间冻结并导出必要 counter，切换后从 DB/outbox 重建 | **保留**，但启用 ACL/TLS、内网绑定；不是 SQLite 的替代品 |
| `provider-credentials.json`、`~/.codex/auth.json`、`~/.grok/auth.json` 等 CLI 文件 | CLI/OAuth 凭据导入和刷新 | 加密导出、目标机导入并轮换；缺失 refresh token 必须重新登录 | **不以 DB 替代**，需专门凭据迁移 |
| OS keychain（keytar/Zed 等） | 本机 OAuth/API secret | 显式导出或在目标机重新授权；容器中禁用 keychain 时使用加密文件 | **不以 DB 替代** |
| `${HOME}/.shiguang-gateway/browser-login-profiles`、Chrome/CDP/Adobe 会话 | 浏览器 Provider cookie、VNC profile、Adobe session | 作为受控密钥材料单独迁移；迁移后做过期检查和 smoke；也可选择重新登录 | **不以 DB 替代** |
| `promptql-thread-sessions.json`、`notion-web-thread-sessions.json`、`auto_combo_state.json`、`backup-schedule.json`、RTK raw/meta、filter/trust 文件 | 线程粘性、自动组合、备份计划、压缩原始输出和规则 | 纳入文件 manifest；按版本导入，不能靠“重建派生数据”跳过 | 单节点保留；HA 放对象存储/配置库 |
| Tailscale/cloudflared/ngrok 状态、嵌入式服务安装目录/二进制 | 隧道和 9Router/CLIProxyAPI/Mux/Bifrost/Dario 生命周期 | 不从 SQLite 推断；重新安装并导入各自 token/config，记录版本和 checksum | **替换为自有部署制品**，运行时不得指向官方 Orbit |
| Provider 上游 API/OAuth/搜索/对象存储 | 实际模型、登录和外部数据来源 | 继续使用用户配置的上游；将 endpoint/凭据纳入自有配置和 egress allowlist | **不属于官方 Orbit 依赖**，不能误称为完全离线 |

因此必须把迁移结果分为三类：

1. **可由本项目完整接管**：官方 Orbit 自有的 DB 行、DB 索引/触发器、请求制品、配置文件、任务和规则文件。
2. **需要单独导入或重新授权**：OS keychain、CLI auth、浏览器 profile、隧道 token、嵌入式服务二进制及其配置。
3. **本来就不应同步**：运行中的连接、WS/SSE、进程锁、内存队列、Redis 临时 key；这些必须在新实例重建。

只有第 1 类全部导入、 第 2 类全部完成“导入或明确重新授权”，并通过第 7 节数据/凭据门禁，才能称为“数据同步完成”。

## 3. 当前依赖与风险

| 发现 | 证据 | 影响 |
|---|---|---|
| 源代码来源 | 已将 `src/app/api`、领域、DB、协议和 middleware 纳入 `packages/gateway-runtime`，并将本地 import 重写为相对路径 | 运行时只加载本仓库内容；发布前仍需完成许可证/来源审查 |
| 路由覆盖 | `runtimeCatchall.ts` 动态匹配并执行全部本地 route，审查脚本逐路径和 HTTP method 比较参考/本地集合 | 仍需按发布清单补齐每个 route 的行为契约和真实 provider smoke |
| 数据同步 | `scripts/import-source-data.mjs` 支持冷快照复制、SQLite integrity check、逐文件 SHA-256 manifest 和可恢复替换；`verify-imported-data.mjs` 校验源/目标文件集合、不可变文件 hash、SQLite 和关键表 | 本机快照及 Docker acceptance 已完成；生产目标仍需执行同一校验 |
| 凭据与外部状态 | importer 不复制进程锁/内存队列；CLI、keychain、浏览器 profile、隧道 token 需要单独导入或重新授权 | 目标机必须逐 Provider 记录解密/刷新/smoke 结果 |
| 运行时依赖 | NAS proxy、旧官方 host、兼容路由和 sibling import 已删除；Admin live WS 默认同源本地地址 | Provider 上游 API 仍按用户配置访问，这不属于官方 Orbit 运行时依赖 |

## 4. 目标应用与包拆分

### 4.1 可部署应用

说明：下表中的 `apps/admin` 是仓库当前已有的管理台，原地保留并继续演进，不新建第二套
Admin。其余应用均是独立进程：端口、信号处理和 surface 配置由各自 `apps/*/src/index.ts`
负责；`packages/server-runtime` 只提供 NestJS/Fastify 应用工厂与共享 HTTP 装配，业务实现
由 `packages/gateway-runtime` 提供。

| 应用 | 首要职责 | 对外端口/边界 | 依赖 |
|---|---|---|---|
| `apps/edge-gateway` | OpenAI/Anthropic/Gemini/Ollama 兼容 API、认证、限流、请求 admission、路由执行 | 443（内部 `/v1/*`、`/a2a`、MCP transport） | gateway-core、routing-domain、provider-runtime、DB/Redis |
| `apps/control-api` | Admin 管理 API、RBAC、CRUD、导入导出、配置和审计 | 443 `/api/*` | contracts、control-domain、DB、object store |
| `apps/realtime` | live dashboard、Responses WS、MCP SSE/Streamable HTTP、A2A stream、服务日志 SSE | 443 upgrade/SSE（内部可拆 20132） | event-bus、task-runtime、auth |
| `apps/worker` | 模型/价格/配额/健康同步、jobs、evals、webhooks、radar、清理和备份 | 无公网端口 | scheduler、provider-runtime、DB、Redis |
| `apps/admin`（现有，保留） | 当前 React/Vite 管理台；原地改造，只访问同源 `/api`、`/v1` 和 `/live-ws`，不再创建第二套管理台 | 静态资源 | contracts、ui |
| `apps/importer` | 参考实例快照导入、JSON/SQLite 校验、差异报告和回滚 | CLI | migration、persistence、crypto |

当前交付采用 `edge-gateway`、`control-api`、`realtime`、`worker`、`importer`、`admin`
六个显式镜像 target。每个服务独立容器、独立健康检查和独立扩缩容；共享的只是版本化
workspace 包，不共享进程启动器。

### 4.2 当前实际共享包

```text
packages/
  config/             # 环境变量与运行配置
  contracts/          # 前后端共享 API 类型/契约
  ui/                 # 管理台共享 UI 导出
  gateway-runtime/    # 当前领域实现、API route handlers、DB、协议、后台服务
  server-runtime/     # NestJS/Fastify 应用工厂、中间件、路由装配、引擎适配
```

包内禁止引用 `apps/*`，应用只能通过包接口组合；Provider executor 不允许直接写管理
数据库，所有写入通过 `persistence` 和 outbox 完成。

### 4.3 基础设施

**当前执行状态（2026-09-05）**：`deploy/docker-compose.infrastructure.yml` 已提供独立
PostgreSQL 16 与 Redis 8 服务及持久卷；应用 compose 通过共享内网使用 Redis（限流、配额和
事件缓存）。SQLite 冷快照仍是当前运行时权威库，PostgreSQL 仅接收一次性转换数据，直到
持久化仓储、事务、FTS/vector 重建和全量接口验收门禁通过后才允许切换。该状态不是双写或
兼容层，切换前不会把 PostgreSQL 伪装成已生效的数据源。

- **默认单节点**：SQLite WAL + 本地 `/data` volume + worker 同进程；保留官方导入的
  schema 和迁移语义。
- **生产 HA（第二阶段，需先完成适配和压测）**：PostgreSQL 16（控制面、用量、任务）、
  Redis（限流、分布式锁、事件）、S3 兼容对象存储（日志 artifact、备份、上传文件）、
  可选 Qdrant（memory/vector）、Playwright Chromium sidecar（浏览器 Provider）、FFmpeg
  sidecar（modality bridge）。这不是官方 Orbit 的现成部署能力：官方 Docker 指南明确是
  单 SQLite writer，多个副本共享 SQLite 不支持，外部 Postgres/多写 HA 仍需自行完成
  adapter、migration、锁和一致性验证。因此 P5 前不能把 PostgreSQL 写成已可直接替换。
- **入口**：Caddy/Nginx/云负载均衡终止 TLS；同源转发 `/api`、`/v1`、WS、SSE；禁止把
  provider key、JWT secret、导入密钥放到 Admin bundle。
- **可观测性**：OpenTelemetry trace/span、Prometheus metrics、结构化 JSON log，所有
  请求携带 `X-Request-Id`；健康分为 liveness、readiness、dependency health、provider health。

## 5. 数据迁移与初始同步

### 5.1 权威策略与“全量同步”判定

完整迁移使用官方实例的 SQLite 冷快照（包含 WAL checkpoint 后的主库）作为**数据库**权威；
API config bundle 只用于抽样/选择性恢复，不能替代 usage、audit、cache、任务和内部状态。
一次性 importer 可以读取官方 API 或挂载的文件，但独立实例启动后不得保留该 target、
管理 key 或 DNS 可达性。

本项目只有在下面四个清单都为 PASS 时，才可以对外宣称“脱离官方 Orbit 且数据已同步”：

1. **代码独立**：运行时无 `../Orbit`、官方 host、NAS proxy 或官方 API 调用；网络 deny
   官方地址后，核心 API、Admin、WS/SSE、worker、嵌入式服务仍可用。
2. **路由等价**：官方 689 个 API route、9 个根 route、102 个 API 组都有本地契约、owner 和测试；删除项
   有批准的 replacement，不以“当前 UI 没用到”作为遗漏理由。
3. **数据完整**：SQLite 全库 + DB/请求 artifact + 规则/任务 JSON + 可选 Qdrant collection
   均有 SHA-256 manifest、逐表/逐对象校验和与恢复演练；Redis 仅重建临时状态。
4. **凭据可用**：每个 Provider 的 API key/OAuth refresh/CLI token/browser session 在目标机
   已导入或完成重新授权，并通过真实请求 smoke；仅复制加密字段但无法解密不算同步。

“SQLite 文件已复制”只能证明数据库迁移完成，不能证明全部数据或全部能力完成。

### 5.2 导入步骤

1. **冻结**：维护窗口内停止官方写入和后台 job，等待请求/WS/SSE 排空。
2. **快照**：执行 `PRAGMA wal_checkpoint(TRUNCATE)`、`PRAGMA integrity_check`，复制
   `storage.sqlite`、`db_backups/`、`log.txt`、`${DATA_DIR}/call_logs/`、规则/任务 JSON、
   RTK raw/meta 和浏览器/Provider 会话目录，生成逐对象 SHA-256 manifest 和源版本。
3. **密钥准备**：显式录入 `API_KEY_SECRET`、`STORAGE_ENCRYPTION_KEY` 及版本；同时导出
   `provider-credentials.json`、CLI auth、OS keychain 可迁移项和隧道/嵌入式服务 token。
   若密钥不可迁移，必须在导入阶段用官方密钥解密后用新密钥重加密，或由管理员重新授权；
   禁止把无法解密的密文当成可用凭据。
4. **schema 导入**：按官方 169 个 migration 的顺序在目标库执行；记录 source migration
   hash，禁止跳过中间 migration 或用 `CREATE TABLE IF NOT EXISTS` 掩盖漂移。
5. **数据导入**：先导入 settings/keys/providers/models/combos，再导入 quota/routing，
   最后导入 logs/cache/tasks；每批使用事务、外键检查和幂等 upsert。
6. **派生数据重建**：FTS/vector index、聚合表、provider model cache、health/breaker
   runtime state、Redis counters、webhook outbox 必须按规则重建并标记时间点；重建前后的
   row/object count、embedding model、向量维度和时间点必须写入 manifest。
7. **验证**：逐表行数、主键集合、关键列 hash、外键 orphan、解密 smoke、模型/Provider
   数量、API key scope、combo 顺序、最近日志和任务状态全部对比；差异必须有批准记录。
8. **影子运行**：同一组脱敏请求同时发往官方和独立实例，对比 HTTP status、错误 code、
   SSE event 序列、usage、routing trace、fallback 次序和副作用。
9. **切换**：先将独立实例设为 read/write，官方设为 read-only；观察一个完整配额窗口和
   至少 24 小时后台任务，再切 DNS/反向代理。
10. **断依赖**：删除 `SHIGUANG_GATEWAY_NAS_*`、旧管理 key、官方 host 配置和 proxy route；
    防火墙 egress deny 官方 Orbit 地址；保留加密只读归档用于回滚，不作为运行时依赖。

### 5.3 回滚条件

出现任一条件立即切回：P0/P1 API route 非 2xx/错误语义漂移、Provider 凭据解密失败、
usage 或 quota 差异超过 0.1%、任务丢失/重复、WS/SSE 事件顺序破坏、审计缺失、官方
地址仍被访问。回滚只切流量，不覆盖目标数据库；保留目标增量 outbox 供人工合并。

## 6. 分阶段执行计划

| 阶段 | 交付 | 退出条件 |
|---|---|---|
| P0 盘点与冻结 | route manifest、schema manifest、provider/executor manifest、契约版本、许可证清单 | 689 route 文件和 102 组均有 owner/分类 |
| P1 Clean-room core | 将 `src/domain`、`src/sse`、`open-sse`、DB、OAuth、security 迁入 packages；移除 sibling path | 无 `../Orbit`、NAS、官方 host；核心 `/v1` smoke 通过 |
| P2 控制面等价 | 迁移全部 `/api/*`，Admin 所有 query/mutation 改为同源 contracts | 每个 route 有 contract test，禁止 mock fallback |
| P3 数据导入 | importer、密钥轮换、schema parity、差异报告、回滚 | 逐表/逐 key/逐 combo/逐任务验证通过 |
| P4 影子与切换 | 双写 outbox、shadow compare、24h soak、断网验证 | 官方 egress deny 后全部功能仍可用 |
| P5 拆容器 | realtime/worker 独立扩容、Postgres/Redis/S3、备份恢复 | 故障演练、重启/升级/恢复 RTO/RPO 达标 |

每阶段都要保留一个可运行 tag；不要在 P1 未完成前继续增加新的 UI feature。

## 7. 自动审查与验收门禁

已新增 `scripts/audit-gateway-independence.mjs` 和根脚本：

```bash
pnpm audit:gateway-independence
# 或：node scripts/audit-gateway-independence.mjs --strict
```

脚本只读官方目录，检查：

- 官方 route 文件数、一级 API 组与本地 API route manifest；
- 运行时代码中的 `../Orbit`、`@/` sibling shim、NAS proxy/target、官方 host；
- 本地 API 的 mock/baseline/fixed fallback；
- 缺失 API 组清单和具体违规文件。

P1 之后应继续增加以下门禁：

1. **Route parity**：官方每个 method/path 都能在 `contracts/route-manifest.json` 找到，
   允许删除必须有明确 replacement 和批准编号。
2. **Schema parity**：官方 migration hash、表/索引/触发器/FTS/vector 对目标一致。
3. **Contract tests**：对每个 route 运行 status、错误 envelope、鉴权、CSRF、分页、
   SSE/WS、写副作用测试；公共 `/v1` 还要跑 OpenAI/Anthropic/Gemini/Ollama client。
4. **Provider matrix**：每类 executor 至少一个真实 provider；OAuth refresh、429/401
   fallback、模型发现、流式 tool call、图片/音频/视频分别有 smoke。
5. **Data fidelity**：导入前后逐表 row count/PK hash、关键配置 hash、凭据解密、quota
   counter、combo 顺序、最近 1000 条日志和未完成 task 对比；同时校验 `call_logs/`、规则
   JSON、浏览器 profile、CLI auth 和可选 Qdrant collection 的对象清单。
6. **No fake data**：生产构建禁止 `mockEntries`、`fallbackDashboard`、`baseline` 等
   业务返回；无数据必须返回空集合和明确 `source=live|unavailable`。
7. **Network isolation**：容器 egress 审计 + DNS deny；Admin bundle 不能出现官方 URL、
   NAS key 或内部 host；运行时抓包确认只访问本地/配置的 Provider。
8. **Operational**：备份恢复、滚动升级、SQLite WAL checkpoint、Redis/Postgres 故障、
   worker 重复投递、WS/SSE 重连、浏览器 sidecar 崩溃均有演练记录。
9. **Credential fidelity**：逐 Provider 记录 credential source（DB/file/keychain/browser）、
   过期时间、是否可刷新和最后一次真实 smoke 结果；任何“需要手工重新登录”的项都必须在
   发布清单中显式列出并由负责人签字。

### 当前自动审查结果（2026-09-04）

```text
official API route files: 689
official root route files: 9
official API groups: 102
target API route files: 22 implementation files
target Fastify handlers: 185
local runtime API route files: 691 (689 parity + 2 additive media-cache routes)
local runtime root route files: 9
route path mismatches: 0
missing API groups: 0
forbidden Orbit/NAS/official references: 0
mock/baseline fallback files: 0
status: PASS
```

因此代码层面的独立部署门禁已通过。本机真实快照和 Docker acceptance 的文件、数据库、原生
依赖、接口隔离与 worker 校验见下节。生产目标仍需逐 Provider 真实上游 smoke、外部凭据/浏览器/
隧道状态处理、断外部源网络和恢复演练；这些完成前不能把发布标记为正式完成。

### 7.1 NAS 真实冷快照验证记录（2026-09-05）

已从 NAS `/volume1/docker/omniroute/data` 在维护窗口停写后制作冷快照，并对冻结源数据目录执行：

```bash
node scripts/import-source-data.mjs \
  --source-data-dir /path/to/frozen-source-data \
  --target-data-dir /path/to/independent-data --replace
pnpm verify:imported-data /path/to/frozen-source-data /path/to/independent-data
```

结果：导入 2,237 个文件；快照包含 SQLite/WAL/SHM、6 天调用日志、备份、CLI/OAuth 状态、
CLIProxyAPI 二进制和 TLS 客户端制品。runtime 启动后会应用 schema/index migration 并更新动态
状态，因此整库字节 SHA 会变化；验收改用源表内容包含校验（排除明确的运行时可变表/列），当前
`matchingSourceTableContent=true`、SQLite `integrity_check=ok`。环境密钥文件也随快照保留；初始快照
源快照包含 `provider_connections=15`、`api_keys=4`、`combos=3`、`usage_history=685`、
`call_logs=18,566`、`jobs=3`、`job_runs=12,141`；
任务/事件表 (`jobs`、`job_runs`、`a2a_tasks`) 也随库保留。启动后的 migration/worker 会新增
schema 默认项并产生运行记录（当前 acceptance 目标库为 `key_value=498`、`job_runs=12,143`；该计数会随
worker 运行增长），不覆盖源表已有内容。
随后在同一 NAS 维护窗口重新截取官方当前源数据并导入全新目标目录，复核快照包含
`call_logs=18,613`、`job_runs=12,198`；冷导入 `verify-imported-data` 仍为 PASS，说明新增运行记录
也能按同一流程完整迁移。
使用快照内 `STORAGE_ENCRYPTION_KEY` 启动独立 edge/control/realtime/worker，健康检查均为 200，
控制面未授权接口按预期返回 401；linux/amd64 镜像中的 CLIProxyAPI `/healthz` 返回 200。
冷导入校验为 PASS（文件集合、SQLite integrity、源表内容均通过）。

#### Qoder CLI 的真实部署边界

官方 Qoder 集成不是网关内置实现。`qoder` executor 在 PAT（`pt-*`）连接上通过 stdin/stdout
启动本机 `qodercli`，使用独立的 `--config-dir` 保存登录、模型缓存和运行日志；WASM 签名、PAT
到短期 job token 的交换以及 Qoder 请求协议由该官方 CLI 完成。非 PAT 的 OAuth/API key 连接走
DashScope 兼容 HTTP 接口，不经过 CLI。可执行文件通过 PATH 或 `CLI_QODER_BIN` 查找。

标准官方 `orbit` 镜像和当前 NAS 官方容器均未发现 `qodercli`。NAS 历史配置曾引用自定义镜像
`local/omniroute-qodercli:3.8.50-qodercli-1.1.34-r1`，快照日志记录过 `cli_version=1.1.34`、
`/usr/local/bin/qodercli` 的运行；该二进制不在 SQLite、数据快照或普通 Compose volume 中，
当前官方镜像也不含它。因此迁移 importer 只能迁移 Qoder 配置、token、缓存和日志，不能凭快照
恢复 CLI 程序本身。独立发布必须把经许可取得的 qodercli 安装到镜像/宿主机并固定版本，或设置
`CLI_QODER_BIN` 指向可执行文件；在此之前 Qoder 连接必须保持发布门禁失败。

该结果证明“快照可导入且凭据密钥匹配”。Docker acceptance 已使用同一快照、同一密钥完成
导入和重启恢复；生产切换仍需在目标 registry/主机执行同一流程，并完成每个 Provider 的
真实上游 smoke、任务/日志恢复演练和断官方网络验证。

### 7.2 本轮自动门禁

- `pnpm audit:gateway-independence`：PASS（689 API parity + 2 个登记的本地 media-cache 扩展、9 根路由，102 组，0 外部/NAS 引用）。
- `pnpm audit:route-contracts`：PASS（689 个 parity route 文件的 HTTP method export 集合与参考快照一致；2 个 media-cache 扩展单独登记）。
- `pnpm audit:admin-routes`：PASS（官方 116 个 dashboard 页面全部有本地 React Router 入口；本地共 131 条路由，包含兼容别名和本地扩展）。插件配置页已接入真实 GET/PUT 配置接口，插件启用/停用使用真实 activate/deactivate 接口。
- 上述两个 parity gate 已内置冻结的 route-path/root-path/HTTP-method SHA-256 基线；CI、镜像发布机
  或生产主机不存在同级 `../Orbit` 时仍可独立验收并检测路由漂移。本地显式提供参考源码时继续
  逐文件对比，发布流程不再对官方 checkout 存在构建时依赖。
- `pnpm typecheck`、`pnpm build`：PASS（12 个 typecheck 任务、8 个 build 任务）。
- `pnpm --filter @shiguang-gateway/server-runtime test`：PASS（5/5 CSRF 会话轮换、组织隔离和本地 cookie 隔离用例）。
- `pnpm audit:brand`：PASS（源码、部署配置、镜像/容器命名和可发布目录无旧项目标识）。
- `pnpm smoke:route-imports`：PASS（700 个本地 route 文件全部可导入；`docs/api/search`
  已改为本地 Markdown 文件索引，不依赖 Next/Fumadocs 虚拟 loader）。
- `pnpm smoke:agent-skills`：PASS（46 个 `SKILL.md` 从运行时包本地读取，无官方仓库回退）。
- `pnpm smoke:split-deployment`：PASS（edge/control/realtime/live WS，含 `/readyz` 和
  `/.well-known/agent.json`）。
- `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/path/to/frozen pnpm smoke:real-data`：PASS（从真实冷快照启动
  独立 edge/control，鉴权读取迁移后的 provider connections、quota pools/groups、evals，
  并返回快照目录当前约 476 个模型；目录中的模型同步可能随 catalog 变化，不能把固定数量
  当作契约）。
- `pnpm smoke:worker`：PASS（32 个后台 scheduler/registry 模块均实际启动，使用本地
  `SHIGUANG_GATEWAY_BASE_URL`，未访问官方/NAS endpoint）。
- `runtime-bootstrap`：edge/control 在各自进程启动时均完成运行时设置、Quota fetcher、
  Guardrails、Skills、Memory backend 和审计初始化；配置热加载不会在 HTTP 进程重复启动
  worker 专属的网络同步任务。
- `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=<source-data-dir> pnpm smoke:container-deployment`：PASS。
  acceptance stack 使用独立 linux/amd64 镜像启动 edge/control/realtime/worker，返回动态模型目录
  `models=1,671`，验证 `provider_connections=15`、`api_keys=4`、`key_value=498`、`jobs=3`、
  `job_runs=12,143`、A2A/webhook 表，
  `/v1/models` 和管理 API，边缘/控制面隔离，20132 TCP，32 个 scheduler，以及无 Corepack、
  无官方地址/解密失败日志。
- `verify-imported-data`：冷导入启动前 PASS（WAL/SHM/日志按 manifest 标记为运行时可变；非
  SQLite 文件逐个 hash 一致，源表已有内容在目标库中全部保留）。服务启动后会按设计更新
  provider 健康字段、OAuth token、审计/模型目录、缓存和运行记录；启动后验收使用服务 smoke
  与表计数/完整性检查，不把这些预期运行时写入误判为冷快照丢失。
- `verify-external-state`：默认模式 PASS（共享 `shiguang-gateway_home` 卷中的 allowlist 状态逐项校验；本机实际
  复制 `.codex/auth.json`，其余源端不存在的项保持显式 `reauth-or-provide-source`，不会把未存在的凭据
  当作已迁移）。如部署策略要求所有可选凭据都存在，可额外运行 `--require-all`；该策略不应把源端
  本来不存在的文件误报为数据丢失。
- `audit:provider-config`：当前验收卷已通过配置审查。源快照中唯一启用的
  `openai-compatible-chat-*` 连接 `89edfc23-3e44-40e8-8a29-3a4cffafe575` 原始缺少
  `providerSpecificData.baseUrl`；根据项目迁移记录确认其 NaraRouter 上游为
  `https://router.bynara.id/v1`，`providerSpecificData.baseUrl` 已写入目标库并通过 HTTPS 校验。
  如果新源快照缺少 endpoint，部署时必须通过不含密钥的 provider overlay 写入，并让覆盖文件
  SHA-256 与实际连接 ID 写入 manifest。导入器仍拒绝未经 HTTPS 校验的 endpoint，不会猜测任何
  外部地址。
- CLI machine-token、API key 设备列表和 usage-limit 状态均已接入本地 runtime，不再使用永远
  返回 false、空设备列表或固定 0 花费的适配器。
- 真实 Provider 批量测试：NAS 独立实例通过 13/14；Volcengine、SenseNova、DeepSeek Web、
  LM Arena、Gemini Web、OpenCode、Kimi、Nara、Free AI、Codex 和 3 个 Google OAuth 连接均通过。
  唯一失败是源 NAS 同样失败的 Qoder 连接：主机没有 `qodercli` 可执行文件，必须先安装 qodercli
  或重新授权，不能用伪造 CLI 绕过。
- `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=<target-data-dir> pnpm smoke:provider-matrix` 已固化为发布门禁；
  切换前必须在目标 NAS 上重跑，Qoder 未补齐时门禁保持失败。
- Docker 镜像已实际构建并运行：`shiguang-gateway:local`（linux/amd64），当前本地 image digest
  `sha256:8d99f24283bd9534365a7e4a725d4c0e163a2dd0cc796e2b0463d6745a36a84d`。镜像内已编译并
  验证 `better-sqlite3` + `sqlite-vec`，并包含 `onnxruntime-node`；发布到 registry 时必须
  重新记录目标 digest（不要直接复用本地 tag）。
- 批量文件上传已通过真实 multipart 验证（`POST /v1/files` 返回 file 对象，随后真实 DELETE
  清理测试文件）；独立 Fastify 入口现以原始 multipart 边界透传到 runtime `Request.formData()`，
  并将入口 body limit 与 runtime 的 512 MiB 文件校验对齐。
- `pnpm smoke:split-deployment`：PASS（独立 edge、control、realtime、live WS 进程）。
- `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=... pnpm smoke:real-data`：PASS（从导入快照提供 488 个模型）。
- `pnpm smoke:worker`：PASS（全部 scheduler 模块加载并启动，使用本地 base URL）。
- 媒体缓存统计/清理补充为本地 `/api/media/cache/stats` 与 `/api/media/cache/purge`；它们是
  独立实例的增量能力，不改变官方 689-route parity 基线，并由独立性审查脚本显式登记为
  additive local API extensions。

## 8. 已同步更新的现有文件

独立化实施开始后，应删除或改写旧边界，避免文档和配置继续诱导回官方：

- `README.md`：改为独立镜像和 importer 说明。
- `MIGRATION_PLAN.md`、`MIGRATION_SPEC.md`：从“底层 Orbit 不动”改为“clean-room domain package + parity gate”。
- `docker-compose.yml`、`deploy/NAS-DEPLOY.md`、`deploy/gateway-caddyfile.md`：移除 `SHIGUANG_GATEWAY_NAS_*`，加入 DB/Redis/object-store、egress deny、health/readiness。
- `packages/server-runtime/tsconfig.json`、`packages/server-runtime/src/lib/engine.ts`、`app.ts`：替换为自有领域包导入，删除快照依赖和兼容启动器。
- `apps/admin/vite.config.ts`、`entities/live.ts`：只使用同源 live endpoint，不保留 `100.87.115.78:20132`。
- `packages/config/src/index.ts`：移除 `orbitApiUrl`，改成 `publicBaseUrl`、`internalServiceUrls` 和显式 Provider endpoints。

## 9. 参考资料与依据

- 本地官方源码：`../Orbit/docs/architecture/ARCHITECTURE.md`、`../Orbit/docs/reference/API_REFERENCE.md`、
  `../Orbit/docs/reference/ENVIRONMENT.md`、`../Orbit/src/lib/db/migrations/`。
- 官方 release 架构说明：[ShiguangGateway Architecture](https://github.com/diegosouzapw/ShiguangGateway/blob/release/v3.8.51/docs/architecture/ARCHITECTURE.md)。
- 官方 API 清单：[API Reference](https://github.com/diegosouzapw/ShiguangGateway/blob/release/v3.8.51/docs/reference/API_REFERENCE.md)。
- 官方 Docker/WAL/volume 说明：[Docker Guide](https://github.com/diegosouzapw/ShiguangGateway/blob/release/v3.8.51/docs/guides/DOCKER_GUIDE.md)。
- 官方 A2A task/stream/Agent Card 说明：[A2A README](https://github.com/diegosouzapw/ShiguangGateway/blob/release/v3.8.50/src/lib/a2a/README.md)。
