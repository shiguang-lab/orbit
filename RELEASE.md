# Orbit 发布流程

正式版本只通过 `v*` Git Tag 发布。推送 `main` 不构建或发布镜像，也不创建 GitHub Release。

## 1. 准备发布提交

在仓库根目录确认本地 `main` 与远端一致，并且准备发布的改动已经提交：

```bash
git switch main
git pull --ff-only origin main
git status --short
```

`git status --short` 必须为空。确定下一个未使用的语义化版本号，例如 `v0.1.18`，并确认本地和
远端都不存在同名 Tag：

```bash
VERSION=v0.1.18
git fetch origin --tags
if git rev-parse --verify --quiet "refs/tags/$VERSION"; then
  echo "本地版本已存在，请更换版本号"
  exit 1
fi
if git ls-remote --exit-code --tags origin "refs/tags/$VERSION" >/dev/null 2>&1; then
  echo "远端版本已存在，请更换版本号"
  exit 1
fi
```

## 2. 本地验证

至少运行与发布入口相关的构建和运行时检查：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm audit:gateway-independence
pnpm audit:route-contracts
pnpm smoke:route-imports
pnpm smoke:split-deployment
```

涉及生产数据或 Provider 配置时，还必须按 [README](./README.md#数据源) 执行
`pnpm audit:release-readiness` 和真实 Provider 验收。GitHub Actions 会再次执行完整门禁，本地通过
不能替代 Actions 结果。

## 3. 创建并推送版本 Tag

Tag 必须指向已经推送到 `origin/main` 的提交。使用 annotated Tag 保留发布说明：

```bash
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"
```

不要移动、覆盖或复用已经发布的 Tag。发布内容需要修改时，提交修复并创建新版本。

## 4. 等待 GitHub Actions

Tag 推送会触发 `Publish Orbit images`，并按以下顺序执行：

1. `Verify independent runtime`：安装依赖，执行类型检查、构建、测试、架构审计和运行时 smoke。
2. `publish`：依次构建并发布 console、gateway、control、realtime、worker、importer 和
   cliproxy-manager 七个 `linux/amd64` 镜像；四个常驻 Node 服务会先启动并通过健康检查再推送。
3. `Build GitHub Release assets`：七个镜像全部成功后创建 GitHub Release 和部署资产。

任一验证或镜像任务失败都会阻止 Release 创建。先修复根因并提交到 `main`，再创建新的版本 Tag；
不要从失败的旧 Tag 发布修改后的代码。

## 5. 核对发布结果

版本 `v0.1.18` 会为每个镜像生成以下 Tag：

- `0.1.18`
- `v0.1.18`
- `sha-<提交 SHA 前 12 位>`
- `latest`

镜像仓库为：

```text
ghcr.io/shiguang-lab/orbit-console
ghcr.io/shiguang-lab/orbit-gateway
ghcr.io/shiguang-lab/orbit-control
ghcr.io/shiguang-lab/orbit-realtime
ghcr.io/shiguang-lab/orbit-worker
ghcr.io/shiguang-lab/orbit-importer
ghcr.io/shiguang-lab/orbit-cliproxy-manager
```

GitHub Release 必须包含：

```text
orbit-<version>.source.tar.gz
orbit-<version>.source.zip
orbit-<version>-nas-deploy.tar.gz
SHA256SUMS.txt
```

下载后可校验资产：

```bash
sha256sum -c SHA256SUMS.txt
```

## 6. 更新 NAS

先备份当前 `.env` 和数据卷，再把 `.env` 中七个 `ORBIT_*_IMAGE` 变量统一更新为本次不可变版本
Tag，例如 `v0.1.18`。保留现有 `JWT_SECRET`、`API_KEY_SECRET`、`STORAGE_ENCRYPTION_KEY`、
数据库、CLIProxyAPI 配置和凭据，不要在升级时重新生成。

```bash
docker compose pull
docker compose up -d --remove-orphans
docker compose ps
```

升级后检查 console 页面、gateway/control/realtime 健康状态、worker 日志、CLIProxyAPI 实例注册、
凭据和模型映射，并完成一次真实模型调用。完整 NAS 操作和回滚方式见
[NAS 部署文档](./deploy/NAS-DEPLOY.md)。
