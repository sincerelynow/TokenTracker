# Configurable Community Features Specification

## Requirements

### Requirement: REQ-001 Community feature flag resolution

系统 SHALL 提供一个默认关闭的社区功能开关；当部署配置明确为 `true` 时，Dashboard 将社区功能视为开启。

#### Scenario: 默认关闭

- **Given** 未设置开关，或开关值不是规范化的 `true`
- **When** Dashboard 初始化
- **Then** 社区功能状态为 disabled

#### Scenario: 显式开启

- **Given** 部署配置的开关值为 `true`、`TRUE` 或 `1`
- **When** Dashboard 初始化
- **Then** 社区功能状态为 enabled

### Requirement: REQ-002 Hide and redirect community UI

系统 SHALL 在社区功能关闭时隐藏排行榜和成就入口、公共资料设置，并将 `/leaderboard`、`/achievements` 和 `/u/:userId` 导航到 Dashboard。

#### Scenario: 社区入口隐藏

- **Given** 社区功能 disabled
- **When** 用户渲染侧边栏或账户设置
- **Then** 不显示排行榜、成就和公共资料控制项

#### Scenario: 社区 URL 回退

- **Given** 社区功能 disabled
- **When** 用户访问 `/leaderboard`、`/achievements` 或 `/u/:userId`
- **Then** 应用将用户重定向到 Dashboard，并且不加载对应社区页面

### Requirement: REQ-003 Skip client community work

系统 SHALL 在社区功能关闭时跳过排行榜默认预加载和云同步成功后的 `tokentracker-leaderboard-refresh` 调用。

#### Scenario: Dashboard 预加载

- **Given** 社区功能 disabled 且 Dashboard 主内容可见
- **When** 应用执行页面资源预加载
- **Then** 不调用排行榜数据预加载，也不创建排行榜预加载缓存

#### Scenario: Cloud sync completion

- **Given** 社区功能 disabled 且个人 InsForge 云同步成功
- **When** 自动同步或手动同步完成
- **Then** 不请求 `tokentracker-leaderboard-refresh`，用量上传结果保持不变

### Requirement: REQ-004 Independent scheduled-job switch

系统 SHALL 让三个排行榜 GitHub Actions 使用独立的社区功能变量控制，并允许在社区关闭时保留 `TOKENTRACKER_INSFORGE_BASE_URL` 用于个人同步。

#### Scenario: Scheduled jobs disabled independently

- **Given** GitHub repository variable `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 未设置或不为 `true`
- **When** 任一排行榜 workflow 由 schedule 或 dispatch 触发
- **Then** workflow 不执行扫描、freshness probe 或 moderation audit job

#### Scenario: Personal sync URL remains usable

- **Given** 社区功能 disabled 且配置了 `TOKENTRACKER_INSFORGE_BASE_URL`
- **When** CLI/Dashboard 执行个人云同步
- **Then** 仍使用该 URL 完成认证和用量上传，且不触发社区刷新

### Requirement: REQ-005 Preserve implementation and data compatibility

系统 SHALL 保留排行榜/徽章源码、测试和历史 migration，并在开关开启时保持现有社区行为。

#### Scenario: Re-enable community features

- **Given** 社区功能开关明确设置为 enabled
- **When** 用户打开 Dashboard 并完成云同步
- **Then** 现有社区入口、路由、预加载和刷新行为可用
- **And** 本变更不要求重新创建或删除已有数据库对象

## Behavior

### Inputs

- `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`：CLI/部署/workflow 变量；`true`、`TRUE` 或 `1` 表示开启，缺省表示关闭。
- `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`：Dashboard 构建时等价输入，由构建配置从前者映射。

### Outputs

- 社区关闭时产生 Dashboard 重定向到 `/dashboard`，不产生社区预加载或刷新请求。
- 社区关闭不改变个人用量上传响应和同步 checkpoint。

### Errors and Edge Cases

- 空字符串、未识别字符串和缺失变量均按 disabled 处理，确保个人自部署默认不运行社区能力。
- 已打开的社区 URL 在开关关闭后的下一次应用渲染中回退，不保证保留页面内部状态。
- workflow 未配置 InsForge URL 时仍跳过；社区开关是额外且独立的必要条件。

### Compatibility

- 这是本分支的有意默认行为变更；显式设置为 `true` 可恢复原有社区行为。
- 不删除公共 API、Edge Function、数据库 schema 或 migration；重新启用只需恢复配置并重新构建/部署 Dashboard（workflow 变量即时生效）。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 默认关闭；显式开启 | AC-001 |
| REQ-002 | 社区入口隐藏；社区 URL 回退 | AC-002 |
| REQ-003 | Dashboard 预加载；Cloud sync completion | AC-003 |
| REQ-004 | Scheduled jobs disabled independently；Personal sync URL remains usable | AC-004 |
| REQ-005 | Re-enable community features | AC-005 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 Flag default and normalization

- **Covers** REQ-001 / 默认关闭、显式开启
- **Preconditions** Dashboard 测试环境可注入 disabled、`true`、`TRUE`、`1` 和未知值
- **Action** 运行社区开关解析测试
- **Expected Result** 缺失/未知值断言为 disabled，`true`/`TRUE`/`1` 断言为 enabled
- **Verification** VER-001

### Acceptance Criterion: AC-002 UI hiding and redirect

- **Covers** REQ-002 / 社区入口隐藏、社区 URL 回退
- **Preconditions** Dashboard 使用 disabled 开关启动，路由初始地址分别为 `/leaderboard`、`/achievements`、`/u/user-1`
- **Action** 渲染 Sidebar 与 App，并检查导航项、设置控件和当前路径
- **Expected Result** 三个入口/公共资料控件不可见，三个地址均重定向到 `/dashboard`，对应页面模块未加载
- **Verification** VER-002

### Acceptance Criterion: AC-003 Client and sync suppression

- **Covers** REQ-003 / Dashboard 预加载、Cloud sync completion
- **Preconditions** disabled 开关、已登录账户和成功的个人 InsForge 上传 mock
- **Action** 运行预加载与 cloud-sync 测试并记录 fetch 调用
- **Expected Result** 无排行榜 preload、无 `tokentracker-leaderboard-refresh` 请求，上传请求仍成功
- **Verification** VER-003

### Acceptance Criterion: AC-004 Independent workflow control

- **Covers** REQ-004 / Scheduled jobs disabled independently、Personal sync URL remains usable
- **Preconditions** 三个 workflow 文本包含独立社区变量条件；个人 InsForge URL 已配置
- **Action** 运行 workflow guardrail 测试并检查同步配置测试
- **Expected Result** workflow 不再以 URL 变量作为唯一条件；个人同步仍读取 URL
- **Verification** VER-004

### Acceptance Criterion: AC-005 Preservation and re-enable compatibility

- **Covers** REQ-005 / Re-enable community features
- **Preconditions** 开关 enabled，源码、测试和历史 migration 保持存在
- **Action** 运行原有社区相关测试和 Dashboard 构建
- **Expected Result** 社区相关测试通过，构建成功，未删除相关源码或 migration
- **Verification** VER-005
