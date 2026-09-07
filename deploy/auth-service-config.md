# ShiguangGateway 接入 shiguang SSO —— auth-service 配置变更

> auth-service 是 shiguang 统一会话/OIDC/JWKS 服务。
> ShiguangGateway 接入无需改 auth-service 代码；替换现有部署时可以继续使用其产品身份与授权。

## 替换现有 llm-gateway 部署

中央 `deploy/access-gateway/Caddyfile` 的现有产品配置是 `omniroute`、audience
`omniroute-api`、entitlement `omniroute:access`。新部署继续使用同一产品权限：

```bash
SG_IDENTITY_AUDIENCE=omniroute-api
SG_IDENTITY_ENTITLEMENT=omniroute:access
```

Caddy 保持上述产品三元组，服务端验签与管理权限判断使用同一配置。无需因为代码或镜像
改名而新增 `shiguang-gateway:access`，也无需为此重启 auth-service。上线仍须以真实会话
确认原授权存在，并验证登录回跳和受保护 API；配置文件本身不是线上成功证据。
以下新增产品配置仅适用于主动采用独立 `shiguang-gateway` 身份的部署。

## 浏览器登录链路

管理控制台只使用统一 SSO：浏览器进入统一登录站点，回跳产品域名后由 Access Gateway
校验会话并注入 `X-SG-Identity`。会话探测、管理 API、CSRF 和 WebSocket 使用相同的
issuer、audience、entitlement 验证。产品不提供独立密码登录页或 OIDC 回调。

`/api/auth/session` 返回 401 时启动一次 SSO 跳转；回跳仍未认证、权限不足或服务故障时
显示验证错误，由用户重试，不自动循环跳转。退出登录通过 auth-service 撤销 SSO 会话。
管理台的业务接口返回 401 后，会重新查询 `/api/auth/session`；会话仍有效时保留业务错误，
只有会话确认失效才启动 SSO 跳转。并发的业务 401 共用一次会话核验。

云端智能体页面使用 `/api/cloud-agents/tasks`，由 control-api 校验管理身份后，携带原签名身份
请求 edge 的 `/api/v1/agents/tasks`。中央网关的 `/api/v1/*` 协议通道不注入 SSO 身份，
管理台不能直接依赖该通道获取会话权限。

`SG_AUTH_ORIGIN` 可指定 auth-service 来源，默认 `https://shiguanglab.com`。
`JWT_SECRET` 仍用于 CSRF 签名等内部能力，须在部署中保持稳定。

本地开发可使用真实账号 Broker，注入相同的签名身份并接受同样的 API 验证；
不允许生产启用 Broker。本地 Vite 不代理统一登录页。

## 1. 环境变量变更

文件：auth-service 部署 env(对应 `auth-service/.env.example`，部署值在 `shiguang/deploy` 下)

### DEFAULT_ENTITLEMENTS(追加 `shiguang-gateway:access`)

```bash
DEFAULT_ENTITLEMENTS=superagents:access,huiguang:access,platform:access,asset-hub:access,shiguang-gateway:access
```

说明：forward-auth 校验会话实际携带的 entitlement。`DEFAULT_ENTITLEMENTS` 用于签发会话，
仅修改该配置不能证明已有会话已经获得新授权；真实登录验收必须覆盖这一点。

### ALLOWED_RETURN_ORIGINS(追加 `https://llm-gateway.shiguanglab.com`)

```bash
ALLOWED_RETURN_ORIGINS=https://shiguanglab.com,https://www.shiguanglab.com,\
https://opc.shiguanglab.com,https://llm-gateway.shiguanglab.com
```

说明：登录成功后回跳 `return_to` 的 origin 白名单，不加则 `safeReturnTo` 拒绝回跳。

### LOCAL_BROKER_POLICIES(本地 SSO Broker 必需)

本地开发走 asset-hub 同款的 LocalAuthBroker：本地开发工具用真实 shiguang 账号调
`POST /api/auth/local-broker` 换身份。**前提是线上 auth-service 必须启用 broker**，
因为该路由仅在 `LOCAL_BROKER_ENABLED=true` 时注册(否则 404)。

需在 auth-service 部署 env 配置(参考 `auth-service/deploy/auth.env.example`)：

```bash
# 1. 总开关(默认 false，必须改 true)
LOCAL_BROKER_ENABLED=true

# 2. 在 policies 数组追加 shiguang-gateway 条目(保留 asset-hub/opc 等已有条目)
LOCAL_BROKER_POLICIES=[{"productId":"asset-hub","audience":"asset-hub-api","requiredEntitlements":["asset-hub:access"]},{"productId":"shiguang-gateway","audience":"shiguang-gateway-api","requiredEntitlements":["shiguang-gateway:access"]}]

# 3. PUBLIC_ORIGIN 是全局的(默认 https://shiguanglab.com)，
#    校验 broker 请求的 Origin 头。本地 broker 请求带 Origin=authTarget(shiguanglab.com)，
#    与默认 PUBLIC_ORIGIN 匹配，无需改。
# PUBLIC_ORIGIN=https://shiguanglab.com
```

注意：
- `LOCAL_BROKER_ENABLED` **默认 false**，线上若没开，`/api/auth/local-broker` 返回 **404**，
  本地 Broker 模式返回不可用错误，不会使用模拟身份。
- `LOCAL_BROKER_POLICIES` 里**必须含 shiguang-gateway** 条目，否则返回 `invalid_product`。
- 配好后，本地 admin/API 开发环境显式设置 `SG_LOCAL_BROKER_ENABLED=true`，再配置真实 shiguang
  账号(`SG_BROKER_USERNAME/PASSWORD`)即可用线上签名身份。未开启时须经 Access Gateway 注入身份。
- 本地 broker 请求的 Origin 与 asset-hub 一致用 `authTarget`(shiguanglab.com)，匹配全局 PUBLIC_ORIGIN。

## 2. 各产品一个 audience 的约定

| 产品 | audience | entitlement |
|---|---|---|
| asset-hub | `asset-hub-api` | `asset-hub:access` |
| **shiguang-gateway(新增)** | **`shiguang-gateway-api`** | **`shiguang-gateway:access`** |

API 服务侧已按此约定默认(可通过环境变量覆盖)：
- `SG_IDENTITY_ISSUER=https://shiguanglab.com`
- `SG_IDENTITY_AUDIENCE=shiguang-gateway-api`
- `SG_IDENTITY_ENTITLEMENT=shiguang-gateway:access`
- `SG_IDENTITY_JWKS_URL=https://shiguanglab.com/.well-known/sg-identity-jwks.json`

## 3. 权限模型(单管理员后台)

ShiguangGateway 是单管理员系统(无 org/多用户)。接入后：
- **网关层**：校验当前产品要求的 entitlement，不假设所有已登录用户自动拥有它。
- **control-api 层**：验签时校验配置的 audience 和 entitlement；管理会话认可该 entitlement
  或管理员角色。现有部署配置为 `omniroute:access`，代码默认值为 `shiguang-gateway:access`。

若只想让白名单用户管理 ShiguangGateway，应在 auth-service 策略层配置 subject/email 白名单
(类似原后端 `oidcAllowedSubjects` 机制)，后续可配。

## 4. 部署步骤

1. 在 auth-service 部署 env 追加上述变量
2. 重启 auth-service(网关 token 不变，签名密钥不变)
3. 网关配置更新后验证：登录 shiguanglab.com → 访问 llm-gateway.shiguanglab.com → 放行
