# shiguang-gateway-monorepo

ShiguangGateway 独立部署 monorepo（管理台 + 网关 + 控制面 + 实时服务 + worker）。

页面迁移必须遵守 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md)：Web 与本地 API 作为一个单元联合迁移，保持既有数据源、业务逻辑和 UI 行为。运行时使用仓库内的独立能力实现，不依赖外部同级源码或远程服务。

## 目标架构

```
shiguang-gateway-monorepo/
├── apps/
│   ├── admin/         # React 19 + Vite 管理台（现有，保留）
│   ├── edge-gateway/  # 对外模型协议与请求入口
│   ├── control-api/   # 管理 API、RBAC、配置和审计
│   ├── realtime/      # WebSocket/SSE 实时服务
│   ├── worker/        # 同步、定时任务和后台作业
│   └── importer/      # 冷快照导入与数据库转换 CLI
├── packages/
│   ├── gateway-runtime/ # 领域实现、API handlers、DB、协议和后台能力
│   ├── server-runtime/ # NestJS/Fastify 应用工厂、middleware 与路由装配
│   ├── contracts/    # 前后端共享的 API 类型/契约
│   ├── config/       # 共享配置
│   └── ui/           # 共享主题 token；通用组件优先复用 @shiguang2/components
├── turbo.json        # 任务编排
└── pnpm-workspace.yaml
```

## 核心设计：独立 runtime 与服务拆分

- 生产入口拆为 **edge-gateway**（模型协议）、**control-api**（管理面）、**realtime**（SSE/WS）
  和 **worker**（定时任务/后台作业）；每个 `apps/*` 都拥有自己的进程 bootstrap，
  只通过包接口复用实现。
- 服务只从 `edge-gateway`、`control-api`、`realtime`、`worker` 和 `importer` 启动；仓库不包含旧 BFF 启动器或兼容入口。
- `packages/gateway-runtime` 固化当前 API routes、领域模块、DB、SSE、MCP/A2A、安全 middleware、CLI `bin/` 和 46 个本地 skills；它是本仓库内可独立构建、运行和发布的自有源码。
- `routes/runtimeCatchall.ts` 对本地 689 个 parity API 加 2 个独立 media-cache API 和 9 个根 `route.ts` 做统一本地路由分发，显式 Fastify 适配器优先处理高频管理接口。
- `apps/importer` 将冻结快照导入独立 `shiguang-gateway_data` volume；`scripts/smoke-container-deployment.mjs` 自动验收接口隔离、数据表、原生 SQLite/vector、实时端口和全部 worker scheduler。
- 参考仓库仅作为审查基线；升级必须重新复制快照并通过 `pnpm audit:gateway-independence`。
- 发布机不需要 checkout 官方仓库：独立性/路由契约审查内置冻结 SHA-256 基线；设置
  `SHIGUANG_GATEWAY_REFERENCE_DIR` 时才会额外执行逐文件参考对比。

## 数据源

- 独立实例只读写自身 `DATA_DIR`（默认 `/app/data`）中的 SQLite、日志和制品。
- 从参考实例导入冷快照：`pnpm import:source-data --source-data-dir /path/to/frozen-data --target-data-dir /path/to/data --source-home-dir /path/to/source-home --target-home-dir /home/node`。工具复制 SQLite/WAL/备份/日志/规则文件，并按白名单迁移 CLI/OAuth、浏览器和隧道状态；执行 `integrity_check` 并生成 SHA-256 manifest。
- 导入后对待发布目标库运行 `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/path/to/target-data pnpm audit:provider-config`；启用的 OpenAI-compatible 连接必须提供真实 HTTPS `baseUrl`。如源快照缺少该配置，可使用不含密钥的覆盖文件（按连接 ID 映射 `baseUrl`、可选 `defaultModel`/`providerSpecificData`）导入：
  `pnpm import:source-data --source-data-dir /path/to/frozen-data --target-data-dir /path/to/data --provider-config-file /path/to/provider-config.json`。覆盖文件摘要和应用范围会写入 manifest，随后仍必须通过真实 `pnpm smoke:provider-matrix`。
- CLI/OAuth/keychain/browser/tunnel 凭据需要按文档单独导入或重新授权；没有真实源快照时不能声称数据已同步。

发布前必须运行严格门禁（未提供目标数据卷或真实 Provider 上游时会失败；源端不存在的可选外部凭据会被记录为需重新授权，不会伪装成已迁移）：

```bash
SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/path/to/source \
SHIGUANG_GATEWAY_TARGET_DATA_DIR=/path/to/target \
SHIGUANG_GATEWAY_IMPORT_MANIFEST=/path/to/target/gateway-import-manifest.json \
SHIGUANG_GATEWAY_TARGET_HOME_DIR=/path/to/target-home \
RUN_DEPLOYMENT_SMOKE=1 pnpm audit:release-readiness
```

## 运行

```bash
# 安装依赖(workspace 根)
pnpm install

# 全量构建（所有 apps/packages）
pnpm build

# 分别启动
pnpm --filter @shiguang-gateway/edge-gateway dev  # 网关: http://127.0.0.1:8787
pnpm --filter @shiguang-gateway/control-api dev   # 控制面: http://127.0.0.1:8788
pnpm --filter @shiguang-gateway/realtime dev      # 实时: http://127.0.0.1:8790 + WS 20132
pnpm --filter @shiguang-gateway/worker dev        # 后台任务
pnpm --filter @shiguang-gateway/admin dev         # 管理台: http://127.0.0.1:5173

# 或 turbo 并行
pnpm dev
```

本地开发默认使用 loopback-only dev identity，浏览器不需要登录；生产请设置稳定的 `JWT_SECRET`、`API_KEY_SECRET` 并按需启用 shiguang SSO。
需要联调真实
拾光身份时，将 `SG_LOCAL_BROKER_ENABLED=true` 并配置 `SG_BROKER_USERNAME/PASSWORD`。
Broker 模式只在本地 dev server 生效，生产启动会拒绝任何本地绕过配置。

前端 dev server 的 `/api` 代理默认指向控制面(8788)，模型协议指向网关(8787)，长连接 `/live-ws` 指向 realtime(20132)。不需要配置 NAS target 或官方 live server。

## 镜像发布与 NAS 部署

仓库已提供 GHCR 发布流程：推送 `main` 会更新 `latest`，推送 `v*` tag
会发布版本 tag、提交 SHA tag，并同步更新 `latest`。工作流按 Dockerfile 的显式 target
分别构建 `linux/amd64` 与 `linux/arm64` 多架构镜像：

```text
ghcr.io/shiguang-lab/shiguang-gateway-admin:<tag-or-digest>
ghcr.io/shiguang-lab/shiguang-gateway-edge:<tag-or-digest>
ghcr.io/shiguang-lab/shiguang-gateway-control:<tag-or-digest>
ghcr.io/shiguang-lab/shiguang-gateway-realtime:<tag-or-digest>
ghcr.io/shiguang-lab/shiguang-gateway-worker:<tag-or-digest>
ghcr.io/shiguang-lab/shiguang-gateway-importer:<tag-or-digest>
```

推送 `v*` tag 还会自动创建 GitHub Release，附带源码 tar/zip、包含 `deploy/` 目录的 NAS
部署包和 `SHA256SUMS.txt` 校验文件；Release 中六个镜像的 tag 与 Git tag 一致。

每个应用镜像只对应一个显式 target，运行数据写入独立的 `shiguang-gateway_data` volume，
不需要在 NAS 安装 Node/pnpm。首次部署前执行 importer 导入冷快照，完整步骤见
[`deploy/NAS-DEPLOY.md`](./deploy/NAS-DEPLOY.md)。

## 服务结构

```
apps/edge-gateway/src/index.ts   # edge 进程 bootstrap 与端口/信号配置
apps/control-api/src/index.ts    # control 进程 bootstrap 与端口/信号配置

packages/server-runtime/src/
├── index.ts              # 仅导出 Nest 应用工厂，不负责进程启动
├── app.ts                # Fastify 装配(插件/中间件/引擎/路由)
├── engine-shim.d.ts      # 本地 runtime 类型声明(tsc 用)
├── middleware/
│   ├── authz.ts          # 鉴权(复刻 requireManagementAuth: JWT cookie/API key/CLI token)
│   ├── csrf.ts           # CSRF(HMAC, 复刻 src/server/authz/csrf.ts)
│   └── requestId.ts      # requestId 生成
├── plugins/
│   └── error.ts          # 错误信封 {error:{type,message,details}, requestId}
├── routes/
│   ├── index.ts          # 路由注册中心(按原 src/app/api/ 一级目录组织)
│   ├── health.ts         # /api/health, /api/healthz, /api/livez, /api/readyz
│   ├── auth.ts           # /api/auth/{login,logout,status,csrf} + require-login
│   └── providers.ts      # /api/providers(首批迁移的 CRUD 代表)
└── lib/
    └── engine.ts         # 本地 runtime 适配器
```

## 迁移进度

| 组 | 状态 |
|---|---|
| health | ✅ 已迁移 |
| auth (login/logout/status/csrf/require-login) | ✅ 已迁移 |
| providers (GET 列表) | ✅ 已迁移 |
| 其余官方 route | ✅ 本地 runtime 快照 + dispatcher 覆盖（689 API parity + 2 个 media-cache 扩展 + 9 根路径） |

## 迁移新增一个路由组的模式

开始迁移前先按 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md) 完成原页面、数据源和交互清单盘点。

1. 高频管理接口在 `routes/` 下用 `app.get/post(..., handler)` 定义路由，响应形状/错误格式与原 `route.ts` 一致。
2. 数据访问通过 `lib/engine.ts` 暴露的本地 runtime 适配器调用；未显式适配的参考 route 由 `runtimeCatchall.ts` 执行。
3. 在 `routes/index.ts` 注册。
4. 在 `src/engine-shim.d.ts` 补充该引擎模块的类型声明。
