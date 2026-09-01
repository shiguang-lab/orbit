# OmniRoute 统一 SSO 接入总览

> 目标：OmniRoute 管理台接入 shiguang 统一登录 —— 登录页用 shiguang website，
> 用户信息/权限走网关，BFF 终结身份。完全仿 asset-hub。

## 全链路

```
用户访问 omniroute.shiguanglab.com
  → 网关 forward-auth 无会话 → 302 https://shiguanglab.com/login?return_to=...
  → 用户在 shiguang website 登录(拾光) → 种父域 cookie __Secure-sg_session
  → 回跳 omniroute.shiguanglab.com
  → 前端 fetch /api/auth/session (网关→auth-service 共享会话)
  → 前端调 /api/* → 网关注入 X-SG-Identity(RS256 JWT) → BFF JWKS 校验
  → BFF 校验 system:admin → 返回统一会话/放行管理操作
```

## 三处改动(全部配置化，无 auth-service 代码改动)

| # | 位置 | 改动 | 文档 |
|---|---|---|---|
| 1 | **网关 Caddyfile** | 新增 `omniroute.shiguanglab.com` host 块(forward_auth + X-SG-Audience/Entitlement + copy_headers) | `deploy/gateway-caddyfile.md` |
| 2 | **auth-service env** | `DEFAULT_ENTITLEMENTS` 加 `omniroute:access`；`ALLOWED_RETURN_ORIGINS` 加新域 | `deploy/auth-service-config.md` |
| 3 | **BFF 身份校验** | 已实现：`src/lib/sgIdentity.ts`(JWKS) + `src/lib/session.ts`(终结 + system:admin) | 本仓库代码 |

## 已完成(代码侧)

- ✅ BFF `SgIdentityVerifier`：RS256 + `typ=sg-identity+jwt` + kid 查 JWKS + iss/aud/exp/nbf/iat/entitlement 校验(JWKS 缓存 5min)
- ✅ BFF `/api/auth/session`：终结 X-SG-Identity，校验 `system:admin`/`omniroute:admin`/`omniroute:access`，返回统一会话
- ✅ 本地开发：dev 启动默认使用 loopback-only `SG_DEV_IDENTITY=1`
- ✅ 真实账号联调：显式开启 `SG_LOCAL_BROKER_ENABLED=true`
- ✅ 前端：未登录整页跳 shiguang 登录页(`session.ts`)，无自建登录页
- ✅ 验证：伪造断言被拒(401)、dev 会话返回(200)、无身份 401

## 待部署(需走统一 deploy 流程)

- [ ] 网关 host 块合入生产 Caddyfile 并 `./deploy.sh`
- [ ] auth-service env 变更并重启
- [ ] `omniroute-admin`(前端) 与 `omniroute-bff`(BFF) 加入网关 compose 网络
- [ ] BFF 生产环境变量：
  ```bash
  SG_IDENTITY_ISSUER=https://shiguanglab.com
  SG_IDENTITY_AUDIENCE=omniroute-api
  SG_IDENTITY_ENTITLEMENT=omniroute:access
  SG_IDENTITY_JWKS_URL=https://shiguanglab.com/.well-known/sg-identity-jwks.json
  # 生产绝不可设: SG_DEV_IDENTITY
  ```

## BFF 环境变量参考

| 变量 | 默认 | 说明 |
|---|---|---|
| `SG_IDENTITY_ISSUER` | `https://shiguanglab.com` | 断言 issuer |
| `SG_IDENTITY_AUDIENCE` | `omniroute-api` | 本产品 audience |
| `SG_IDENTITY_ENTITLEMENT` | `omniroute:access` | 本产品 entitlement |
| `SG_IDENTITY_JWKS_URL` | `https://shiguanglab.com/.well-known/sg-identity-jwks.json` | JWKS 拉取地址 |
| `SG_IDENTITY_JWKS_FILE` | 空 | 本地 JWKS 文件(离线/测试) |
| `SG_DEV_IDENTITY` | 空 | `1` 时本地注入 dev 身份(仅开发) |
| `SG_LOCAL_BROKER_ENABLED` | 空 | `true` 时本地显式启用真实账号 Broker(仅 dev server) |
| `BFF_PORT` | `8787` | BFF 监听端口 |
| `BFF_HOST` | `127.0.0.1` | BFF 监听地址 |

## 本地 Web/BFF 与 NAS 数据链路

本地开发只启动 admin（5173）和 BFF（8787）。Provider、首页统计、设置及其他业务接口不读取
开发机上的 Orbit SQLite，而由 BFF 代理到 NAS OmniRoute：

```text
浏览器 → 本地 admin → 本地 BFF → http://100.87.115.78:20128 → NAS Orbit/数据库
```

在 `apps/admin/.env.local` 设置 `OMNIROUTE_NAS_API_TARGET` 后，BFF 会禁用 engine shim，避免因
开发机存在 `~/.omniroute/storage.sqlite` 而显示错误账号数据。NAS 受保护的管理 API 需要在 BFF
进程环境配置 `OMNIROUTE_NAS_MANAGEMENT_API_KEY`（manage/admin scope）；也可以在 auth-service
为 `omniroute` 配置 local-broker policy 后使用 `SG_LOCAL_BROKER_ENABLED=true`。两者都未配置时，
BFF 返回 503，不会回退本地数据库或放开匿名代理。

NAS 代理默认仅允许开发环境且 BFF 监听 loopback；生产镜像部署必须显式设置
`OMNIROUTE_NAS_PROXY_ENABLED=true`，生产 compose 已包含该开关，避免误带 target 变量形成公开转发入口。
