# ShiguangGateway 网关接入 shiguang 统一 SSO —— Caddyfile 补丁

> 目标：让 `shiguang-gateway.shiguanglab.com` 走 shiguang 统一登录(登录页是 shiguang website)，
> 用户信息/权限由网关(Access Gateway → auth-service)提供，control-api/edge-gateway 终结身份。
>
> 生产 Caddyfile：`/Users/yanxianliang/shiguang/deploy/access-gateway/Caddyfile`
> (与仓库 `access-gateway/Caddyfile` 模板需同步；改动走统一 deploy.sh 发布)

## 1. 在 Caddyfile 的 host 段加入以下块

按 asset-hub 的 host 块结构编写。`shiguang-gateway-admin`(前端 SPA)、`shiguang-gateway-control`、`shiguang-gateway-edge` 与 `shiguang-gateway-realtime`
各自 upstream；`/api/auth/session` 走共享会话；`/api/*` 走 forward_auth 注入 `X-SG-Identity`。

```caddy
# ─────────────────────────────────────────────────────────────
# ShiguangGateway (shiguang-gateway.shiguanglab.com) —— 统一 SSO 接入
# ─────────────────────────────────────────────────────────────
@shiguang-gateway host shiguang-gateway.shiguanglab.com
handle @shiguang-gateway {
    # 前端 SPA 静态资源(由独立 control-api 镜像提供)
    @shiguang-gatewayStatic path /assets/* /favicon.ico /favicon.svg /index.html
    handle @shiguang-gatewayStatic {
        route {
            request_header -X-SG-Identity
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy shiguang-gateway-control:8788 {
                header_up -Cookie
                header_up -Authorization
                header_down -Set-Cookie
            }
        }
    }

    # 共享会话端点 → auth-service(同 asset-hub)
    @shiguang-gatewaySharedAuth path /api/auth/session /api/auth/logout /api/account/*
    handle @shiguang-gatewaySharedAuth {
        route {
            request_header -X-SG-Identity
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy {$AUTH_SERVICE_UPSTREAM:auth-service:8081} {
                header_up X-SG-Gateway-Token {$GATEWAY_SHARED_TOKEN}
            }
        }
    }

    # 模型协议 → edge-gateway
    @shiguang-gatewayEdge path /v1 /v1/* /api/v1/* /api/v1beta/* /a2a /a2a/* /api/a2a /api/a2a/* /.well-known/agent.json /api/.well-known/agent.json
    handle @shiguang-gatewayEdge {
        route {
            request_header -X-SG-Identity
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
            reverse_proxy shiguang-gateway-edge:8787 {
                header_up -Cookie
                header_up -Authorization
            }
        }
    }

    # 实时 WebSocket/SSE → realtime
    @shiguang-gatewayRealtime path /live-ws /live-ws/*
    handle @shiguang-gatewayRealtime {
        route {
            request_header -X-SG-Identity
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
            reverse_proxy shiguang-gateway-realtime:20132
        }
    }

    # 管理 API → control-api(注入 X-SG-Identity 断言)
    @shiguang-gatewayAPI path /api/*
    handle @shiguang-gatewayAPI {
        route {
            request_header -X-SG-Identity
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
            reverse_proxy shiguang-gateway-control:8788 {
                header_up -Cookie
                header_up -Authorization
                header_down -Set-Cookie
            }
        }
    }

    # 其余路径(SPA 入口)→ 前端，也需登录(forward_auth)
    handle {
        route {
            request_header -X-SG-Identity
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
            reverse_proxy shiguang-gateway-control:8788 {
                header_up -Cookie
                header_up -Authorization
                header_down -Set-Cookie
            }
        }
    }
}
```

> 说明：
> - `/live-ws/*` 是独立 realtime 服务的 WS 长连接；`/api/v1/*`、`/v1/*` 由 edge-gateway 处理。
> - `X-SG-Required-Entitlements: shiguang-gateway:access` 要求登录用户具备该 entitlement；
>   管理权限(`system:admin`)由 control-api 侧二次校验(X-SG-Identity claims 里 roles/entitlements)。

## 2. 登录页 /login(可选)

`/login` 默认落在 shiguanglab.com(官网域)，由 website 提供。ShiguangGateway 域不需要自己的
`/login`——前端未登录时跳到 `https://shiguanglab.com/login?return_to=...`，登录成功后
父域 cookie(`__Secure-sg_session`)对 `shiguang-gateway.shiguanglab.com` 生效。

## 3. WS 长连接(live-ws)

独立实例的 realtime/live WS 独立监听 20132，前端通过
`wss://shiguang-gateway.shiguanglab.com/live-ws` 连接，无需暴露或发现内部实时服务端口。

## 4. 部署步骤

1. 把上面 host 块并入生产 Caddyfile(`/Users/yanxianliang/shiguang/deploy/access-gateway/Caddyfile`)
2. 将独立 `shiguang-gateway-edge`、`shiguang-gateway-control`、`shiguang-gateway-realtime` 容器加入网关所在 Docker network，Caddy upstream 使用
   `shiguang-gateway-control:8788`(control-api 提供管理 API 和 Admin 静态资源)
3. 执行 `cd /Users/yanxianliang/shiguang/deploy/access-gateway && ./deploy.sh`
4. 验证：`curl -I https://shiguang-gateway.shiguanglab.com/` 未登录应 302 到 shiguanglab.com/login
