# ShiguangGateway 生产入口与统一认证

生产域名固定为 `llm-gateway.shiguanglab.com`。本文件描述待实施的切换方案，不表示 Caddy
已经发布或业务流量已经切换。

生产 Caddyfile：`/Users/yanxianliang/shiguang/deploy/access-gateway/Caddyfile`。
发布必须使用该部署目录的受控流程；只改本文件不会改变线上路由。

## 当前入口与目标入口

| 请求 | 当前生产 Caddy upstream | 验收后的目标 upstream |
|---|---|---|
| Web、`/api/*` | `100.87.115.78:8787`，旧 `orbit-gateway` 容器 | `100.87.115.78:8787`，新独立 Admin nginx 容器的 `8080` |
| `/v1`、`/v1/*` | `100.87.115.78:20128`，官方实例 | `100.87.115.78:8787`，经 Admin nginx 转发至独立 edge |
| `/live-ws` | 切换前需单独核验 | `100.87.115.78:8787`，经 Admin nginx 转发至独立 realtime |

新拓扑只保留一个 NAS 主机 Web/API 入口 `8787`。`shiguang-gateway-control:8788`、
`shiguang-gateway-edge:8787`、`shiguang-gateway-realtime:20132` 均为 Docker 内网地址，
不供生产 Caddy 直接访问，也不分别发布到 NAS 主机。Admin 是独立 nginx 镜像；control-api
只提供管理 API，不托管 Admin 静态资源。

## Caddy host 块

下面是目标配置，必须先完成本文的切换门禁后再合并。模型 API 保留调用者的
`Authorization`，由独立 edge 校验 API key；管理 API 和实时通道使用统一登录断言。
共享会话端点仍由中央 auth-service 提供，不属于 NAS 业务 upstream。

```caddy
@llmGateway host llm-gateway.shiguanglab.com
handle @llmGateway {
    @gatewayPublic path /healthz /api/health /api/healthz /api/livez /api/readyz
    handle @gatewayPublic {
        route {
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy http://100.87.115.78:8787
        }
    }

    @gatewaySharedAuth path /api/auth/session /api/auth/context /api/auth/logout /api/account/*
    handle @gatewaySharedAuth {
        route {
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy {$AUTH_SERVICE_UPSTREAM:auth-service:8081} {
                header_up X-SG-Gateway-Token {$GATEWAY_SHARED_TOKEN}
            }
        }
    }

    @gatewayModels path /v1 /v1/*
    handle @gatewayModels {
        route {
            request_header -X-SG-*
            request_header -X-User-*
            # Preserve Authorization for edge API-key validation.
            reverse_proxy http://100.87.115.78:8787
        }
    }

    @gatewayManaged path /api/* /live-ws /live-ws/*
    handle @gatewayManaged {
        route {
            request_header -X-SG-*
            request_header -X-User-*
            forward_auth {$AUTH_SERVICE_UPSTREAM:auth-service:8081} {
                uri /v1/forward-auth
                header_up -Connection
                header_up -Upgrade
                header_up X-SG-Gateway-Token {$GATEWAY_SHARED_TOKEN}
                header_up X-SG-Product-ID shiguang-gateway
                header_up X-SG-Audience shiguang-gateway-api
                header_up X-SG-Required-Entitlements shiguang-gateway:access
                copy_headers X-SG-Identity
            }
            reverse_proxy http://100.87.115.78:8787
        }
    }

    handle {
        route {
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy http://100.87.115.78:8787
        }
    }
}
```

`wss://llm-gateway.shiguanglab.com/live-ws` 与 SSE 请求必须经同一入口进行真实连接、重连和
流式验收。不能仅以 HTML、健康检查或普通 JSON 请求成功替代验收。

## 统一认证上线门禁

上线前必须从 auth-service 实际部署配置和真实请求确认以下三项一致，不能假定服务已配置：

| 配置 | 值 |
|---|---|
| 产品 | `shiguang-gateway` |
| Audience | `shiguang-gateway-api` |
| Required entitlement | `shiguang-gateway:access` |

登录回跳白名单必须包含 `https://llm-gateway.shiguanglab.com`。登录成功后还需验证
`X-SG-Identity` 的签名、issuer、audience、entitlement 与 control-api 配置一致。缺少产品策略、
授权项、回跳白名单或真实鉴权验证结果时，阻塞上线；不得回退旧产品标识或开启
`SG_DEV_IDENTITY` / `SG_LOCAL_BROKER_ENABLED` 绕过验证。

## 切换顺序与边界

1. 验证六个独立镜像、Admin nginx 路由、源数据快照与导入校验；数据库运行时仍是 SQLite，
   PostgreSQL 当前仅用于迁移审计，不能据其落库成功宣称已切换。
2. 在 NAS 使用独立验收端口运行新 Admin 入口，保持旧 `orbit-gateway:8787` 和官方实例正常
   运行。完成管理 API、模型 API、共享登录、WS/SSE、worker、凭据和真实 Provider 验收。
3. 完成 auth-service 门禁并校验候选 Caddy 配置。此时仍不得发布到生产域名。
4. 进入获准的切换窗口后，才将旧 `orbit-gateway` 占用的主机 `8787` 交给新 Admin nginx
   `8080`，同时将本域名的 `/v1` 路由由官方 `20128` 改至 `8787`。不能只换 Web/API 而遗漏 `/v1`。
5. 发布 Caddy 后，从生产域名重跑读写、登录、流式和真实 Provider 验收；失败时回滚 Caddy
   及旧 `8787` 入口，保留新实例数据用于排查。

该流程不授权停止或删除官方 `omniroute` 容器、覆盖其数据或修改它的 `20128` 监听。
旧 `orbit-gateway` 与官方 `omniroute` 是不同对象，必须分别确认，不得误操作。
