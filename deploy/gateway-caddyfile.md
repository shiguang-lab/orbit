# OmniRoute 网关接入 shiguang 统一 SSO —— Caddyfile 补丁

> 目标：让 `omniroute.shiguanglab.com` 走 shiguang 统一登录(登录页是 shiguang website)，
> 用户信息/权限由网关(Access Gateway → auth-service)提供，BFF 终结身份。
>
> 生产 Caddyfile：`/Users/yanxianliang/shiguang/deploy/access-gateway/Caddyfile`
> (与仓库 `access-gateway/Caddyfile` 模板需同步；改动走统一 deploy.sh 发布)

## 1. 在 Caddyfile 的 host 段加入以下块

按 asset-hub 的 host 块结构编写。`omniroute-admin`(前端 SPA)与 `omniroute-bff`(Fastify)
各自 upstream；`/api/auth/session` 走共享会话；`/api/*` 走 forward_auth 注入 `X-SG-Identity`。

```caddy
# ─────────────────────────────────────────────────────────────
# OmniRoute (omniroute.shiguanglab.com) —— 统一 SSO 接入
# ─────────────────────────────────────────────────────────────
@omniroute host omniroute.shiguanglab.com
handle @omniroute {
    # 前端 SPA 静态资源(公开，Admin 与 BFF 已合并为同一个镜像/进程)
    @omnirouteStatic path /assets/* /favicon.ico /favicon.svg /index.html
    handle @omnirouteStatic {
        route {
            request_header -X-SG-Identity
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy orbit-gateway:8787 {
                header_up -Cookie
                header_up -Authorization
                header_down -Set-Cookie
            }
        }
    }

    # 共享会话端点 → auth-service(同 asset-hub)
    @omnirouteSharedAuth path /api/auth/session /api/auth/logout /api/account/*
    handle @omnirouteSharedAuth {
        route {
            request_header -X-SG-Identity
            request_header -X-SG-*
            request_header -X-User-*
            reverse_proxy {$AUTH_SERVICE_UPSTREAM:auth-service:8081} {
                header_up X-SG-Gateway-Token {$GATEWAY_SHARED_TOKEN}
            }
        }
    }

    # 受保护 API → BFF(注入 X-SG-Identity 断言)
    @omnirouteAPI path /api/* /live-ws/*
    handle @omnirouteAPI {
        route {
            request_header -X-SG-Identity
            request_header -X-SG-*
            request_header -X-User-*
            forward_auth {$AUTH_SERVICE_UPSTREAM:auth-service:8081} {
                uri /v1/forward-auth
                header_up -Connection
                header_up -Upgrade
                header_up X-SG-Gateway-Token {$GATEWAY_SHARED_TOKEN}
                header_up X-SG-Product-ID omniroute
                header_up X-SG-Audience omniroute-api
                header_up X-SG-Required-Entitlements omniroute:access
                copy_headers X-SG-Identity
            }
            reverse_proxy orbit-gateway:8787 {
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
                header_up X-SG-Product-ID omniroute
                header_up X-SG-Audience omniroute-api
                header_up X-SG-Required-Entitlements omniroute:access
                copy_headers X-SG-Identity
            }
            reverse_proxy orbit-gateway:8787 {
                header_up -Cookie
                header_up -Authorization
                header_down -Set-Cookie
            }
        }
    }
}
```

> 说明：
> - `/live-ws/*` 是 WS 长连接。若 BFF 负责代理 WS 到 Orbit live server，则归 BFF；
>   若 WS 由网关直连 Orbit(20132)，需另配 upgrade 块(见下方"WS 长连接"注释)。
> - `X-SG-Required-Entitlements: omniroute:access` 要求登录用户具备该 entitlement；
>   管理权限(`system:admin`)由 BFF 侧二次校验(X-SG-Identity claims 里 roles/entitlements)。

## 2. 登录页 /login(可选)

`/login` 默认落在 shiguanglab.com(官网域)，由 website 提供。OmniRoute 域不需要自己的
`/login`——前端未登录时跳到 `https://shiguanglab.com/login?return_to=...`，登录成功后
父域 cookie(`__Secure-sg_session`)对 `omniroute.shiguanglab.com` 生效。

## 3. WS 长连接(live-ws)

OmniRoute 实时通道默认走独立端口 20132(live server)，前端通过
`GET /api/v1/ws?handshake=1` 发现地址。两种接入方式：

- **方案 A(推荐)**：BFF 代理 WS。前端连 `wss://omniroute.shiguanglab.com/live-ws`，
  网关把 `/live-ws` 转发给 BFF，BFF 用 WS 客户端转发到 Orbit 20132。单一入口、复用鉴权。
- **方案 B**：网关直连。Caddyfile 加 `reverse_proxy` upgrade 到 `omniroute-orbit-ws:20132`，
  需配置 `LIVE_WS_ALLOWED_ORIGINS` 允许 `omniroute.shiguanglab.com`。

## 4. 部署步骤

1. 把上面 host 块并入生产 Caddyfile(`/Users/yanxianliang/shiguang/deploy/access-gateway/Caddyfile`)
2. 将 NAS 上的 `orbit-gateway` 容器加入网关所在 Docker network，Caddy upstream 使用
   `orbit-gateway:8787`(Admin 与 BFF 是同一个镜像/服务)
3. 执行 `cd /Users/yanxianliang/shiguang/deploy/access-gateway && ./deploy.sh`
4. 验证：`curl -I https://omniroute.shiguanglab.com/` 未登录应 302 到 shiguanglab.com/login
