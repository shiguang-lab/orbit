# omniroute-monorepo

OmniRoute 管理系统重构后的 monorepo（前端 + BFF），架构对齐 asset-hub。

页面迁移必须遵守 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md)：Web 与 BFF 作为一个单元联合迁移，保持原项目的数据源、业务逻辑和 UI 行为，底层 Orbit 引擎不动。

## 目标架构

```
omniroute-monorepo/
├── apps/
│   ├── admin/        # 新前端(React 19 + Vite CSR + antd 6 + react-query)
│   └── bff/          # 新后端 BFF(Fastify + 复用 Orbit 引擎)
├── packages/
│   ├── contracts/    # 前后端共享的 API 类型/契约
│   ├── config/       # 共享配置
│   └── ui/           # 共享主题 token；通用组件优先复用 @shiguang2/components
├── turbo.json        # 任务编排
└── pnpm-workspace.yaml
```

## 核心设计：BFF 复用引擎（不改业务逻辑）

- BFF 是 **Fastify** 应用（对齐 asset-hub `apps/api`），HTTP 层完全重写：
  路由注册 / 鉴权中间件 / CSRF / 错误信封 / requestId。
- **业务逻辑通过引擎 shim 复用**，不重写：
  - tsconfig `paths`：`@/*` → `../../Orbit/src/*`，`@omniroute/open-sse/*` → `../../Orbit/open-sse/*`
  - `src/engine-shim.d.ts`：给 tsc 提供宽松类型声明，让 BFF 自身严格 typecheck
  - 运行时 tsx 按 tsconfig paths 解析到真实引擎源码（已验证可行）
- 好处：引擎零改动，上游(Orbit)更新后 BFF 自动跟随；fork-sync 不受影响。

## 数据源

- 本地开发形态只有 admin + BFF 在本机；BFF 通过 `OMNIROUTE_NAS_API_TARGET` 代理 NAS Orbit 的业务 API，
  不打开或读取本机 `~/.omniroute/storage.sqlite`。
- NAS target 只允许 `NODE_ENV=development` 且 BFF 监听 loopback，避免生产环境意外形成公开代理；生产 BFF
  应与 Orbit 同机运行并使用 engine adapter。
- BFF 使用服务端 `OMNIROUTE_NAS_MANAGEMENT_API_KEY`（manage/admin scope）或显式启用的 SSO broker
  访问 NAS，凭证不会下发到浏览器。未配置 NAS target 时才允许同机 Orbit 引擎模式。

## 运行

```bash
# 安装依赖(workspace 根)
pnpm install

# 全量构建(admin build + bff typecheck)
pnpm build

# 分别启动
pnpm --filter @omniroute/bff dev      # BFF: http://127.0.0.1:8787
pnpm --filter @omniroute/admin dev    # 前端: http://127.0.0.1:5173

# 或 turbo 并行
pnpm dev
```

本地开发默认使用 BFF 的 loopback-only dev identity，浏览器不需要登录；访问 NAS 业务数据仍需配置
服务端管理 key，或在 auth-service 开通并启用 omniroute local-broker。
`pnpm --filter @omniroute/bff dev` 会自动读取 `apps/admin/.env.local`；需要联调真实
拾光身份时，将 `SG_LOCAL_BROKER_ENABLED=true` 并配置 `SG_BROKER_USERNAME/PASSWORD`。
Broker 模式只在本地 dev server 生效，生产启动会拒绝任何本地绕过配置。

前端 dev server 的 `/api` 代理指向 BFF(8787)；本地配置 NAS target 时由 BFF 转发到 NAS Orbit，
未配置时才通过引擎 shim 读取同机真实数据。
长连接 `/live-ws` 代理指向 Orbit 的 live server(20132)。

## 镜像发布与 NAS 部署

仓库已提供与 Orbit 一致的 GHCR 发布流程：推送 `main` 会更新 `latest`，推送 `v*` tag
会发布版本 tag、提交 SHA tag，并同步更新 `latest`。工作流构建 `linux/amd64` 与
`linux/arm64` 多架构镜像：

```text
ghcr.io/shiguang-lab/orbit-gateway:<tag>
```

镜像内包含 Admin 静态文件和 BFF 单进程服务，生产不读取镜像内数据库，也不需要在 NAS
安装 Node/pnpm。NAS 直接执行 `docker compose pull && docker compose up -d`，通过
`OMNIROUTE_NAS_API_TARGET` 访问 NAS 上现有的 Orbit，并以服务端
`OMNIROUTE_NAS_MANAGEMENT_API_KEY` 完成管理 API 认证。完整步骤见
[`deploy/NAS-DEPLOY.md`](./deploy/NAS-DEPLOY.md)。

## BFF 结构

```
apps/bff/src/
├── index.ts              # 启动
├── app.ts                # Fastify 装配(插件/中间件/引擎/路由)
├── engine-shim.d.ts      # 引擎类型声明(tsc 用)
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
    └── engine.ts         # 引擎适配器(把 Orbit 模块映射成 BFF 路由需要的接口)
```

## 迁移进度

| 组 | 状态 |
|---|---|
| health | ✅ 已迁移 |
| auth (login/logout/status/csrf/require-login) | ✅ 已迁移 |
| providers (GET 列表) | ✅ 已迁移 |
| 其余 680+ route | ⏳ 待迁移(按 routes/ 下同模式逐个添加) |

## 迁移新增一个路由组的模式

开始迁移前先按 [`MIGRATION_SPEC.md`](./MIGRATION_SPEC.md) 完成原页面、数据源和交互清单盘点。

1. 在 `routes/` 下新建 `xxx.ts`，用 `app.get/post(..., handler)` 定义路由，
   响应形状/错误格式与原 `src/app/api/xxx/route.ts` 一致。
2. 数据访问通过 `lib/engine.ts` 暴露的引擎适配器调用（引擎零改动）。
3. 在 `routes/index.ts` 注册。
4. 在 `src/engine-shim.d.ts` 补充该引擎模块的类型声明。
