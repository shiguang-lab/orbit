# Orbit NAS 部署

Orbit 在 NAS 上运行 console、gateway、control、realtime、worker 和 CLIProxy manager 六个常驻服务。现有 `orbit-data`、`orbit-home` 与 `orbit-node-data` 卷是唯一运行时数据源；不提供快照导入、数据迁移或恢复流程。

## 升级与回滚

在 `/volume1/docker/orbit-production` 备份 `.env`，将六个 `ORBIT_*_IMAGE` 变量统一设为同一个已发布 tag 或各自的不可变 digest，然后执行：

```bash
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

使用已发布版本回滚：

```bash
scripts/ops/rollback.sh <previous-release-tag>
```

升级不会修改数据卷、认证密钥或 CLIProxy 配置。不要用空卷替换现有数据卷。

## 运行验证

确认六个服务均为 healthy，并检查统一入口：

```bash
curl -fsS http://127.0.0.1:8787/healthz
curl -fsS http://127.0.0.1:8787/livez
curl -fsS http://127.0.0.1:8787/api/health
```

生产反向代理只连接 NAS 的统一入口 `100.87.115.78:8787`；control 与 realtime 端口仅 Docker 内网可达。

## CLIProxy manager

Control 通过 Docker 内网自动登记 NAS manager。保留 `.env` 中的 `ORBIT_CLIPROXY_MANAGER_*` 与 `CLIPROXY_MANAGER_*` 配置；不要在升级时重建其数据卷。
