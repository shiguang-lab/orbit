# OmniRoute Web/BFF 重构迁移规范

本规范适用于后续所有页面、菜单单元和功能模块的重构迁移。目标是更换 Web 与 HTTP/BFF 实现，同时保持原 OmniRoute 的数据来源、业务逻辑、功能和用户行为不变。

## 1. 重构边界

- **允许重构**：Admin Web、BFF HTTP 路由、前后端契约、鉴权接入和页面展示组件。
- **保持不动**：Orbit 底层引擎、数据库模型、Provider 实现、业务规则、计算逻辑和持久化语义。
- BFF 通过 engine adapter/shim 调用原有底层能力，不在 BFF 中复制或重新发明业务逻辑。
- 除非需求明确要求修改底层，否则不得改动底层来迁就新页面或新 BFF。

## 2. 基本迁移单元

一个页面或菜单功能必须作为一个完整迁移单元交付：

1. 原页面 UI 与全部交互状态；
2. 原页面依赖的所有 HTTP、SSE、WebSocket 和轮询数据源；
3. 对应的 BFF 路由、鉴权、参数校验、错误处理与数据脱敏；
4. BFF 到原 Orbit 引擎或 NAS Orbit API 的适配（按部署形态选择，不能改变数据权威来源）；
5. 前后端共享契约和必要的测试、构建及浏览器验证。

不得只做静态页面后再补数据，也不得只迁主列表而遗漏详情、弹窗、抽屉、向导、批量操作或辅助接口。

## 3. 原项目一致性要求

迁移前必须阅读原项目源码，并以原源码为功能事实来源；运行中的线上系统用于视觉和行为对拍。不得仅凭截图或页面印象推测实现。

必须保持以下内容与原项目一致：

- 数据来源和接口组合，包括并行请求、依赖请求和条件请求；
- 请求方法、参数、默认值、分页、筛选、排序和搜索语义；
- 数据聚合、状态计算、权限判断、Feature Flag 和设置项逻辑；
- 创建、编辑、删除、测试、启停、批量操作等完整业务流程；
- Loading、Empty、Error、Partial Error、Disabled 和只读状态；
- 缓存、刷新、轮询、重试、失效更新以及 SSE/WebSocket 行为；
- 字段脱敏、敏感信息隐藏和错误提示语义；
- 路由、深链、返回路径、选中态和菜单可见性。

禁止使用硬编码、Mock 数据或前端临时计算替代原有真实数据源。原页面使用配置驱动时，新页面也必须通过 BFF 接入同一配置来源。

## 4. Web UI 迁移要求

- UI 是对原页面的组件体系翻译：将原实现迁移为 React、antd 标准组件和项目主题 Token，而不是重新设计产品。
- 保持原页面的信息架构、功能入口、字段、文案含义、交互顺序和状态表达。
- 优先使用 antd 的 `Menu`、`Table`、`Form`、`Modal`、`Drawer`、`Tabs`、`Card`、`Alert`、`Empty`、`Skeleton` 等标准组件及其默认交互行为。
- Web 样式统一使用 `antd-style` 的 `StyleProvider`、`createStyles`、`createGlobalStyle` 和主题 Token；业务代码不得新增或继续依赖 `.css`、`.less`、CSS Modules 或手写全局样式文件。
- Header、侧栏、菜单、页面容器等主题相关样式必须从 `antd-style` Token 派生，亮色/暗色模式不得通过重复 CSS 文件或固定主题颜色实现。
- 可以进行小范围视觉优化：排列、对齐、间距、字号、控件尺寸、信息密度、响应式布局、溢出处理和无障碍属性。
- 未经明确确认，不得进行大幅视觉重构，不得删除或合并功能，不得改变导航层级、核心操作位置、字段语义或工作流。
- 图标、菜单、Provider 元数据等原本由配置或数据源控制的内容，必须继续由对应数据源控制。
- 菜单图标的名称、颜色和状态样式也属于原 UI 视觉契约，必须完整复刻，不能让未配置项退回浏览器默认色。
- Providers 卡片的认证/来源类型按原页面使用彩色圆点表达，圆点必须通过 Tooltip 提供完整分类名称；免费额度使用独立绿色圆点，不得改回文字标签堆叠。
- Provider 风险提示只在标题右侧显示单个问号图标，完整风险说明通过 Tooltip 展示；风险文案和变体必须来自 catalog/BFF，不得在卡片上堆叠“注意”文字标签。
- Provider Logo 必须复用 Orbit 的官方资源解析顺序：兼容节点自定义 `iconUrl` 优先，其次本地 `/providers/{id}.svg`，再回退官方 LobeHub 图标，最后才使用文字/通用图标；不得用随机字母 Avatar 替代已存在的官方 Logo。
- 页面根容器与宽度规范：所有管理列表页、仪表盘、监控分析与配额管理页面的根容器一律统一使用自适应全宽 `width: "100%"`，**严禁随意设置 `maxWidth`（如 `maxWidth: 1440`）或 `margin: "0 auto"`**，确保在宽屏显示器下自适应铺满工作区。仅有特殊单列长表单或独立向导（如 `provider-editor`）允许设置明确的居中最大宽度（如 `maxWidth: 860`）以保障表单填写的聚焦体验。
- 加载状态与骨架屏规范：全局路由懒加载分包、菜单切换以及业务页面首屏数据拉取时，一律统一接入 `PageSkeleton` 骨架屏组件，**禁止使用左上角孤立的 Spin 转圈或屏幕大面积空白跳动**，确保全站交互平滑连贯。
- 应用外壳侧栏必须保留 asset-hub 同类的 Header/品牌区域；菜单内容位于其下方，并提供基于实际菜单数据的搜索入口。

## 5. BFF 迁移要求

- Admin Web 只访问 BFF，不直接访问 Orbit HTTP 路由、数据库或第三方管理接口。
- BFF 路由应覆盖原页面实际使用的全部接口，并保持对前端可观察的业务语义一致。
- BFF 只负责 HTTP 边界能力：鉴权、CSRF、参数校验、错误信封、requestId、数据投影、脱敏以及引擎调用编排。
- 数据查询和业务决策必须调用原 Orbit 引擎；本地 Web+BFF 开发形态通过 NAS API 代理调用 NAS 上的 Orbit，
  不得打开本机 SQLite 作为业务数据回退，也不得在 BFF 中另建一套业务实现。
- 不得为了省事返回完整数据库行或完整 settings；只投影页面需要的字段，敏感字段默认不返回。
- 前端和 BFF 的请求/响应类型应同步维护；新增接口时优先补充 `packages/contracts` 中的共享契约。
- 原接口存在部分失败、批处理结果或兼容分支时，BFF 必须保留这些行为，不能简化为单一成功/失败。

标准数据链路（本地开发）：

```text
Admin Web -> /api/* -> 本地 BFF -> NAS Orbit API -> NAS 数据库/Provider
```

同机部署（BFF 与 Orbit 位于同一台服务器）才允许使用 engine adapter/shim：

```text
Admin Web -> /api/* -> BFF -> engine adapter/shim -> Orbit engine -> 同机数据库/Provider
```

本地 NAS 代理必须使用服务端 `OMNIROUTE_NAS_MANAGEMENT_API_KEY`（manage/admin scope）或显式启用的
SSO broker；不得把 NAS key、Cookie 或身份 Token 注入前端。未配置远端认证时返回明确的 503，禁止静默切换到本地库。

## 6. 公共滚动容器

- 所有应用级滚动容器统一使用 `@shiguang2/components` 的 `Scrollbar`，包括侧栏菜单、主内容区、页面面板、长列表和宽表格容器。
- 不得在业务页面新增 `overflow: auto`、`overflow-y: auto`、`overflow: scroll` 等原生滚动容器来替代公共组件。
- 使用 `Scrollbar` 时必须明确滚动方向（通常 `scrollX={false}`），并保证父级有稳定的 `height`/`flex`/`min-height: 0` 约束，避免滚动层失效或把页面撑开。
- antd 等组件内部已经自带且无法替换的内部滚动机制可以保留；其外层页面滚动仍必须由 `Scrollbar` 承载。
- 新页面应复用 asset-hub/website 已采用的 `@shiguang2/components` 版本和 API，不得在 `@omniroute/ui` 或业务目录重复实现同名滚动条。

## 7. 允许与禁止的差异

允许的差异：

- 由 antd 标准组件带来的轻微外观差异；
- 不改变功能语义的间距、对齐、大小和响应式优化；
- BFF 内部代码结构、类型安全和错误封装方式的改善；
- 明确修复原 UI 的小型可用性问题，并在迁移记录中说明。

禁止的差异：

- 缺少原页面接口、字段、状态、弹窗、操作或刷新机制；
- 用静态数组、占位数据或前端假状态代替 BFF 数据；
- 因新 UI 实现方便而修改业务规则；
- 未经确认改变页面信息架构或进行大规模视觉重设计；
- 暴露原接口未暴露的密钥、Token、Header、Cookie 或完整内部配置。

## 8. 每个页面的迁移记录

开始实现前，应在任务说明或迁移记录中列明：

- 原页面源码路径和路由；
- 原页面调用的全部数据源；
- 要迁移的 BFF 路由与对应引擎方法；
- 页面组件、弹窗、抽屉、Tab 和主要状态清单；
- 与原项目存在的预期差异及原因；
- 本次验证命令和浏览器对拍范围。

未完成上述盘点前，不应直接按截图开始编写页面。

## 9. 完成标准（Definition of Done）

页面只有同时满足以下条件才算迁移完成：

- 菜单和路由可进入真实页面，不是 placeholder；
- 页面所有数据来自 BFF，浏览器网络请求中没有绕过 BFF 的业务接口；
- BFF 已连接原 Orbit 引擎和真实数据，未使用 Mock 或硬编码替代；
- 页面功能、数据逻辑、状态和异常分支与原项目一致；
- 原页面的弹窗、抽屉、向导、Tab、批量操作和详情入口均已覆盖；
- 仅存在本规范允许的小型 UI 优化；
- 敏感字段投影和权限边界经过检查；
- 相关 typecheck、测试和生产构建通过；
- 页面新增的滚动区域均使用 `@shiguang2/components` `Scrollbar`，并完成滚动尺寸验证；
- 在浏览器中与原页面完成主要路径、空态、错误态和响应式对拍；
- 任何有意差异均已记录并得到确认。

## 10. Providers 页面迁移记录

- **原页面源码**：`Orbit/src/app/(dashboard)/dashboard/providers/page.tsx`、`providerPageUtils.ts` 及 `components/ProviderCard.tsx`、`ProviderSummaryCard.tsx`。
- **原页面数据源**：`/api/providers`、`/api/provider-nodes`、`/api/providers/expiration`、`/api/settings`、`/api/providers/openrouter-stats`；创建/编辑/删除/测试继续使用对应 `/api/providers*` 路由。
- **当前 BFF 链路**：本地开发时上述接口由 `apps/bff/src/lib/nasProxy.ts` 转发到 `OMNIROUTE_NAS_API_TARGET`（本项目本地配置为 `http://100.87.115.78:20128`），不读取本机 Orbit SQLite；仅同机部署未配置 NAS target 时才由 `apps/bff/src/lib/engine.ts` 调用 Orbit 模块。
- **页面结构**：Admin 使用 antd 标准 `Card`、`Alert`、`Segmented`、`Table`、`List`、`Switch`、`Empty` 等组件，按原页面分区展示：API 密钥兼容提供者（含 Anthropic/OpenAI 添加入口）、OAuth、IDE、Web Cookie、LLM、聚合器与网关、企业与云、嵌入与重排序、图像、视频、免鉴权、本地、搜索、网页抓取、音频、代理和云代理；Provider 卡片在宽屏下保持四列栅格。catalog 只作为配置驱动元数据，不作为伪造连接数据。
- **详情迁移范围**：`/dashboard/providers/:id` 已接入连接详情、凭证编辑（脱敏）、启停、删除、单连接测试、模型读取/自定义模型增删、参数过滤规则和搜索/网页抓取拦截规则；对应 BFF 通过 `providers.ts` 与 Orbit DB/引擎适配器连接。
- **详情迁移**：`apps/admin/src/features/providers/provider-detail.tsx` 按 catalog/serviceKinds/node 数据分流实现标准 API、OAuth/Web Cookie/IDE、兼容端点、免鉴权、搜索/Web Fetch、上游代理详情；连接表、测试、启停、删除、模型目录、参数过滤器、拦截规则和 Web Fetch Playground 均经 BFF 接入。详情路由按 Provider ID 聚合连接，编辑路由按连接 ID 单独处理。
- **验收边界**：列表页不再以单一自定义 provider 分组替代原分区统计；OAuth/CLI/浏览器授权的专属导入向导、模型实时发现/同步高级操作、兼容节点编辑和其余原页面弹窗仍需按本规范补齐对应 BFF 后，才可将 Providers 菜单项从“进行中”改为“已迁移”。

## 10.1 首页迁移记录

- **原页面源码**：`Orbit/src/app/(dashboard)/home/page.tsx`、`dashboard/HomePageClient.tsx`、`home/HomeRecentRequests.tsx`、`dashboard/HomeProviderTopologySection.tsx`。
- **线上结构**：顶部合作伙伴/公告 Banner、Quick Start 四步卡片、Provider Topology 拓扑、Recent Requests 实时列表；拓扑和请求列表受 Appearance 设置控制，并使用轮询与 WebSocket 请求流。
- **当前实现**：`apps/admin/src/features/home/home.tsx` 使用 antd + antd-style 复刻上述结构；公告 Banner 支持本地持久化关闭，Quick Start 保持四步 2×2 布局，Provider Topology 使用 `@xyflow/react` 按 Orbit `ProviderTopology` 的环形布局、Handle/Edge 状态优先级、Provider/catalog/provider-nodes 图标与标签、实时指标和自动 fitView 进行实现，节点可点击进入 Provider 详情；连接健康状态遵循 Orbit 的 `isProviderConnectionConnected/isProviderConnectionErrored` 语义，最近使用只由全局 `lastProvider` 标记，不把所有 24 小时内有指标的 Provider 错误/最近化；Recent Requests 使用 BFF 日志数据与公共 Scrollbar，左右卡片等高且列表内部滚动。首页不再额外添加官方不存在的“系统状态”卡片，也不渲染重复的页面标题。
- **BFF 链路**：`apps/bff/src/routes/home.ts` 在同机模式投影 `/api/models`、`/api/provider-metrics`、`/api/usage/call-logs`、`/api/system/version`；本地开发由 NAS 代理转发这些接口。Web 永远不得直连 Orbit API。
- **安全边界**：版本接口只返回版本投影，日志/指标不返回敏感凭证；首页实时 WS 仅在拓扑开启时建立，避免无条件连接和后台轮询。
- **有意差异**：Orbit 的 Electron 自动更新和服务端升级 SSE 依赖桌面/部署运行时，Admin Web 当前仅展示版本状态，不提供升级按钮；接入前必须单独迁移并增加确认和权限校验。

## 11. 菜单迁移标准作业流程（强制）

后续任何菜单或页面迁移都必须按本节执行。一个菜单项不是一个视觉页面，而是一个可从菜单进入、能读取真实数据、完成全部操作并通过验收的端到端迁移单元。

### 11.1 迁移单元定义

每个迁移单元必须明确以下边界：

```text
菜单项/路由
  ├─ 主页面及所有子路由
  ├─ 页面内 Tab、详情、抽屉、弹窗、向导、批量操作
  ├─ GET/POST/PUT/PATCH/DELETE/SSE/WebSocket/轮询数据源
  ├─ BFF 路由与共享契约
  ├─ engine adapter 对 Orbit 的调用
  ├─ 鉴权、CSRF、权限、Feature Flag、脱敏
  └─ 类型检查、构建、接口和浏览器验收
```

以下任一项缺失，菜单项只能标记为“进行中”，不得标记为“已迁移”：

- 菜单可以进入但页面仍为 placeholder；
- 主列表可用但详情、编辑、创建、删除、导入、授权或批量操作缺失；
- 页面有按钮但没有真实 BFF 请求；
- BFF 有路由但未接入原 Orbit 引擎；
- 只验证了正常态，未验证空态、错误态、权限态和刷新/重试。

### 11.2 阶段一：源码盘点（先读后写）

实现前必须同时检查原项目源码和线上页面。截图只能用于视觉对拍，不能作为业务事实来源。

盘点顺序固定为：

1. 从菜单配置、路由表和页面入口确认完整路由树及 selected 状态规则；
2. 阅读页面组件、子组件、hooks、utils、server actions 和 API route；
3. 列出所有请求：地址、方法、参数、默认值、依赖关系、缓存、轮询、SSE/WebSocket 和错误处理；
4. 列出所有交互：搜索、筛选、排序、分页、创建、编辑、删除、启停、测试、导入导出、批量操作、弹窗/抽屉/向导；
5. 列出所有状态：loading、empty、partial error、全量 error、disabled、permission denied、expired、success 和 optimistic update；
6. 记录数据字段来源、聚合规则、权限判断、设置项和 Feature Flag；
7. 用线上页面核对布局、文案、图标、颜色、尺寸、响应式和主要操作路径。

源码盘点必须形成“迁移清单”，禁止边看截图边猜接口、字段或交互。

### 11.3 阶段二：建立菜单与路由契约

先建立路由契约，再写组件：

- 菜单 `key`、标题、图标、图标颜色、路径和父子层级来自菜单数据源；
- 侧栏可见性、排序、隐藏项和 selectedKeys 必须由 BFF 返回的设置与原菜单配置共同决定；
- 主路由、详情路由、新建路由、编辑路由和子 Tab 必须显式注册；
- 深链直接打开、刷新、浏览器后退/前进和返回列表必须可用；
- 未实现的路径必须继续显示为“进行中”，不能通过通配符 placeholder 冒充完成；
- 菜单 Header、品牌区、菜单搜索和侧栏滚动必须保留 asset-hub 的结构。

完成条件：从菜单和所有预期深链都能到达真实组件，且没有错误的 selected 状态或重复面包屑。

### 11.4 阶段三：设计 BFF 契约

对原页面的每个请求建立一行契约表：

| 页面动作 | 原接口 | BFF 路由 | 方法/参数 | 响应投影 | 引擎方法 | 鉴权/脱敏 |
|---|---|---|---|---|---|---|

BFF 实现要求：

1. 只暴露 `/api/*`，Web 不得直连 Orbit、数据库或第三方管理接口；
2. 路由必须复刻原接口的方法、参数校验、默认值、分页、筛选、排序和错误语义；
3. 通过 `apps/bff/src/lib/engine.ts` 调用原 Orbit 模块，不能在 BFF 重写业务规则；
4. 只投影页面需要的字段，API Key、Token、Cookie、Header 和完整 settings 默认不得返回；
5. 批处理必须保留逐项结果、部分失败和统计信息；
6. 需要新增或变更的前后端类型优先写入 `packages/contracts`，再由 Admin/BFF 引用；
7. 需要导入、导出或文件上传时，必须校验大小、数量、结构和敏感字段，不能直接把任意 JSON 写入数据库；
8. 路由注册、错误处理、requestId、CSRF 和鉴权必须走 BFF 的统一插件链。

标准链路必须可追踪：

```text
用户操作 → React Query/表单 → Admin /api → Fastify BFF
→ authz/CSRF/requestId → engine adapter → Orbit → 数据库/Provider
→ 投影/脱敏 → 页面状态更新
```

### 11.5 阶段四：实现 Web 页面

Web 实现必须按以下顺序：

1. 先接入真实 query/mutation 和共享类型，再实现展示；
2. 使用 antd 标准组件表达表格、表单、弹窗、抽屉、标签、状态、空态和错误态；
3. 使用 `antd-style` 的 `createStyles`/`createGlobalStyle` 和主题 Token，禁止新增 `.css`、`.less`、CSS Modules 或手写全局样式文件；
4. 所有页面级滚动容器使用 `@shiguang2/components` 的 `Scrollbar`，并设置稳定的 `height`、`flex` 和 `min-height: 0`；
5. 文字、图标、颜色、徽标、Tooltip、Logo、按钮位置和状态表达与原页面一致，只允许小范围对齐、间距、大小和响应式优化；
6. 组件事件必须阻止卡片/行级点击冒泡，避免“点击测试/开关却进入详情”；
7. 搜索、筛选、分页和排序必须明确是服务端还是客户端语义，不能在迁移中无意改变数据范围；
8. mutation 成功后必须按数据依赖失效并刷新相关 query；失败时保留错误信息，不得静默吞错；
9. 每个按钮都必须有真实处理逻辑；暂未实现的功能应隐藏或明确禁用，不得弹出“后续启用”的假入口。

### 11.6 阶段五：安全与运行边界

- 本地免登录只能由明确的 loopback dev identity 或本地 Broker 开关触发；生产环境不得读取或接受本地绕过配置；
- 不得为了调试在前端硬编码账号、密码、Token、Cookie 或关闭鉴权；
- 不得把线上账号复制进仓库或提交 `.env.local`；
- 不得把原始数据库行、providerSpecificData、第三方响应或错误堆栈直接返回浏览器；
- 未经用户明确要求，不启动开发服务、不占用端口、不修改外部环境；需要运行验证时优先使用 typecheck/build 和 Fastify 注入测试。

### 11.7 阶段六：验证顺序

每个迁移单元必须执行以下验证，且在迁移记录中写出命令和结果：

1. **静态验证**：检查路由、菜单、BFF 注册和所有按钮是否有处理函数；
2. **类型验证**：`pnpm --filter <app> typecheck`；
3. **BFF 验证**：使用 Fastify `inject` 或接口测试覆盖成功、参数错误、未找到、无引擎、部分失败、脱敏和权限拒绝；
4. **构建验证**：`pnpm --filter <app> build`，必要时执行根目录 `pnpm build`；
5. **浏览器主路径**：菜单进入、深链刷新、返回、搜索、筛选、创建、编辑、删除、批量操作、刷新和重试；
6. **浏览器状态路径**：loading、空数据、部分接口失败、全量失败、禁用、过期、权限不足和移动/窄屏；
7. **视觉对拍**：Header、侧栏、内容边界、卡片/表格、颜色、图标、Tooltip、滚动条和响应式；
8. **网络检查**：确认业务请求全部发往 `/api/*`，没有直连 Orbit 或第三方接口。

### 11.8 阶段七：交付与状态更新

迁移完成后必须更新 `MIGRATION_PLAN.md` 和页面迁移记录，至少包含：

- 原源码路径与路由；
- 菜单、页面、子路由和完整交互清单；
- 所有 BFF 路由、引擎适配和共享契约；
- 已知有意差异及原因；
- 验证命令、浏览器路径和未覆盖项；
- 状态：`待迁移`、`进行中`、`已迁移` 或 `阻塞`。

只有满足第 9 节 Definition of Done 且所有未完成项已关闭，才可以把状态改为“已迁移”。任何剩余 placeholder、假按钮、静态业务数据或未接入的详情/弹窗都必须保持“进行中”。

### 11.9 Provider 详情页类型矩阵

Provider 详情不能抽象成一个“API Key + Base URL”通用表单。实现前必须根据 Orbit 的 catalog、`serviceKinds`、Provider 常量和节点数据解析类型，并只渲染该类型拥有的区域：

| 类型 | 必须保留的官方区域/能力 | 不应渲染 |
|---|---|---|
| 标准 API / OAuth / Web Cookie / IDE | 连接列表、添加/编辑/测试/启停/删除、可用模型、模型筛选/测试/可见性、参数过滤器、相关授权入口 | 与该 Provider 无关的兼容端点配置 |
| OpenAI / Anthropic / Claude Code 兼容 | 兼容节点信息（协议、Base URL、模型路径、前缀）、节点编辑/删除、连接列表、兼容模型导入和模型兼容性设置 | 普通 Provider 专属字段的臆造 |
| 搜索 / Web Fetch | 连接列表、API Key/官方链接、搜索说明；Web Fetch 还要有 Playground（URL、格式、深度、运行/cURL）、参数过滤和网页工具拦截 | 可用模型列表、模型导入 |
| 免鉴权 | 免鉴权开关/说明、Provider 代理配置（若该 Provider 支持） | API Key 输入、OAuth 登录 |
| 上游代理 | 上游代理托管说明、运行时/路由设置入口、Provider 代理状态 | 直连连接表单、模型导入 |

类型判断必须来自 BFF 返回的真实 catalog/node 数据；只有兼容节点前缀这类 Orbit 明确定义的规则才允许使用前缀判断。新增类型时先补矩阵和接口，再补页面，避免所有详情页回退成同一表单。

## 12. AI 执行模板

后续将本项目交给任何 AI 时，任务说明必须要求它按以下模板执行：

```text
目标菜单/路由：
原项目源码：
线上参考地址：

先完成源码盘点并输出：
- 路由和菜单树
- 请求/响应/引擎映射表
- 页面交互和状态清单
- 弹窗、抽屉、向导、批量操作清单
- 安全、脱敏、Feature Flag 和滚动容器清单

再按 MIGRATION_SPEC.md 第 11 节实现：
- BFF 路由与 engine adapter
- contracts 类型
- Admin 页面与真实 query/mutation
- 路由和菜单接入
- antd + antd-style + Scrollbar

最后执行并报告：
- typecheck
- BFF inject/接口验证
- production build
- 浏览器主路径/异常路径/视觉对拍
- 未完成项和阻塞项

限制：不得使用 Mock 或静态业务数据，不得绕过 BFF，不得修改 Orbit 底层，
不得新增 CSS/LESS，不得启动服务或修改外部环境，除非用户明确授权。
```

AI 必须先报告盘点结果和假设，再开始修改；遇到原项目行为不确定时，应回到源码或接口验证，不得用截图推测后继续实现。
