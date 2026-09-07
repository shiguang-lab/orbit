# ShiguangGateway 独立实例部署

该部署包运行仓库内置的独立网关 runtime。应用容器与 PostgreSQL、Redis 分开编排；官方
Orbit 不在运行时依赖链中。应用当前仍以导入的 SQLite 快照作为权威库，PostgreSQL 负责
独立数据平面的迁移落库，待仓储层切换门禁通过后再将其设为权威库。

```text
浏览器 → Access Gateway/反向代理 → NAS:8787 → 独立 Admin nginx:8080
                                             ├→ control-api:8788 (管理 API)
                                             ├→ edge-gateway:8787 (模型 API)
                                             └→ realtime:20132 (WS/SSE)
                                      ├→ /app/data/storage.sqlite (当前快照权威库)
                                      ├→ PostgreSQL（独立持久化服务）
                                      └→ Redis（限流/配额/事件缓存）
```

## 首次部署

先按“独立基础设施（NAS）”章节启动 PostgreSQL/Redis 项目，确保 external 网络
`shiguang-gateway-infra` 已存在；再执行以下应用部署命令。

```bash
mkdir -p /volume1/docker/shiguang-gateway
cd /volume1/docker/shiguang-gateway
# 将本仓库的 docker-compose.yml、.env.example 与 deploy/ 目录复制到此目录
cp .env.example .env
vi .env   # 设置六个 SHIGUANG_GATEWAY_*_IMAGE 及 JWT/API key/加密密钥
docker build --target admin -t shiguang-gateway-admin:local .
docker build --target edge-gateway -t shiguang-gateway-edge:local .
docker build --target control-api -t shiguang-gateway-control:local .
docker build --target realtime -t shiguang-gateway-realtime:local .
docker build --target worker -t shiguang-gateway-worker:local .
docker build --target importer -t shiguang-gateway-importer:local .
docker compose up -d
docker compose ps
docker compose logs -f shiguang-gateway-edge
```

健康检查：`/livez`、`/healthz` 和 `/api/health`。

## 独立基础设施（NAS）

PostgreSQL 与 Redis 不再嵌入应用镜像，也不与应用进程共享文件系统。先创建独立项目并
固定凭据（密码不会写入仓库）：

```bash
mkdir -p /volume1/docker/shiguang-gateway-infra
cp deploy/docker-compose.infrastructure.yml /volume1/docker/shiguang-gateway-infra/compose.yml
cp -R deploy/postgres-init /volume1/docker/shiguang-gateway-infra/postgres-init
cp deploy/.env.infrastructure.example /volume1/docker/shiguang-gateway-infra/.env
cd /volume1/docker/shiguang-gateway-infra
vi .env   # 替换 POSTGRES_PASSWORD；生产保持 INFRA_BIND_ADDRESS=127.0.0.1
docker compose -f compose.yml up -d
docker compose -f compose.yml ps
# NAS ACLs can block bind-mounted init directories; run the idempotent bootstrap explicitly.
docker exec -i shiguang-gateway-postgres psql -U shiguang_gateway -d shiguang_gateway < postgres-init/001-schema.sql
```

该 compose 使用独立 named volume（`shiguang-gateway-postgres`、`shiguang-gateway-redis`）
和同名内网 `shiguang-gateway-infra`。应用 compose 将该网络声明为 external，必须先启动本基础设施
项目再启动应用；应用通过
`REDIS_URL=redis://redis:6379` 和 `QUOTA_STORE_REDIS_URL=redis://redis:6379` 使用 Redis。
Redis 只存限流、配额和事件等可重建状态，不替代数据库权威数据。

## SQLite 快照转换到 PostgreSQL

转换命令只读打开 `storage.sqlite`，在 PostgreSQL 的 `gateway` schema 中按原表名和列名
创建表并批量写入，记录源文件 SHA-256、表行数和导入时间到 `gateway._migration_runs`、
`gateway._table_manifest`。它不会修改源快照；目标 schema 已存在时必须显式提供
`--replace-schema`，避免误覆盖 NAS 上的其他数据库：

```bash
POSTGRES_URL='postgresql://shiguang_gateway:密码@127.0.0.1:25432/shiguang_gateway' \
  pnpm infra:migrate-postgres -- \
  --source-sqlite /volume1/docker/shiguang-gateway/frozen/storage.sqlite \
  --replace-schema
```

迁移后检查：

```bash
psql "$POSTGRES_URL" -c 'select * from gateway._migration_runs order by id desc limit 1'
psql "$POSTGRES_URL" -c 'select table_name, source_rows, imported_rows from gateway._table_manifest order by table_name'
```

该步骤是一次性数据转换和审计基线；在仓储层完成 PostgreSQL 读写、事务、FTS/vector
索引重建并通过全量接口验收前，不得删除 SQLite 快照或把 PostgreSQL 宣称为运行时权威库。
当前 NAS 快照结果记录在 `deploy/NAS-MIGRATION-20260905.json`：133 张普通表、59,982 行逐表
值校验通过；`memory_fts` 是 SQLite virtual table，已明确记录为待 PostgreSQL 原生全文索引重建，
因此本次结果不是最终数据库切换验收。

## 从 NAS 冷快照导入数据

在 NAS 维护窗口停止源实例写入，保留 `storage.sqlite`、WAL/SHM、备份、日志和运行制品，
将冷快照目录挂载到可执行 importer 的主机。源目录只用于一次性迁移和验收，独立实例运行时
不再访问源服务。目标 volume 必须为空或使用可恢复的 `--replace`：

```bash
pnpm install
pnpm import:source-data \
  --source-data-dir /path/to/frozen-source-data \
  --target-data-dir /volume1/docker/shiguang-gateway/data

# 如果启用的 OpenAI-compatible 连接在快照中缺少 endpoint，先准备 provider-config.json：
# {"<connection-id>": {"baseUrl": "https://真实上游/v1", "defaultModel": "模型名"}}
pnpm import:source-data \
  --source-data-dir /path/to/frozen-source-data \
  --target-data-dir /volume1/docker/shiguang-gateway/data \
  --provider-config-file /path/to/provider-config.json

# 或使用镜像内置 importer（将源目录挂载为 SHIGUANG_GATEWAY_SOURCE_DATA_DIR）：
SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/volume1/docker/shiguang-gateway/frozen \
SHIGUANG_GATEWAY_SOURCE_HOME_DIR=/volume1/docker/shiguang-gateway/source-home \
docker compose --profile migration run --rm shiguang-gateway-importer
```

Importer 会复制 `storage.sqlite`、WAL/SHM、备份、call logs、规则、任务文件和已安装的嵌入式
服务制品，执行 SQLite `integrity_check`，并写入 `gateway-import-manifest.json`（逐文件 SHA-256）。
Provider API key、OAuth access token 和 refresh token 保存在 SQLite 的
`provider_connections` 中，随数据库迁移。加密字段必须使用源实例原有的
`STORAGE_ENCRYPTION_KEY` 解密；各服务应继承同一密钥，不能在切换时生成新密钥替换。
CLI auth 文件、OS keychain、浏览器 profile、隧道状态和外部 CLI 二进制可能位于数据库之外，
应按启用 Provider 的实际依赖迁移。外部状态 allowlist 中源端本来不存在的可选文件，不代表
数据库凭据丢失，也不意味着所有连接都要重新授权。只有实际凭据缺失、无法恢复解密密钥，
或上游已撤销授权时，才需要为受影响的连接重新授权。

导入后必须执行 `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/volume1/docker/shiguang-gateway/data pnpm audit:provider-config`
以及 `SHIGUANG_GATEWAY_SOURCE_DATA_DIR=/volume1/docker/shiguang-gateway/data pnpm smoke:provider-matrix`。任何启用
Provider 缺 endpoint、凭据失效或真实上游请求失败，均阻止切换；不得用默认 URL、测试 URL
或伪造成功状态绕过门禁。

NAS 实测基线（2026-09-05 最新冷快照）为 15 个连接（14 个启用）、4 个 API key、3 个 combo、
18,613 条调用日志和 12,198 条 job run。Qoder 连接依赖 NAS 主机上的 `qodercli`；源实例也未安装该可执行文件，
因此迁移不会伪造或替换它，必须安装后再启用该连接。历史配置中出现过带
`qodercli-1.1.34` 后缀的自定义镜像，但当前官方镜像不包含该二进制；快照里的 Qoder 日志、缓存和
认证状态不能替代程序本身。独立发布时应在镜像构建阶段固定并验证经许可取得的 qodercli 版本，
或通过 `CLI_QODER_BIN` 指定宿主机上的绝对路径。发布前应在 NAS 原生 amd64 环境执行
冷导入校验、四服务健康检查、CLIProxyAPI `/healthz` 和完整 Provider 矩阵。

## 升级与回滚

生产使用本仓库构建并推送的六个不可变镜像 tag/digest。将 `.env` 中六个
`SHIGUANG_GATEWAY_*_IMAGE` 分别设置为对应 registry 地址后执行：

```bash
docker compose pull
docker compose up -d --remove-orphans
```

按同一个已发布 tag 回滚六个 split 镜像时，在仓库根执行：

```bash
scripts/ops/rollback.sh <previous-release-tag>
```

该脚本会设置六个 compose image 变量、拉取完整镜像族，并只重建常驻的 admin、edge、control、
realtime 与 worker；migration profile 下的 importer 只拉取、不启动。变量只作用于本次脚本调用，
后续手工执行 `docker compose up` 前还应把同一 tag 的六个地址持久化到 `.env`。若按 digest 固定镜像，六个
repository 的 digest 各不相同，应直接分别更新 `.env` 中六个 `SHIGUANG_GATEWAY_*_IMAGE`，不能向
脚本传一个共享 digest。升级前后保留 `shiguang-gateway_data` volume 和 importer manifest，禁止用空
volume 覆盖现有数据。

## 反向代理与 SSO

生产域名为 `llm-gateway.shiguanglab.com`，Caddy 只连接 NAS 主机的统一入口
`100.87.115.78:8787`：Web、`/api/*`、`/v1` 与 `/v1/*` 均由该入口转发到独立 Admin nginx
（其内部再连接 control-api/edge/realtime）。`8788`、`20132` 仅 Docker 内网可达，不能写入
生产 Caddy upstream。健康检查和切换前端到后端的逐端口验收见
[`gateway-caddyfile.md`](./gateway-caddyfile.md)。

本次替换部署复用现有统一认证：产品 `omniroute`、Audience `omniroute-api`、授权项
`omniroute:access`。在部署环境设置 `SG_IDENTITY_AUDIENCE=omniroute-api` 和
`SG_IDENTITY_ENTITLEMENT=omniroute:access`，并与 Caddy 的 forward-auth 请求保持一致。
更换业务镜像不要求 auth-service 新增 `shiguang-gateway:access` 或用户重新取得权限；
上线验收仍需通过真实登录和 forward-auth 验证。生产绝不可设置
`SG_DEV_IDENTITY` 或 `SG_LOCAL_BROKER_ENABLED`。

## 运维边界

- 默认是单节点 SQLite WAL；同一 volume 只允许一个写入实例。
- Redis、S3/MinIO、PostgreSQL、Qdrant 和 Chromium 是可选的扩展基础设施，不能替代 SQLite
  初始快照，也不能在未完成迁移/一致性演练前直接宣称 HA 已支持。
- Provider 上游 API 仍按管理员配置访问；这属于业务上游，不是网关运行时依赖。
