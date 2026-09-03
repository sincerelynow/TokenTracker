# Manual Integration Management Specification

## Requirements

### Requirement: REQ-001 启动阶段不得修改 AI 工具集成

系统 SHALL 在 `init` 和 `serve` 启动期间仅准备 TokenTracker 自身运行环境，不得安装、修复或卸载第三方 AI 工具的 Hook、notify 配置或插件。

#### Scenario: 首次初始化

- **Given** TokenTracker 尚未生成本地统计游标，且机器上存在受支持的 AI 工具配置
- **When** 用户启动 TokenTracker 或运行 `tokentracker init`
- **Then** TokenTracker 本地服务和统计存储可以初始化
- **And** 第三方 AI 工具配置保持不变

#### Scenario: 后续启动

- **Given** 用户已经手动卸载或删除某个 TokenTracker Hook
- **When** TokenTracker 再次启动
- **Then** 系统不得重新安装或修复该 Hook

### Requirement: REQ-002 Dashboard 手动管理集成

系统 SHALL 在本地 Dashboard 中列出可管理的实时集成，并允许用户逐个安装或卸载；被动读取型 provider SHALL 标明无需安装，而不提供虚假的安装操作。

#### Scenario: 安装单个集成

- **Given** 用户通过本地 Dashboard 打开集成管理，目标 provider 已检测且未安装
- **When** 用户点击该 provider 的安装操作
- **Then** 系统只安装该 provider 的 TokenTracker 托管集成
- **And** 返回并显示安装后的状态

#### Scenario: 卸载单个集成

- **Given** 目标 provider 已安装 TokenTracker 托管集成
- **When** 用户确认卸载
- **Then** 系统只移除 TokenTracker 托管内容并保留非 TokenTracker 配置
- **And** 返回并显示卸载后的状态

#### Scenario: 集成操作失败

- **Given** provider 配置不可写、CLI 缺失或安装命令失败
- **When** 用户执行安装或卸载
- **Then** Dashboard 显示该 provider 的失败原因
- **And** 其他 provider 状态和操作不受影响

### Requirement: REQ-003 定时统计

系统 SHALL 在 TokenTracker 运行期间定时解析本地 AI 工具数据，并避免同一调度器产生重叠同步。

#### Scenario: 普通 CLI 定时统计

- **Given** `tokentracker serve` 以普通 CLI 模式持续运行且没有 Hook 触发
- **When** 距上次调度达到五分钟
- **Then** 系统触发 `--auto --background --all-local-sources` 轻量同步
- **And** 上一次定时同步尚未结束时不启动第二个同步

#### Scenario: 原生桌面端定时统计

- **Given** macOS、Windows 或 Linux 原生客户端正在运行
- **When** 原生端现有后台统计周期到期
- **Then** 系统继续执行其现有本地后台统计
- **And** 本次变更不增加第二套通用五分钟调度器

### Requirement: REQ-004 Dashboard 手动触发统计

系统 SHALL 在本地 Dashboard 的集成管理区域提供显式的立即统计操作，并在同步结束后刷新展示数据。

#### Scenario: 手动统计成功

- **Given** 用户正在访问本地 Dashboard 且本地服务可用
- **When** 用户点击“立即统计”
- **Then** 系统触发一次完整本地同步并在执行期间禁用重复点击
- **And** 同步完成后刷新 Dashboard 统计并显示成功反馈

#### Scenario: 手动统计失败

- **Given** 本地同步进程失败或同步锁繁忙
- **When** 用户点击“立即统计”
- **Then** Dashboard 恢复按钮可用状态
- **And** 显示服务返回的可见错误，不仅写入控制台

### Requirement: REQ-005 Dashboard 配置多个 Codex 扫描根目录

系统 SHALL 允许本地用户配置多个相互独立的 Codex root，并在所有本地 Codex 用量统计和会话分析入口中使用同一组有效 roots。

#### Scenario: 同时统计两个独立目录

- **Given** `~/.codex` 和 `~/.codex-ipc` 分别包含不同的 Codex `sessions/` 会话
- **When** 用户在本地 Dashboard 保存这两个 root 并执行立即统计
- **Then** 两个目录的新用量都进入同一 TokenTracker 统计视图
- **And** 每个会话只计数一次，两个目录的游标互不覆盖

#### Scenario: 保存并移除自定义目录

- **Given** 用户已保存多个 Codex roots
- **When** 用户新增、修改或移除一个 root
- **Then** 服务端原子保存规范化、去重后的有效列表，并返回每个 root 的探测状态
- **And** 下一次手动或定时同步无需重启即可使用新列表
- **And** 移除 root 只停止未来扫描，不删除已经统计的历史用量

#### Scenario: 保持 CODEX_HOME 兼容

- **Given** 用户尚未保存 Dashboard Codex roots 配置
- **When** TokenTracker 执行同步、状态检查或会话分析
- **Then** 有效 root 仍为 `CODEX_HOME` 指定目录，未设置时为 `~/.codex`
- **And** 升级不会隐式增加第二个目录或改变既有统计范围

#### Scenario: 拒绝无效或不安全路径

- **Given** 请求包含空值、相对路径、文件路径、文件系统根目录、重复目录或超过数量上限的 roots
- **When** Dashboard 保存配置
- **Then** 重复目录被确定性合并，其他无效输入返回明确的 `400` 错误
- **And** 原有配置保持不变且不触发目录扫描

## Behavior

### Inputs

- provider ID：仅接受服务端声明的可管理 provider。
- action：仅接受 `install` 或 `uninstall`。
- 立即统计：不接受 provider 参数，执行完整本地统计。
- Codex roots：接受本地绝对目录或 `~/...`；服务端展开、规范化并按真实目录身份去重，最多保存 16 个。

### Outputs

- 集成查询返回 provider ID、名称、集成类型、是否检测到、是否已安装、是否可操作和状态详情。
- 安装/卸载返回操作结果及操作后的 provider 状态。
- 手动统计返回现有 local-sync API 的成功或错误响应。
- Codex roots 查询返回 `path`、`origin`、`exists`、`has_sessions`、`has_archived_sessions` 和当前配置来源；保存返回原子写入后的有效列表。

### Errors and Edge Cases

- 非本地 Dashboard 不展示集成管理操作。
- 未携带有效本地鉴权的写请求返回 `401`。
- 未知 provider 或 action 返回 `400` 或 `404`，且不得执行文件写入。
- 同一 provider 操作进行中时拒绝或合并重复操作。
- 非托管 Hook/插件不得被卸载操作删除。
- Codex roots 读写请求均要求有效本地鉴权；保存失败不得部分覆盖 `config.json`。
- 一个会话通过符号链接或重复 roots 被发现多次时只统计一次。

### Compatibility

- 本变更有意取消启动/初始化时自动安装和自动修复 Hook，不保留旧自动行为。
- 已存在的 Hook 不会因升级自动删除；其状态由 Dashboard 检测，用户自行卸载。
- 本地统计队列、游标和云同步协议保持不变。
- 已持久化 roots 优先于 `CODEX_HOME`；仅在没有持久化配置时保留现有 `CODEX_HOME -> ~/.codex` fallback。
- 移除 root 不生成历史负数或删除记录；历史统计保留。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 首次初始化；后续启动 | AC-001 |
| REQ-002 | 安装单个集成；卸载单个集成；集成操作失败 | AC-002, AC-003 |
| REQ-003 | 普通 CLI 定时统计；原生桌面端定时统计 | AC-004 |
| REQ-004 | 手动统计成功；手动统计失败 | AC-005 |
| REQ-005 | 同时统计两个独立目录；保存并移除自定义目录；保持 CODEX_HOME 兼容；拒绝无效或不安全路径 | AC-006, AC-007 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 启动零集成写入

- **Covers** REQ-001 / 首次初始化、后续启动
- **Preconditions** 临时 HOME 中存在各类受支持 provider 配置，TokenTracker 本地状态分别为空和已初始化
- **Action** 分别执行初始化流程和服务启动准备流程
- **Expected Result** provider 配置内容和文件清单不变，且未调用集成安装、修复或卸载函数
- **Verification** VER-001, VER-002

### Acceptance Criterion: AC-002 单 provider 安装卸载

- **Covers** REQ-002 / 安装单个集成、卸载单个集成
- **Preconditions** 临时 HOME 中仅配置目标 provider，并准备 TokenTracker 本地目录
- **Action** 通过 Integration Manager 和本地 API 依次安装、查询、卸载目标 provider
- **Expected Result** 仅目标 provider 状态按 `not_installed -> installed -> not_installed` 变化，非托管配置逐字保留
- **Verification** VER-003, VER-004

### Acceptance Criterion: AC-003 集成 API 安全与错误隔离

- **Covers** REQ-002 / 集成操作失败
- **Preconditions** 本地 API 已创建，测试请求分别缺失鉴权、携带未知 provider，并模拟单 provider 写失败
- **Action** 向集成写接口提交对应请求
- **Expected Result** 未授权请求返回 `401`，未知输入返回 `400/404`，provider 失败响应包含明确错误且不改变其他 provider
- **Verification** VER-004

### Acceptance Criterion: AC-004 五分钟非重叠定时统计

- **Covers** REQ-003 / 普通 CLI 定时统计、原生桌面端定时统计
- **Preconditions** 使用可控计时器和未完成的同步 Promise 启动普通 CLI 调度器，并对原生 shell 模式执行同一入口
- **Action** 推进计时器跨过两个五分钟周期
- **Expected Result** 普通 CLI 使用 `--auto --background --all-local-sources`，首次同步未完成时调用数保持为一；macOS/Linux 不创建额外调度器，Windows 保持既有兜底行为
- **Verification** VER-005

### Acceptance Criterion: AC-005 Dashboard 立即统计

- **Covers** REQ-004 / 手动统计成功、手动统计失败
- **Preconditions** 本地 Dashboard 集成管理区域已加载，并分别模拟 local-sync 成功和失败
- **Action** 点击“立即统计”按钮
- **Expected Result** 成功时只发起一次完整 local-sync、按钮在等待期间禁用，并在完成后刷新 Dashboard usage statistics 与集成状态；失败时按钮恢复且页面呈现服务错误
- **Verification** VER-006, VER-007

### Acceptance Criterion: AC-006 多 Codex roots 端到端统计

- **Covers** REQ-005 / 同时统计两个独立目录、保存并移除自定义目录
- **Preconditions** 临时 HOME 下准备 `.codex` 与 `.codex-ipc`，分别写入唯一会话，并启动本地 API 与 Dashboard
- **Action** 在 Dashboard 保存两个 roots，执行立即统计，再移除 `.codex-ipc` 后追加新会话并再次同步
- **Expected Result** 首次同步同时计入两个目录且无重复；移除后仅 `.codex` 的新增用量继续进入统计，既有 `.codex-ipc` 历史用量仍保留；设置无需重启生效
- **Verification** VER-013, VER-014, VER-015, VER-016

### Acceptance Criterion: AC-007 路径安全与向后兼容

- **Covers** REQ-005 / 保持 CODEX_HOME 兼容、拒绝无效或不安全路径
- **Preconditions** 分别准备无持久化配置、带 `CODEX_HOME`、带重复/符号链接 roots、无效路径和超过 16 个 roots 的环境
- **Action** 查询有效 roots，并通过本地 API 提交各类配置
- **Expected Result** 无配置时保持单 root 旧语义；有效目录被规范化去重；未授权请求返回 `401`，无效请求返回 `400` 且原配置逐字不变；同步、status、diagnostics 和 session analytics 使用一致 roots
- **Verification** VER-013, VER-014, VER-016
