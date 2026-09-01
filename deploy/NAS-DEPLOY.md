# Orbit Gateway NAS 部署

## 架构

GitHub Actions 在 `shiguang-lab/orbit-gateway` 的 `main` 或 `v*` tag 推送时构建
`linux/amd64` 和 `linux/arm64` 镜像并发布到 GHCR。NAS 不需要 Node、pnpm 或源码，只运行
仓库内的 `docker-compose.yml`，并把管理 API 请求转发到 NAS 上已有的 Orbit 服务。

```text
浏览器 → Access Gateway/反向代理 → orbit-gateway:8787
                                      └→ Orbit:20128 (NAS)
```

镜像只持有 Admin 静态文件与 BFF；数据库、Orbit 数据和管理 API key 都在 NAS/环境变量中，
不会写入镜像层。

## 首次部署

```bash
mkdir -p /volume1/docker/orbit-gateway
cd /volume1/docker/orbit-gateway
curl -fsSLO https://raw.githubusercontent.com/shiguang-lab/orbit-gateway/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/shiguang-lab/orbit-gateway/main/.env.example
cp .env.example .env
vi .env
docker compose pull
docker compose up -d
docker compose ps
docker compose logs -f orbit-gateway
```

`OMNIROUTE_NAS_API_TARGET` 必须是从容器内可访问的 Orbit 地址；如果 Orbit 是另一个
Compose 项目，使用 NAS 局域网地址或把两个项目接入同一个外部 Docker network。API key
必须是 Orbit 的 `manage` 或 `admin` scope，不能把 key 放进前端环境变量。

## 升级与回滚

推荐将 `.env` 中的镜像改成不可变 tag，例如 `ghcr.io/shiguang-lab/orbit-gateway:0.1.0`，
然后执行：

```bash
docker compose pull
docker compose up -d --remove-orphans
```

回滚只需把镜像 tag 改回上一个版本，再执行同样两条命令。`latest` 适合跟随 main，生产
建议使用版本 tag 或 `sha-<12位提交>`。

## 反向代理

反向代理 upstream 指向 `127.0.0.1:${ORBIT_GATEWAY_PORT:-8787}`；健康检查使用
`/api/healthz`。若接入现有 shiguang SSO，需要继续使用 `deploy/gateway-caddyfile.md` 中的
`X-SG-Identity`/JWKS 配置，并确保网关与该容器位于可互通网络。

## 当前边界

- Gateway 的业务数据代理是显式能力：生产必须设置 `OMNIROUTE_NAS_PROXY_ENABLED=true`。
- 不设置 `OMNIROUTE_NAS_API_TARGET` 时，BFF 会尝试加载 Orbit 引擎；本仓库镜像不包含 Orbit
  源码，因此这种模式仅适用于本地开发或与 Orbit 源码同机的开发环境。
- GHCR 首次发布后，需要在 GitHub Package settings 将镜像设为 Private/Public，并在 NAS
  配置 `docker login ghcr.io`（私有镜像）或保持匿名拉取（公开镜像）。
