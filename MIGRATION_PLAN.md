# OmniRoute 菜单迁移计划

> 所有页面必须遵守 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md) 的 Web/BFF 联合迁移规范。
> 迁移是对原 UI 和接口行为的等价翻译，只允许排列、对齐、大小等小范围优化；底层 Orbit 引擎保持不动。
>
> BFF 路由跟随菜单一起迁移。每迁移一个**菜单单元** = 「前端页面 + 对应 BFF 路由 + 引擎适配」一次做完，
> 该菜单入口立即完整可用(不再是 placeholder)。
> 迁移顺序按依赖关系：先核心 CRUD → 再数据/分析 → 再监控 → 再长尾能力 → 再配置。

## 当前状态

- **已迁移**：`/home`(首页基础页面，按 Orbit 首页结构接入 BFF)、`/dashboard/api-manager`、`/dashboard/combos`(模型组合全量 CRUD、向导/专家模式、Auto 组合目录、Kimi 预设、LKGP/智能路由面板、链路测试及 `/dashboard/combos/:id` 控制中心监控)、`/dashboard/quota` + `/dashboard/costs/quota-share`(提供者配额与限额监控、余量告警、USD/速率限额、共享池向导)
- **进行中**：`/dashboard/providers` 列表与按 Provider 类型分流的详情页已接入 Orbit catalog/连接/模型/过滤器 BFF；OAuth/CLI/浏览器授权向导、节点编辑、模型同步高级操作和其余 Providers 子路由仍按本规范补齐后再标记完成
- **待迁移**：其余菜单入口按本规范逐个完成 Web+BFF 联合迁移；未完成页面不得以“已迁移”标记
- **迁移单元模式**：见 `README.md`「迁移新增一个路由组的模式」

## 菜单分组与迁移顺序

### P1 核心网关组(先做，Provider 是核心)
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
|---|---|---|---|---|
| 1 | Endpoints | `/dashboard/endpoint` | `/api/endpoint*`, `/api/tunnels/*` | 端点/隧道 |
| 2 | API Manager | `/dashboard/api-manager` | `/api/keys*`, `/api/keys/groups*` | key 全生命周期+弹窗 [已迁移] |
| 3 | Providers | `/dashboard/providers` + `/[id]` + `/services` + `/new` | `/api/providers*`(全量), `/api/provider-nodes`, `/api/provider-models`, `/api/provider-metrics` | **最重**: 列表/详情/14+弹窗/onboarding 向导 |
| 4 | Combos | `/dashboard/combos` + `/[id]` | `/api/combos*`, `/api/combos/builder/options`, `/api/combos/metrics`, `/api/combos/duplicate`, `/api/combos/test`, `/api/combos/auto` | **已迁移**: 列表/向导与专家编辑器/Auto目录/Kimi预设/LKGP面板/链路测试/控制中心监控 |
| 5 | Provider Quota | `/dashboard/quota` + `/dashboard/costs/quota-share` | `/api/quota/*`, `/api/usage/provider-limits`, `/api/usage/quota` | **已迁移**: 配额监控/USD与速率约束/双视图/共享池向导 |

### P2 分析/成本组(数据驱动)
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
|---|---|---|---|---|
| 6 | Usage | `/dashboard/analytics` + 7 子 Tab | `/api/usage/analytics`, `/api/usage/call-logs`, `/api/usage/utilization`, `/api/analytics/*` | 7 Tab 全量 |
| 7 | Costs | `/dashboard/costs` + `/pricing` + `/budget` | `/api/usage/budget*`, `/api/usage/provider-window-costs`, `/api/usage/provider-limits` | 预算/成本 |
| 8 | Cache | `/dashboard/cache` + `/cache/media` | `/api/cache*`, `/api/cache/entries`, `/api/cache/reasoning`, `/api/cache/stats` | 缓存统计 |
| 9 | Provider Stats | `/dashboard/provider-stats` | `/api/provider-stats`, `/api/usage/requests-by-provider-date` | 统计卡 |

### P3 监控/日志组
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
|---|---|---|---|---|
| 10 | Activity | `/dashboard/activity` | `/api/compliance/audit-log` | 活动流 |
| 11 | Request Logs | `/dashboard/logs` + `/proxy` + `/console` + `/timeline` | `/api/usage/call-logs`, `/api/usage/proxy-logs`, `/api/logs/[id]`, `/api/logs/console`, `/api/logs/export` | 日志 4 页+导出 |
| 12 | Conversations | `/dashboard/conversations` | `/api/conversations*`, `/api/sessions` | 会话查看器 |
| 13 | Audit | `/dashboard/audit` + `/audit/mcp` + `/audit/a2a` | `/api/compliance/audit-log`, `/api/mcp/audit*`, `/api/a2a/tasks` | 审计 3 页 |
| 14 | Health | `/dashboard/health` | `/api/monitoring/health`, `/api/db/health`, `/api/providers/health-matrix`, `/api/providers/health-autopilot`, `/api/resilience/model-cooldowns`, `/api/rate-limits` | 健康矩阵 |
| 15 | Runtime | `/dashboard/runtime` + `/resilience/connections` | `/api/resilience/connections`, `/api/monitoring/health`, `/api/telemetry/summary` | 运行时/弹性 |

### P4 代理能力组(长尾功能)
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
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
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
|---|---|---|---|---|
| 24 | General | `/dashboard/settings/general` | `/api/settings`, `/api/settings/database*`, `/api/db-backups*`, `/api/settings/export-json`/`import-json` | 系统存储/备份 |
| 25 | Appearance/AI/Routing/Resilience/Advanced | `/dashboard/settings/{appearance,ai,routing,resilience,advanced}` | `/api/settings*`(对应子项), `/api/settings/feature-flags`, `/api/settings/model-aliases`, `/api/settings/reasoning-routing-rules`, `/api/settings/combo-defaults` | 设置聚合 |
| 26 | Security | `/dashboard/settings/security` | `/api/settings`(security 项), `/api/auth/status`, `/api/settings/require-login`, `/api/settings/authz-inventory` | 安全 |
| 27 | Access Tokens/Feature Flags/Cache/Sidebar | `/dashboard/settings/{access-tokens,feature-flags,cache,sidebar}` | `/api/settings/access-tokens`, `/api/settings/feature-flags`, `/api/settings/cache-config`, `/api/settings/sidebar` | 配置子页 |
| 28 | Compression/Context 全家 | `/dashboard/context/*`, `/dashboard/compression/*` | `/api/context/*`, `/api/compression/*`, `/api/settings/compression*` | 压缩引擎 13 页 |
| 29 | System/Proxy | `/dashboard/system/proxy` | `/api/settings/proxy*`, `/api/settings/proxies*`, `/api/settings/free-proxies*` | 代理配置 |
| 30 | Webhooks/API Endpoints | `/dashboard/webhooks`, `/api-endpoints` | `/api/webhooks*`, `/api/settings/notion`, `/api/settings/obsidian` | 集成 |

### P6 其它/收尾
| # | 菜单入口 | 页面(路由) | BFF 路由组 | 说明 |
|---|---|---|---|---|
| 31 | 游戏化 | `/dashboard/leaderboard`, `/profile`, `/tokens` | `/api/gamification/*`, `/api/leaderboard*`(SSE) | 排行/徽章/钱包 |
| 32 | Changelog/Docs | `/dashboard/changelog`, `/docs` | `/api/system/version`(SSE 更新), `/docs` | 更新/文档 |
| 33 | 收尾 | 全部 91 入口走查 + 弹窗功能对拍 | — | 功能等价验收 |

## 每条迁移的验收标准

1. 菜单入口可点击 → 页面渲染(非 placeholder)
2. UI、数据源、业务逻辑、状态与原项目一致，只包含规范允许的小型视觉优化
3. 页面全部业务数据来自 **BFF**(通过 `admin→vite proxy→BFF→引擎` 链路，非直连 Orbit)
4. 页面内所有**弹窗/抽屉/向导/多步骤**功能完整(功能不能少)
5. BFF 覆盖原页面使用的全部接口，并保持响应和错误语义一致
6. 底层 Orbit 引擎、数据库模型和业务规则不因迁移而修改
7. 交互密集页(providers/combos/logs/analytics)补浏览器端到端验证

## 预估

- P1(核心网关) ≈ 2-3 周 —— 最重，providers+combos 是大头
- P2(分析/成本) ≈ 1-2 周
- P3(监控/日志) ≈ 1-2 周
- P4(代理能力) ≈ 2-3 周
- P5(配置) ≈ 2-3 周
- P6(收尾) ≈ 1 周
- 合计 ≈ 10-14 周(单人)，可并行推进前端/BFF

## 立即开始的下一步

**P1 #2 API Manager**(比 Providers 轻，可先打通"菜单+页面+BFF 全链路"样板)：
1. BFF: `routes/keys.ts`(GET/POST /api/keys, GET/PATCH/DELETE /api/keys/[id], regenerate/reveal/devices/usage-limits)
2. 引擎: `engine.ts` 加 keys 适配器(`getApiKeys/createApiKey/...`)
3. 前端: `features/api-manager/` 页面(列表 + 创建/编辑弹窗 + 权限 scope 编辑)
4. 注册路由 + 菜单去掉 placeholder
