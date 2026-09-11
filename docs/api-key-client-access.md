# API Key 调用方访问控制

在 API Key 的创建或编辑表单中设置「调用方 IP 白名单」，支持 IPv4、IPv6 和 CIDR，每行一项；留空允许所有 IP。网关在进入业务路由前校验，不匹配返回 HTTP 403，错误码 `ip_not_allowed`。

列表的「调用来源」展示最近一次通过 Key 鉴权及 IP 校验的网关请求：IP、客户端上报的 User-Agent、时间。该时间不代表模型调用成功；User-Agent 可由调用方修改，只用于观察来源。开启「不记录日志」会清除已有来源并停止记录。

网关默认使用连接的实际对端 IP，不信任调用方提供的转发头。部署在反向代理后时，在网关进程配置 `EDGE_TRUSTED_PROXIES` 为可信代理的 IP/CIDR（逗号分隔），由 Fastify 按可信代理链解析 `X-Forwarded-For`。例如仅本机代理使用 `127.0.0.1,::1`；不要配置为所有地址。代理必须正确追加或重写转发头。

来源信息保存在 `api_keys` 的 `last_client_ip`、`last_client_user_agent`、`last_client_at` 列中，仅保留最近一条，重启后仍可查看。升级时自动执行数据库迁移。
