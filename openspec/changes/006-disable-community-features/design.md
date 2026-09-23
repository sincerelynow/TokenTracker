# Design: 可配置停用社区功能

## Context

当前 Dashboard 在 `App.jsx` 中预加载排行榜，并在路由中直接处理排行榜、成就和公开用户资料；Sidebar 无条件展示社区入口。云同步完成后，`dashboard/src/lib/cloud-sync.ts` 调用 `tokentracker-leaderboard-refresh`。三个 GitHub Actions 只以 `TOKENTRACKER_INSFORGE_BASE_URL` 是否存在作为运行条件。个人 InsForge 同步与社区能力共用该 URL，因此不能用 URL 存在性关闭社区任务。

本变更只增加运行时/构建时开关，不删除社区实现和数据库对象。开关缺省开启，以兼容上游和已有部署。

## Architecture

```text
TOKENTRACKER_ENABLE_COMMUNITY_FEATURES
        ├── Vite define -> VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES
        ├── Dashboard community-features helper
        │     ├── Sidebar / AccountSection
        │     ├── App route guard + redirect
        │     ├── leaderboard preload
        │     └── cloud-sync refresh gate
        └── GitHub Actions repository variable -> 3 workflow job conditions

TOKENTRACKER_INSFORGE_BASE_URL
        └── 个人认证、用量上传和私人统计（不再作为社区任务开关）
```

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| `dashboard/src/lib/community-features.js` | 统一读取/规范化社区开关 | Add |
| `dashboard/vite.config.js` | 将部署变量暴露给浏览器构建 | Modify |
| `dashboard/src/App.jsx` | 社区路由重定向、禁用路由预加载 | Modify |
| `dashboard/src/ui/components/Sidebar.jsx` | 隐藏社区导航项 | Modify |
| `dashboard/src/components/settings/AccountSection.jsx` | 隐藏公共资料设置控件 | Modify |
| `dashboard/src/lib/dashboard-preload.js` | 禁止排行榜预加载 | Modify |
| `dashboard/src/lib/cloud-sync.ts` | 禁止社区关闭时刷新排行榜 | Modify |
| `.github/workflows/leaderboard-*.yml` | 独立控制后台任务 | Modify |
| `docs/personal-insforge.md` | 记录个人部署开关 | Modify |

## Data Flow

1. Vite 在构建时读取 `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，若未提供则由 helper 按 disabled 处理。
2. `App.jsx`、Sidebar、AccountSection 和 preload 使用同一个纯函数状态，避免各处对字符串独立解释。
3. cloud sync 仍执行 device token、queue 上传和 checkpoint 更新；仅在社区 enabled 时调用刷新 Edge Function。
4. GitHub Actions 先检查独立的 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` repository variable，再检查 InsForge URL；关闭时 job 被跳过。

## Technical Decisions

### Decision: 默认 disabled，只有显式 true 开启

- **Choice:** 缺失、空值和未知值均 disabled；`true`/`TRUE`/`1` enabled。
- **Reason:** 该分支面向个人自部署，未配置社区开关时不应运行排行榜和成就后台能力。
- **Alternatives:** 默认开启需要每个个人实例显式关闭，并会继续产生不必要的社区请求和调度成本。

### Decision: 保留历史 backend 和 migration

- **Choice:** 不删除社区 Edge Function、SQL migration、源码或测试；只停止调用/调度。
- **Reason:** 支持快速回滚、避免 migration 历史断裂，并减少 upstream 合并冲突。
- **Alternatives:** 新增 destructive cleanup migration 属于独立运维变更，不纳入本 change。

### Decision: 用 Vite 映射支持同一部署意图

- **Choice:** 构建侧接受 `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，由 `vite.config.js` 在未显式提供时读取 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`。
- **Reason:** 浏览器不能直接读取非 `VITE_` 环境变量，但自部署者仍可只维护一个语义一致的变量。
- **Alternatives:** 新增运行时配置 API 会扩大本 change 的接口和部署范围。

## Data and API Design

- Database: None。
- Existing Edge Functions/API: 保留不变，仅减少客户端调用。
- Configuration: 新增 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 和其 Dashboard 构建映射。
- GitHub Variables: 三个 workflow 使用 `vars.TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，同时保留 URL 作为 endpoint 来源。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 个人同步与社区任务解耦 | 需要维护 CLI、Vite 和 Actions 三个配置入口 | 三种运行环境的变量来源不同，显式映射比隐式推断可靠 |
| 可快速恢复社区能力 | 关闭时 backend 资源仍保留 | 本 change 目标是停用而非数据清理，保留对象降低回滚风险 |
| 不影响 upstream 社区源码 | 仍需保留社区测试 | 保留测试保证开关 enabled 时上游行为不被破坏 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Dashboard 构建未注入 Vite 变量 | Medium | helper 默认 disabled，并在构建/配置测试中覆盖映射和缺失值 |
| 只隐藏入口但深链仍显示页面 | High | App 在 route selection 前统一重定向，并覆盖 `/u/:userId` |
| 停止 refresh 后个人上传被误停 | High | cloud-sync 只包住 refresh 调用，不改变 upload/recovery 路径；测试验证 URL 仍可用 |
| Actions 变量拼写或条件错误 | Medium | workflow guardrail 测试要求三文件使用独立变量，并保留 endpoint URL |

## Rollout and Rollback

- **Rollout:** 先部署代码；默认 disabled。需要社区功能时，在 Dashboard 构建环境与 GitHub repository Variables 中设置 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES=true`，重新构建 Dashboard；Actions 条件即时按新变量生效。
- **Rollback:** 将该变量改为 `true` 并重新构建 Dashboard；workflow 变量改为 `true`。无需数据库回滚或 migration 操作。

## Open Questions

- None。
