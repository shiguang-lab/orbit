# ShiguangGateway 菜单迁移计划

> 所有页面必须遵守 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md) 的 Web/API 联合迁移规范。
> 迁移是对原 UI 和接口行为的等价翻译，只允许排列、对齐、大小等小范围优化；业务能力直接落在本仓库的领域包中。
>
> API 路由跟随菜单一起迁移。每迁移一个**菜单单元** = 「前端页面 + 对应 control 路由 + 领域服务」一次做完，
> 该菜单入口立即完整可用(不再是 placeholder)。
> 迁移顺序按依赖关系：先核心 CRUD → 再数据/分析 → 再监控 → 再长尾能力 → 再配置。

## 当前状态

### App 边界迁移（2026-09-07）

- ✅ 已移除两个混合运行时包；目录与 workspace 包名均已退役。
- ✅ `gateway` 与 `control` 使用各自固定的 bootstrap，不再由入口传入 `surface` 参数。
- ✅ `realtime`、`worker` 只通过 `core` 的显式子路径加载实时能力和后台调度器。
- ✅ 所有 HTTP transport 已物理归入 `apps/control` 或 `apps/gateway`；`packages/*` 中不存在 `route.ts`、app route catalog 或兼容 dispatcher。
- ✅ control、edge、realtime、worker 分别持有自己的 listener、timer、watcher、内存状态和关闭链；跨进程运行时状态只通过认证、版本化 command 契约访问。
- ✅ 路由 parity、HTTP method、鉴权边界和部署拆分由严格审计持续验证；当前 116 个官方 dashboard page 均有本地 React Router 入口。
- ✅ control 的完整 `/api/keys/**` 管理域（密钥 CRUD、设备、重生成、明文查看、用量限制、分组、成员与权限）已物理迁入 `apps/control/src/keys/handlers`，并完成 control 401 / edge 404 的拆分部署验收。
- ✅ gateway 的 `/api/v1/files*` handler 已物理迁入 `apps/gateway/src/files/handlers`，改用 app-owned Response/CORS 适配层；文件持久化仍通过显式 core DB 合约提供。
- ✅ `db-schema` 收敛跨 app 的表名/所有权元数据；查询与写入仍由所属 app 的领域服务负责。
- ✅ 纯出站 URL/SSRF 校验原语已从 `core/shared/network` 提取到 `packages/utils/src/network`；依赖数据库/feature flag 的 guard policy 仍由领域包持有。
- ✅ 每个 app 的 typecheck、部署 smoke 与边界审计已纳入逐域验收；详见 [`DOMAIN_BOUNDARIES.md`](./DOMAIN_BOUNDARIES.md)。

- **已迁移**：官方 dashboard page 路径、本地管理 API 与 edge 数据面路由均已落入对应 app；路由清单以自动审计生成结果为准，不再维护手写“剩余路由”数字。
- **发布中验证**：OAuth/CLI/浏览器授权与 Provider 上游能力需要在目标环境使用真实凭据逐项 smoke；缺少凭据不能用 mock 或假数据降级为通过。
- **持续验收**：新增菜单单元继续按本规范完成 Web + control/edge 联合变更，并同时更新 owner、契约和测试。
- **迁移单元模式**：见 `README.md`「迁移新增一个路由组的模式」

## 菜单分组与迁移顺序

### P1 核心网关组(先做，Provider 是核心)
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 1 | Endpoints | `/dashboard/endpoint` | `/api/endpoint*`, `/api/tunnels/*` | 端点/隧道 |
| 2 | API Manager | `/dashboard/api-manager` | `/api/keys*`, `/api/keys/groups*` | key 全生命周期+弹窗 [已迁移] |
| 3 | Providers | `/dashboard/providers` + `/[id]` + `/services` + `/new` | `/api/providers*`(全量), `/api/provider-nodes`, `/api/provider-models`, `/api/provider-metrics` | **最重**: 列表/详情/14+弹窗/onboarding 向导 |
| 4 | Combos | `/dashboard/combos` + `/[id]` | `/api/combos*`, `/api/combos/builder/options`, `/api/combos/metrics`, `/api/combos/duplicate`, `/api/combos/test`, `/api/combos/auto` | **已迁移**: 列表/向导与专家编辑器/Auto目录/Kimi预设/LKGP面板/链路测试/控制中心监控 |
| 5 | Provider Quota | `/dashboard/quota` + `/dashboard/costs/quota-share` | `/api/quota/*`, `/api/usage/provider-limits`, `/api/usage/quota` | **已迁移**: 配额监控/USD与速率约束/双视图/共享池向导 |

### P2 分析/成本组(数据驱动)
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 6 | Usage | `/dashboard/analytics` + 7 子 Tab | `/api/usage/analytics`, `/api/usage/call-logs`, `/api/usage/utilization`, `/api/analytics/*` | 7 Tab 全量 |
| 7 | Costs | `/dashboard/costs` + `/pricing` + `/budget` | `/api/usage/budget*`, `/api/usage/provider-window-costs`, `/api/usage/provider-limits` | 预算/成本 |
| 8 | Cache | `/dashboard/cache` + `/cache/media` | `/api/cache*`, `/api/cache/entries`, `/api/cache/reasoning`, `/api/cache/stats` | 缓存统计 |
| 9 | Provider Stats | `/dashboard/provider-stats` | `/api/provider-stats`, `/api/usage/requests-by-provider-date` | 统计卡 |

### P3 监控/日志组
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 10 | Activity | `/dashboard/activity` | `/api/compliance/audit-log` | 活动流 |
| 11 | Request Logs | `/dashboard/logs` + `/proxy` + `/console` + `/timeline` | `/api/usage/call-logs`, `/api/usage/proxy-logs`, `/api/logs/[id]`, `/api/logs/console`, `/api/logs/export` | 日志 4 页+导出 |
| 12 | Conversations | `/dashboard/conversations` | `/api/conversations*`, `/api/sessions` | 会话查看器 |
| 13 | Audit | `/dashboard/audit` + `/audit/mcp` + `/audit/a2a` | `/api/compliance/audit-log`, `/api/mcp/audit*`, `/api/a2a/tasks` | 审计 3 页 |
| 14 | Health | `/dashboard/health` | `/api/monitoring/health`, `/api/db/health`, `/api/providers/health-matrix`, `/api/providers/health-autopilot`, `/api/resilience/model-cooldowns`, `/api/rate-limits` | 健康矩阵 |
| 15 | Runtime | `/dashboard/runtime` + `/resilience/connections` | `/api/resilience/connections`, `/api/monitoring/health`, `/api/telemetry/summary` | 运行时/弹性 |

### P4 代理能力组(长尾功能)
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 16 | MCP | `/dashboard/mcp` | `/api/mcp/status`, `/api/mcp/tools`, `/api/settings`(mcp 开关) | 30s 轮询 |
| 17 | A2A | `/dashboard/a2a` | `/api/a2a/status`, `/api/a2a/tasks` | 30s 轮询 |
| 18 | Memory | `/dashboard/memory` | `/api/memory*`, `/api/memory/engine-status`, `/api/memory/health` | 记忆系统 |
| 19 | Plugins | `/dashboard/plugins` + `/plugins/[name]/config` | `/api/plugins*`, `/api/plugins/[name]/config` | schema 动态表单 |
| 20 | Batch | `/dashboard/batch` + `/batch/files` | `/api/v1/batches*`, `/api/v1/files*` | 4 步向导+弹窗 |
| 21 | CLI 工具/Agents/ACP/Cloud | `/dashboard/cli-code*`, `/cli-agents*`, `/acp-agents`, `/cloud-agents`, `/conductor` | `/api/cli-tools/*`, `/api/cli/*`, `/api/acp/agents`, `/api/cloud/*`, `/api/conductor/*` | 工具群 |
| 22 | Agent Bridge/Inspector/Discovery | `/dashboard/tools/agent-bridge`, `/tools/traffic-inspector`, `/discovery` | `/api/tools/agent-bridge*`, `/api/tools/traffic-inspector*`(WS), `/api/discovery/*` | 代理桥/抓包/发现 |
| 23 | Translator/Playground/Search | `/dashboard/translator`, `/playground`, `/search-tools` | `/api/translator/*`, `/api/playground/*`, `/api/search/*` | dev 工具 |

### P5 配置组
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 24 | General | `/dashboard/settings/general` | `/api/settings`, `/api/settings/database*`, `/api/db-backups*`, `/api/settings/export-json`/`import-json` | 系统存储/备份 |
| 25 | Appearance/AI/Routing/Resilience/Advanced | `/dashboard/settings/{appearance,ai,routing,resilience,advanced}` | `/api/settings*`(对应子项), `/api/settings/feature-flags`, `/api/settings/model-aliases`, `/api/settings/reasoning-routing-rules`, `/api/settings/combo-defaults` | 设置聚合 |
| 26 | Security | `/dashboard/settings/security` | `/api/settings`(security 项), `/api/auth/status`, `/api/settings/require-login`, `/api/settings/authz-inventory` | 安全 |
| 27 | Access Tokens/Feature Flags/Cache/Sidebar | `/dashboard/settings/{access-tokens,feature-flags,cache,sidebar}` | `/api/settings/access-tokens`, `/api/settings/feature-flags`, `/api/settings/cache-config`, `/api/settings/sidebar` | 配置子页 |
| 28 | Compression/Context 全家 | `/dashboard/context/*`, `/dashboard/compression/*` | `/api/context/*`, `/api/compression/*`, `/api/settings/compression*` | 压缩引擎 13 页 |
| 29 | System/Proxy | `/dashboard/system/proxy` | `/api/settings/proxy*`, `/api/settings/proxies*`, `/api/settings/free-proxies*` | 代理配置 |
| 30 | Webhooks/API Endpoints | `/dashboard/webhooks`, `/api-endpoints` | `/api/webhooks*`, `/api/settings/notion`, `/api/settings/obsidian` | 集成 |

### P6 其它/收尾
| # | 菜单入口 | 页面(路由) | control/gateway 路由组 | 说明 |
|---|---|---|---|---|
| 31 | 游戏化 | `/dashboard/leaderboard`, `/profile`, `/tokens` | `/api/gamification/*`, `/api/leaderboard*`(SSE) | 排行/徽章/钱包 |
| 32 | Changelog/Docs | `/dashboard/changelog`, `/docs` | `/api/system/version`(SSE 更新), `/docs` | 更新/文档 |
| 33 | 收尾 | 全部 91 入口走查 + 弹窗功能对拍 | — | 功能等价验收 |

## 每条迁移的验收标准

1. 菜单入口可点击 → 页面渲染(非 placeholder)
2. UI、数据源、业务逻辑、状态与原项目一致，只包含规范允许的小型视觉优化
3. 页面全部业务数据来自 **control/gateway**（通过 `console→vite proxy→本地服务→领域包` 链路）
4. 页面内所有**弹窗/抽屉/向导/多步骤**功能完整(功能不能少)
5. API 服务覆盖原页面使用的全部接口，并保持响应和错误语义一致
6. 数据库模型和业务规则由本仓库维护，迁移过程中不得引入远程官方服务依赖
7. 交互密集页(providers/combos/logs/analytics)补浏览器端到端验证

## 预估

- P1(核心网关) ≈ 2-3 周 —— 最重，providers+combos 是大头
- P2(分析/成本) ≈ 1-2 周
- P3(监控/日志) ≈ 1-2 周
- P4(代理能力) ≈ 2-3 周
- P5(配置) ≈ 2-3 周
- P6(收尾) ≈ 1 周
- 合计 ≈ 10-14 周(单人)，可并行推进前端与 API 服务

## 当前收尾门禁

1. `audit:app-boundaries`、`audit:package-boundaries`、route contracts 与 DB owner/coverage 全部严格通过。
2. workspace typecheck/build 与多目标 Docker build 通过，镜像健康检查真实覆盖各进程 listener。
3. split deployment smoke 通过；生产发布再以真实凭据完成启用 Provider 的上游矩阵验证。
