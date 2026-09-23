# Change: 可配置停用社区功能

## Why

自部署 InsForge 实例主要用于个人用量同步时，排行榜、成就和公共资料会引入不必要的 UI、云端刷新、数据库计算和 GitHub Actions 运维成本。当前排行榜刷新仍在云同步成功后触发，三个监控工作流也只根据 InsForge URL 判断是否运行，无法表达“个人实例保留同步但不启用社区能力”的部署意图。

## What

- 增加默认关闭、可显式开启的社区功能开关 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，并为 Dashboard 构建提供对应的 `VITE_` 映射。
- 关闭时隐藏排行榜、成就和公共资料设置，相关 URL 回到 Dashboard，并跳过排行榜预加载和云同步后的排行榜刷新。
- 三个排行榜 GitHub Actions 使用独立的社区功能变量控制，不再把 `TOKENTRACKER_INSFORGE_BASE_URL` 当作启用条件。
- 保留排行榜/徽章源码、测试和历史 migration；本变更不删除数据库对象。

## Scope

### In Scope

- Dashboard 社区功能开关、导航、路由、预加载、公共资料设置和云同步行为。
- Vite 构建时的环境变量映射与个人 InsForge 文档。
- `.github/workflows/leaderboard-anticheat.yml`、`leaderboard-freshness.yml`、`leaderboard-moderation-audit.yml` 的独立开关。
- 针对配置解析、路由、预加载、同步和 workflow 条件的测试。

### Out of Scope

- 删除排行榜/徽章页面、API、Edge Functions、数据库表、RPC、cron 或历史 migration。
- 修改 token 解析、云端用量上传、账户认证和个人统计 API。
- 本变更有意将默认行为改为关闭；需要社区功能时必须显式开启。

## Success Criteria

- SC-001: 未设置开关或开关为非 `true` 值时，Dashboard 不展示社区入口，社区 URL 可确定地回到 Dashboard，且不产生排行榜预加载或刷新请求。
- SC-002: 关闭社区功能不影响个人 InsForge URL、登录、云端用量上传和 Dashboard 私人统计。
- SC-003: 三个 GitHub Actions 仅由独立社区变量决定是否运行，社区关闭时不会因个人 InsForge URL 存在而运行。
- SC-004: 开关显式设置为 `true` 时，现有排行榜、成就和公共资料行为保持不变。

## Dependencies and Constraints

- 浏览器构建只能读取 `VITE_` 前缀变量，因此构建配置需把 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 映射为 Dashboard 可读取的值。
- GitHub Actions 的仓库 Variables 与 Dashboard/CLI 部署环境可能不同，三者必须分别可配置。
- 历史 migration 保持不可变；不得通过删除 migration 回滚已部署对象。

## Open Questions

- 默认值采用 `false`；只有规范化后的字符串 `true` 或 `1`（大小写不敏感）开启功能。
