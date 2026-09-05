# ShiguangGateway 独立实例部署

该部署包运行仓库内置的独立网关 runtime。应用容器与 PostgreSQL、Redis 分开编排；官方
Orbit 不在运行时依赖链中。应用当前仍以导入的 SQLite 快照作为权威库，PostgreSQL 负责
独立数据平面的迁移落库，待仓储层切换门禁通过后再将其设为权威库。

```text
浏览器 → Access Gateway/反向代理 → shiguang-gateway-control:8788 (管理 API)
                                  ├→ shiguang-gateway-edge:8787 (模型 API)
                                  └→ shiguang-gateway-realtime:20132 (WS/SSE)
                                      ├→ /app/data/storage.sqlite (当前快照权威库)
                                      ├→ PostgreSQL（独立持久化服务）
                                      └→ Redis（限流/配额/事件缓存）
```

## 首次部署

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
和同名内网 `shiguang-gateway-infra`。应用 compose 与它加入同一网络；应用通过
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
API key/OAuth
refresh、CLI auth、OS keychain、浏览器 profile、隧道 token 和嵌入式服务二进制不在 SQLite
内，必须按迁移清单单独导入或重新授权。

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

回滚只需改回上一个镜像 tag。升级前后保留 `shiguang-gateway_data` volume 和 importer manifest，禁止
用空 volume 覆盖现有数据。

## 反向代理与 SSO

反向代理将 `/api/*` 指向 `127.0.0.1:${SHIGUANG_GATEWAY_CONTROL_PORT:-8788}`，将 `/api/v1/*`、`/v1/*` 指向
`127.0.0.1:${SHIGUANG_GATEWAY_EDGE_PORT:-8787}`，WebSocket/SSE 指向 `127.0.0.1:${SHIGUANG_GATEWAY_LIVE_WS_PORT:-20132}`。
健康检查使用各服务的 `/healthz`。
如接入 shiguang SSO，继续使用 `deploy/gateway-caddyfile.md` 的 JWKS 配置；生产绝不可设置
`SG_DEV_IDENTITY` 或 `SG_LOCAL_BROKER_ENABLED`。

## 运维边界

- 默认是单节点 SQLite WAL；同一 volume 只允许一个写入实例。
- Redis、S3/MinIO、PostgreSQL、Qdrant 和 Chromium 是可选的扩展基础设施，不能替代 SQLite
  初始快照，也不能在未完成迁移/一致性演练前直接宣称 HA 已支持。
- Provider 上游 API 仍按管理员配置访问；这属于业务上游，不是网关运行时依赖。
