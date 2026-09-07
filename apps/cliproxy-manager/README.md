# CLIProxyAPI Instance Manager

Go 节点服务。每台 NAS 或 Linux 服务器运行一个 CLIProxyAPI 实例管理服务，管理本机多个 CLIProxyAPI 实例。
Orbit control 负责实例登记、控制台鉴权和状态存储；节点不依赖 Orbit 数据库或 Node.js。

## 技术选择

| 维度 | NestJS | Go（本应用） |
| --- | --- | --- |
| 与 Orbit 业务代码共享 | 同语言，适合控制端 | 通过 HTTP 协议与控制端协作 |
| 节点运行环境 | Node.js 和生产依赖 | 一个编译后的可执行文件 |
| 本任务核心工作 | 可以完成，需要独立整理现有本机单实例逻辑 | 标准库直接管理进程、HTTP、压缩包、校验和 |
| NAS 部署 | 需要 Node 运行时镜像 | 支持 Linux amd64/arm64 镜像和交叉编译 |

控制端继续使用 NestJS。节点选择 Go，以独立部署和进程管理为优先；不是用性能跑分决定框架。
构建需要 Go 1.26。生产支持 Linux amd64/arm64；macOS 支持本地开发和正常停止/重启。
Linux 子进程设置父进程死亡信号，避免 CLIProxyAPI 实例管理服务 异常退出后留下失管进程。

## 功能与边界

- 一个节点最多管理 500 个实例，各实例独立端口、配置、凭证目录、日志和版本目录。
- 从 `router-for-me/CLIProxyAPI` 官方 GitHub Releases 下载指定版本或 latest；下载流落盘，校验 SHA256 后解包。
- 安装/升级/启动/停止/重启通过异步任务执行，同一实例互斥，不阻塞其他实例。
- 安装后先启动验证，再恢复停止状态。升级维持原来的运行意图；启动失败恢复旧版本和配置。
- 升级检查点持久化；升级中断后，下次启动恢复已确认版本。凭证目录不回滚、不覆盖。
- desiredState 持久化；Linux 节点重启恢复运行中的实例，崩溃实例自动重试；显式停止不会自动启动。
- 上报节点平台、版本、运行时间、磁盘余量、可用的 Linux 系统指标、实例状态、探测延迟、恢复次数和最近任务。
- 系统负载和 `/proc/meminfo` 是内核视图，容器内不代表该容器的 cgroup 额度。
- 每实例进程日志限制为两个 2 MiB 文件，CLIProxyAPI 文件日志总量配置为 20 MiB；保留最近 200 个完成任务。
- 移除实例前必须停止；目录移入 `retired/`，保留凭证。历史版本和退役目录由运维按需清理。
- CLIProxyAPI 自带管理 API 处理凭证、OAuth、配置、模型映射。CLIProxyAPI 实例管理服务 不重写这些业务。
- 升级会短暂中断该实例的请求；当前不提供无损滚动升级或请求排空。

## 在 NAS 中部署

1. 启动 Orbit，进入「嵌入式服务 → CLIProxyAPI → 创建实例」。
2. 节点标识填 `nas`，地址填 `http://orbit-cliproxy-manager:8792`。
3. 在根 Compose 使用的环境文件中设置实例标识和名称：

```dotenv
ORBIT_CLIPROXY_MANAGER_ID=nas
ORBIT_CLIPROXY_MANAGER_NAME=NAS
```

4. 在仓库根目录运行：

```sh
docker compose --profile node up -d --build orbit-cliproxy-manager
```

根 Compose 将 NAS 节点接入 `orbit-infra` 网络，通过 `orbit-control:8788` 上报；默认不向宿主机发布管理端口。
CLIProxyAPI 实例管理服务 不挂载 Docker socket；它在自己的容器内管理 CLIProxyAPI 子进程，凭证保存在独立的 `orbit-node-data` 卷。
不要让两个 CLIProxyAPI 实例管理服务 同时挂载同一数据目录。

## 部署独立远程节点

1. 在 Orbit 登记远程节点，地址使用 Orbit 后端可以访问的 HTTPS 地址或私网地址。
2. 在远程服务器使用 cliproxy-manager 自身的部署配置；控制台只登记实例名称和地址，不生成或修改部署配置。
3. 确认 `CLIPROXY_MANAGER_REPORT_URL` 能从节点访问；它指向 Orbit 的 `/internal/service-nodes/<id>/report`。
4. 运行：

```sh
# 在 apps/cliproxy-manager 中
cp manager.env.example manager.env
# 编辑 manager.env 后：
docker compose up -d --build
```

独立 Compose 默认只发布 `127.0.0.1:8792`，通过本机反向代理提供 HTTPS。
私网直连可设置 `CLIPROXY_MANAGER_BIND=<服务器私网IP>`。Orbit 必须能主动访问 CLIProxyAPI 实例管理服务；上报连接不提供反向命令隧道。
反向代理必须将 `/internal/service-nodes/<id>/report` 转发给 control，且不能要求浏览器 SSO 登录。
仓库的 console nginx 与 Vite 配置已经包含该转发。

没有容器时可编译运行：

```sh
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -o dist/orbit-cliproxy-manager ./cmd/cliproxy-manager
# arm64 NAS 使用 GOARCH=arm64
# 由 systemd 等系统服务管理器注入环境变量并运行 dist/orbit-cliproxy-manager
```

## 环境变量

| 变量 | 说明 |
| --- | --- |
| `CLIPROXY_MANAGER_ID` | 必填；使用主动上报时与 Orbit 登记的实例 ID 一致 |
| `CLIPROXY_MANAGER_NAME` | 显示名称，默认主机名 |
| `CLIPROXY_MANAGER_DATA_DIR` | 状态目录；容器默认为 `/data` |
| `CLIPROXY_MANAGER_LISTEN` | 默认 `0.0.0.0:8792` |
| `CLIPROXY_MANAGER_REPORT_URL` | 可选的状态接收地址；control 每 15 秒主动刷新已登记实例 |
| `CLIPROXY_MANAGER_INTERVAL` | 默认 `15s`；控制端超过 60 秒未收到状态标为离线，建议不超过 `30s` |

Orbit 与 cliproxy-manager 之间通过可信内网地址通信，管理、推理及状态上报不配置访问密钥。此接口的访问边界由部署网络控制。
实例密钥保存在节点私有目录，状态接口和上报不包含密钥。节点目录权限 `0700`，状态和配置文件 `0600`。
管理接口具有节点上进程操作权限，只交给受信任的 Orbit 管理员。配置、凭证和日志按管理权限访问。

## API


| 方法 | 路径 | 含义 |
| --- | --- | --- |
| GET | `/v1/node` | 节点和实例快照 |
| GET / POST | `/v1/instances` | 列表 / 创建 |
| DELETE | `/v1/instances/:id` | 停止后移除并归档 |
| POST | `/v1/instances/:id/actions` | `{ "action": "install\|upgrade\|start\|stop\|restart", "version": "latest" }` |
| GET | `/v1/jobs/:id` | 查询任务结果 |
| GET | `/v1/instances/:id/logs` | 最近 64 KiB 进程日志 |
| 各方法 | `/v1/instances/:id/management/*` | 转发 CLIProxyAPI 管理 API，自动注入该实例管理密钥 |

创建输入：`{ "name": "香港实例", "port": 8317 }`，可选 `id`。
端口仅在节点内部监听 loopback，无需逐个公开。完整配置与调用密钥列表的读取和修改均被禁止，防止改变监督进程持有的端口、目录和认证约束；其他设置使用 CLIProxyAPI 的单项配置接口。

组合推理端点：`<实例地址>/v1/instances/<进程ID>/credentials/<凭据ID>/inference/v1`。
支持 `POST /chat/completions`、`POST /responses`、`POST /messages` 和 `GET /models`。
推理入口无需访问密钥，由服务注入 CLIProxyAPI 私有调用密钥；代理支持流式响应，客户端断开会取消上游请求。
创建实例时自动生成独立的管理密钥和调用密钥；浏览器无需填写 CLIProxyAPI 密钥。
模型和凭证由该实例的 CLIProxyAPI 提供，未授权账号的实例不会生成示例模型。

Orbit 控制端管理入口是 `/api/service-nodes`，沿用控制台鉴权与 CSRF；上报入口为
`POST /internal/service-nodes/:id/report`，校验已登记的实例标识与上报内容一致，按内部网络接口部署。

## 模型范围与凭据调度

- Orbit 中一个登记的 cliproxy-manager 对应一个 scope：`cpa-<登记ID>`，调用模型为 `cpa-nas/<模型名>`。
- `GET /v1/node` 和上报包含每个进程的 `credentials`：稳定 ID、名称、提供商、禁用状态、可调度状态、可用模型；不包含 OAuth token 或 CPA 密钥。
- control 将 scope 同步为一个 provider node，凭据同步为该 node 下无密钥的连接。共享模型按 ID 合并，新增凭据不会复制模型列表。
- 组合步骤使用现有 `providerId`、`connectionId`、`allowedConnectionIds`：单选固定凭据；多选限制调度及重试范围；不选则使用该 scope 内支持目标模型的可用凭据。
- manager 给文件凭据分配独占的内部模型前缀，持久化后等待 CPA 注册模型，再发布为可调度。每次推理检查当前模型归属，仅向 CPA 发送选定凭据的前缀模型；不会退回无前缀请求。
- 当前同步 CPA `auth-files` 暴露的文件凭据。未在该接口暴露的配置 API key 不会被虚构为连接；不能持久化独占前缀的运行时凭据不发布为可调度。错误原因显示在实例详情。
- 模型映射仍由 CPA 的 OAuth 模型别名管理；内部凭据前缀不作为对外模型名。修改别名后，新的可用模型随刷新同步到 scope。
- 停用、删除、失去模型或不健康的凭据不可调度。已删除凭据的连接 ID 保持停用，组合不会因此扩大范围；移除整个实例时删除其 scope、连接和模型目录。
- 推理执行器从已登记实例解析 manager 地址，并检查在线状态和凭据，不读取旧本地 CPA 地址或回退到本地端口。

## 验证

```sh
# 在 apps/cliproxy-manager 中
go test -race ./...
go vet ./...
CLIPROXY_TEST_BINARY=/absolute/path/to/official/cli-proxy-api go test ./internal/manager -run TestOfficialCredentialIsolation -v
ORBIT_TEST_LIVE_RELEASE=1 go test ./internal/manager -run TestLiveOfficialRelease -v

# 在仓库根目录
docker build -t orbit-cliproxy-manager:verification apps/cliproxy-manager
node scripts/smoke-cliproxy-manager.mjs
pnpm --filter @orbit/control exec tsx --tsconfig tsconfig.json --test test/service-nodes.test.ts
pnpm --filter @orbit/control typecheck
pnpm --filter @orbit/console typecheck
```

容器 smoke 使用临时卷，实际下载官方发行版，验证无访问密钥的管理与推理、状态上报、子进程崩溃恢复和容器重启恢复；结束后删除测试容器与卷。
