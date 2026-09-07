# Orbit

智枢（Orbit）独立部署 monorepo（管理台 + 网关 + 控制面 + 实时服务 + worker）。

页面迁移必须遵守 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md)：Web 与本地 API 作为一个单元联合迁移，保持既有数据源、业务逻辑和 UI 行为。运行时使用仓库内的独立能力实现，不依赖外部同级源码或远程服务。

应用边界、表所有权与逐域验收命令见 [`DOMAIN_BOUNDARIES.md`](./DOMAIN_BOUNDARIES.md)。

## 目标架构

```
orbit/
├── apps/
│   ├── console/         # React 19 + Vite 管理台（现有，保留）
│   ├── gateway/  # 对外模型协议与请求入口
│   ├── control/   # 管理 API、RBAC、配置和审计
│   ├── realtime/      # WebSocket/SSE 实时服务
│   ├── worker/        # 同步、定时任务和后台作业
│   └── importer/      # 冷快照导入与数据库转换 CLI
├── packages/
│   ├── core/ # 无端口监听的领域实现与协议能力
│   ├── http/ # 仅承载 HTTP 基础设施；路由由 app 负责装配
│   ├── contracts/    # 前后端共享的 API 类型/契约
│   ├── config/       # 共享配置
│   ├── utils/        # 错误、日志、网络校验与事件发送工具
├── turbo.json        # 任务编排
└── pnpm-workspace.yaml
```

包职责与依赖约束见 [packages/README.md](packages/README.md)。

## 核心设计：按 app 边界拆分

- 生产入口拆为 **gateway**（模型协议）、**control**（管理面）、**realtime**（SSE/WS）
  和 **worker**（定时任务/后台作业）；每个 `apps/*` 都拥有自己的进程 bootstrap，
  只通过包接口复用实现。
- 服务只从 `gateway`、`control`、`realtime`、`worker` 和 `importer` 启动；仓库不包含旧 BFF 启动器或兼容入口。
- `packages/core` 只提供无端口监听的领域模块与协议能力；HTTP 端口、生命周期和 surface 选择由所属 app 的固定 bootstrap 负责，`http` 仅提供传输适配。数据库表结构放在 `packages/contracts/src/db-schema`，纯出站 URL/SSRF 校验放在无框架依赖的 `packages/utils/src/network`，不得把 app 启动逻辑放回公共包。
- app 之间只能通过网络 API 或 `packages/contracts` 交互；禁止跨 app workspace 依赖、跨 app 相对路径和直接引用其他 app 的 `src`。
- 每次迁移一个领域后，运行 `pnpm audit:app-boundaries` 验证依赖边界，再运行该 app 自己的 typecheck/build 与 smoke 测试。
- `apps/importer` 将冻结快照导入独立数据卷；`scripts/smoke-container-deployment.mjs` 自动验收接口隔离、数据表、原生 SQLite/vector、实时端口和全部 worker scheduler。
- 参考仓库仅作为审查基线；升级必须重新复制快照并通过 `pnpm audit:gateway-independence`。
- 发布机不需要 checkout 官方仓库：独立性/路由契约审查内置冻结 SHA-256 基线；设置
  `ORBIT_REFERENCE_DIR` 时才会额外执行逐文件参考对比。

## 数据源

- 独立实例只读写自身 `DATA_DIR`（默认 `/app/data`）中的 SQLite、日志和制品。
- 从参考实例导入冷快照：`pnpm import:source-data --source-data-dir /path/to/frozen-data --target-data-dir /path/to/data --source-home-dir /path/to/source-home --target-home-dir /home/node`。工具复制 SQLite/WAL/备份/日志/规则文件，并按白名单迁移 CLI/OAuth、浏览器和隧道状态；执行 `integrity_check` 并生成 SHA-256 manifest。
- 导入后对待发布目标库运行 `ORBIT_SOURCE_DATA_DIR=/path/to/target-data pnpm audit:provider-config`；启用的 OpenAI-compatible 连接必须提供真实 HTTPS `baseUrl`。如源快照缺少该配置，可使用不含密钥的覆盖文件（按连接 ID 映射 `baseUrl`、可选 `defaultModel`/`providerSpecificData`）导入：
  `pnpm import:source-data --source-data-dir /path/to/frozen-data --target-data-dir /path/to/data --provider-config-file /path/to/provider-config.json`。覆盖文件摘要和应用范围会写入 manifest，随后仍必须通过真实 `pnpm smoke:provider-matrix`。
- CLI/OAuth/keychain/browser/tunnel 凭据需要按文档单独导入或重新授权；没有真实源快照时不能声称数据已同步。

发布前必须运行严格门禁（未提供目标数据卷或真实 Provider 上游时会失败；源端不存在的可选外部凭据会被记录为需重新授权，不会伪装成已迁移）：

```bash
ORBIT_SOURCE_DATA_DIR=/path/to/source \
ORBIT_TARGET_DATA_DIR=/path/to/target \
ORBIT_IMPORT_MANIFEST=/path/to/target/gateway-import-manifest.json \
ORBIT_TARGET_HOME_DIR=/path/to/target-home \
RUN_DEPLOYMENT_SMOKE=1 pnpm audit:release-readiness
```

## 运行

```bash
# 安装依赖(workspace 根)
pnpm install

# 全量构建（所有 apps/packages）
pnpm build

# 分别启动
pnpm --filter @orbit/gateway dev  # 网关: http://127.0.0.1:8787
pnpm --filter @orbit/control dev   # 控制面: http://127.0.0.1:8788
pnpm --filter @orbit/realtime dev      # 实时: http://127.0.0.1:8790 + WS 20132
pnpm --filter @orbit/worker dev        # 后台任务
pnpm --filter @orbit/console dev         # 管理台: http://127.0.0.1:5173

# 或 turbo 并行
pnpm dev
```

浏览器只使用统一 SSO；生产请设置稳定的 `JWT_SECRET`、`API_KEY_SECRET`，并由 Access Gateway 注入签名身份。
需要联调真实
拾光身份时，将 `SG_LOCAL_BROKER_ENABLED=true` 并配置 `SG_BROKER_USERNAME/PASSWORD`。
本地 Broker 注入真实签名身份并接受相同的验证；生产启动会拒绝本地 Broker 配置。

前端 dev server 的 `/api` 代理默认指向控制面(8788)，模型协议指向网关(8787)，长连接 `/live-ws` 指向 realtime(20132)。不需要配置 NAS target 或官方 live server。

## 镜像发布与 NAS 部署

仓库已提供 GHCR 发布流程：推送 `main` 会更新 `latest`，推送 `v*` tag
会发布版本 tag、提交 SHA tag，并同步更新 `latest`。工作流按 Dockerfile 的显式 target
分别构建 `linux/amd64` 与 `linux/arm64` 多架构镜像：

```text
ghcr.io/shiguang-lab/orbit-console:<tag-or-digest>
ghcr.io/shiguang-lab/orbit-gateway:<tag-or-digest>
ghcr.io/shiguang-lab/orbit-control:<tag-or-digest>
ghcr.io/shiguang-lab/orbit-realtime:<tag-or-digest>
ghcr.io/shiguang-lab/orbit-worker:<tag-or-digest>
ghcr.io/shiguang-lab/orbit-importer:<tag-or-digest>
```

推送 `v*` tag 还会自动创建 GitHub Release，附带源码 tar/zip、包含 `deploy/` 目录的 NAS
部署包和 `SHA256SUMS.txt` 校验文件；Release 中六个镜像的 tag 与 Git tag 一致。

每个应用镜像只对应一个显式 target，运行数据写入独立数据卷，
不需要在 NAS 安装 Node/pnpm。首次部署前执行 importer 导入冷快照，完整步骤见
[`deploy/NAS-DEPLOY.md`](./deploy/NAS-DEPLOY.md)。

## 服务结构

```
apps/gateway/src/main.ts       # edge 进程入口、端口与信号
apps/gateway/src/app.module.ts # edge 根模块
apps/gateway/src/*/*.module.ts # audio/images/files 等 feature modules

apps/control/src/main.ts        # control 进程入口、端口与信号
apps/control/src/app.module.ts  # control 根模块
apps/control/src/*/*.module.ts  # health/providers/keys/pricing 等 feature modules

apps/realtime/src/main.ts           # realtime 进程入口与端口
apps/realtime/src/app.module.ts     # realtime 根模块
apps/worker/src/main.ts              # 后台作业进程入口
apps/importer/src/main.ts            # 一次性导入进程入口

packages/http/src/
├── http.module.ts # Nest transport 基础模块
├── middleware/           # request-id middleware
├── interceptors/         # request-id interceptor
├── filters/              # API exception filter
└── web-handler-adapter.ts # 显式选中的 Web handler 到 Fastify 的传输适配
```

每个服务端 app 都由自己的 `AppModule` 组合模块并通过 Nest lifecycle 注册基础设施、路由和 provider。
`http` 不创建 Nest 应用、不监听端口、不持有业务路由，也不接受 edge/control surface 参数。

## 迁移进度

| 组 | 状态 |
|---|---|
| control 管理 API | ✅ Nest feature modules，物理位于 `apps/control/src` |
| edge 模型与协议 API | ✅ Nest feature modules，物理位于 `apps/gateway/src` |
| realtime WS/SSE | ✅ 物理位于 `apps/realtime/src` |
| worker schedulers | ✅ 由 `apps/worker/src/jobs` 显式启动和停止 |
| 旧 App Router route tree / 动态 dispatcher | ✅ 已移除；严格 route parity 由 controller contract 审计 |

## 迁移新增一个路由组的模式

开始迁移前先按 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md) 完成原页面、数据源和交互清单盘点。

1. 为该领域在所属 app 下创建 feature module、controller 和 service，由 `AppModule` 显式导入；HTTP 方法使用 Nest 官方装饰器声明。
2. 数据访问由所属 app 的领域 service 调用 `core` 显式导出；请求 DTO、guards、interceptors 和 providers 跟随该 feature module 注册。
3. handler 通过 controller 显式选择；禁止目录扫描、动态 route import 或 all-surface dispatcher。仍使用 Web `Request`/`Response` 的 handler 只通过 `web-handler-adapter` 做窄传输适配。
4. 更新 owned-route manifest 后，依次运行边界审计、route parity、所属 app 的 typecheck/build 和 split-deployment smoke。
