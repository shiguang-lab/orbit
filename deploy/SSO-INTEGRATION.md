# ShiguangGateway 统一 SSO 接入总览

> 目标：ShiguangGateway 管理台接入 shiguang 统一登录 —— 登录页用 shiguang website，
> 用户信息/权限走网关，control-api/edge-gateway 终结身份。完全仿 asset-hub。

## 全链路

```
用户访问 llm-gateway.shiguanglab.com
  → 网关 forward-auth 无会话 → 302 https://shiguanglab.com/login?return_to=...
  → 用户在 shiguang website 登录(拾光) → 种父域 cookie __Secure-sg_session
  → 回跳 llm-gateway.shiguanglab.com
  → 前端 fetch /api/auth/session (网关→auth-service 共享会话)
  → 前端调 /api/* → 网关注入 X-SG-Identity(RS256 JWT) → control-api JWKS 校验
  → control-api 校验当前配置的产品授权 → 返回统一会话/放行管理操作
```

## 三处改动(全部配置化，无 auth-service 代码改动)

| # | 位置 | 改动 | 文档 |
|---|---|---|---|
| 1 | **网关 Caddyfile** | 更新现有 host 的 upstream 与 `/live-ws` 路由，保留 `omniroute` 产品身份 | `deploy/gateway-caddyfile.md` |
| 2 | **auth-service env** | 复用原 `omniroute:access` 与原域名回跳配置，无需因替换镜像新增授权 | `deploy/auth-service-config.md` |
| 3 | **服务身份校验** | 共享 `auth` 包的 JWKS/session/authz 中间件，显式配置原 audience/entitlement | 本仓库代码 |

## 已完成(代码侧)

- ✅ `auth` `SgIdentityVerifier`：RS256 + `typ=sg-identity+jwt` + kid 查 JWKS + iss/aud/exp/nbf/iat/entitlement 校验(JWKS 缓存 5min)
- ✅ control-api `/api/auth/session`：终结 X-SG-Identity，认可管理员角色或配置的产品 entitlement，返回统一会话
- ✅ 真实账号联调：显式开启 `SG_LOCAL_BROKER_ENABLED=true`
- ✅ 前端：未登录整页跳 shiguang 登录页(`session.ts`)，无自建登录页
- ✅ 验证：伪造断言被拒(401)、签名 SSO 会话及业务 API 返回(200)、无身份 401

## 待部署(需走统一 deploy 流程)

- [ ] 网关 host 块合入生产 Caddyfile 并 `./deploy.sh`
- [ ] 真实会话确认已有 `omniroute:access` 授权及原域名回跳正常
- [ ] 新 Admin nginx、control-api、edge-gateway、realtime 接入受控 Docker 网络（Admin 静态资源由独立 Admin nginx 提供，control-api 不托管静态资源）
- [ ] control-api/edge-gateway 生产环境变量：
  ```bash
  SG_IDENTITY_ISSUER=https://shiguanglab.com
  SG_IDENTITY_AUDIENCE=omniroute-api
  SG_IDENTITY_ENTITLEMENT=omniroute:access
  SG_IDENTITY_JWKS_URL=https://shiguanglab.com/.well-known/sg-identity-jwks.json
  # 生产绝不可设: SG_DEV_IDENTITY
  ```

## control-api/edge-gateway 环境变量参考

| 变量 | 默认 | 说明 |
|---|---|---|
| `SG_IDENTITY_ISSUER` | `https://shiguanglab.com` | 断言 issuer |
| `SG_IDENTITY_AUDIENCE` | `shiguang-gateway-api` | 本产品 audience |
| `SG_IDENTITY_ENTITLEMENT` | `shiguang-gateway:access` | 本产品 entitlement |
| `SG_IDENTITY_JWKS_URL` | `https://shiguanglab.com/.well-known/sg-identity-jwks.json` | JWKS 拉取地址 |
| `SG_IDENTITY_JWKS_FILE` | 空 | 本地 JWKS 文件(离线/测试) |
| `SG_LOCAL_BROKER_ENABLED` | 空 | `true` 时本地显式启用真实账号 Broker(仅 dev server) |
| `EDGE_GATEWAY_PORT` | `8787` | edge-gateway 监听端口 |
| `CONTROL_API_PORT` | `8788` | control-api 监听端口 |

## 本地 Web/服务数据链路

本地开发可以启动 admin（5173）与本地 API（8787）；生产使用拆分后的 edge-gateway（8787）、
control-api（8788）、realtime（8790）和 worker。Provider、首页统计、设置及其他业务接口
直接读取本项目自己的 `DATA_DIR`；不存在 NAS 代理或旧 live server：

```text
浏览器 → control-api（管理 API）→ /app/data/storage.sqlite
模型客户端 → edge-gateway（模型 API）→ /app/data/storage.sqlite
```

生产使用稳定的 `JWT_SECRET`、`API_KEY_SECRET`，并按需配置本节的 shiguang JWKS 变量。生产
禁止设置 `SG_DEV_IDENTITY`、`SG_LOCAL_BROKER_ENABLED` 及任何 `SHIGUANG_GATEWAY_NAS_*` 变量。
