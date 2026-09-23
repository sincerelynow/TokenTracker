---
type: SEP
version: 1.2
title: "可配置停用社区功能"
change_id: "006-disable-community-features"
status: ready_to_archive
plan_revision: 2
approved_revision: 2
approved_by: "用户"
approved_at: "2026-09-23"
approval_evidence: "用户消息：批准按当前 plan_revision: 2 实施"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/006-disable-community-features/tasks.md"
verification_record: "openspec/changes/006-disable-community-features/verification.md"
blocked_from: ""
blocked_reason: ""
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Claude Code"
  - "Codex"
  - "Cursor"
created_at: "2026-09-23"
updated_at: "2026-09-23"
related_issue: ""
---

# 可配置停用社区功能

## 1. Objective

为个人自部署 InsForge 增加可回滚的社区功能开关，使排行榜、成就、公共资料和相关后台任务可以整体停用，同时保留个人云同步和未来恢复能力。

## 2. Background

当前社区入口和路由始终可见，Dashboard 会预加载排行榜，云同步完成后会刷新排行榜，三个 GitHub Actions 则以 InsForge URL 是否存在决定运行。个人实例仍需要同一个 URL 做用量上传，因此 URL 不能继续作为社区功能开关。源码、测试和历史 migration 应保留，以降低 upstream 合并和回滚风险。

## 3. Scope

### In Scope

- `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 默认 disabled、显式 true enabled。
- Dashboard 社区导航、路由回退、预加载、公共资料设置和 cloud-sync refresh gate。
- 三个 leaderboard GitHub Actions 的独立 repository variable 条件。
- 文档、测试和验证证据。

### Out of Scope

- 删除任何排行榜/徽章源码、Edge Function、数据库表、RPC、cron 或 migration。
- 修改个人认证、用量上传、私有统计或 token 解析。

## 4. Current Architecture

`App.jsx` 负责社区路由和排行榜默认预加载，`Sidebar.jsx` 无条件展示社区入口，`AccountSection.jsx` 展示公共资料设置。`cloud-sync.ts` 在成功上传后调用 `tokentracker-leaderboard-refresh`。三个 workflow 使用 `vars.TOKENTRACKER_INSFORGE_BASE_URL` 作为 job 条件。浏览器构建只能读取 `VITE_` 前缀变量，CLI/部署和 Actions 使用普通环境变量或 repository Variables。

## 5. Technical Approach

### Design

1. 新增纯函数 community feature helper，统一规范化缺失、未知、`true`、`TRUE` 和 `1`。
2. Vite 将 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 映射为 Dashboard 可读取的 `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`；缺省保持 disabled。
3. 在 App/Sidebar/AccountSection/preload/cloud-sync 读取同一状态；关闭时重定向、隐藏、跳过 preload 和 refresh。
4. 三个 workflow 使用 `vars.TOKENTRACKER_ENABLE_COMMUNITY_FEATURES == 'true'` 作为独立条件，同时保留 InsForge URL 作为 endpoint 来源。
5. 更新个人 InsForge 文档和针对性测试；不触碰数据库 migration。

### Reason

该设计将“是否连接个人 InsForge”和“是否运行社区能力”解耦，个人自部署默认不产生社区开销，需要时显式设置 `true` 恢复，并可通过环境变量回滚。保留 backend 和历史 migration 避免数据/迁移破坏。

## 6. Files Impact

### Modify

- `dashboard/src/App.jsx`
  - Reason: 社区路由、深链和排行榜预加载入口集中在此。
  - Changes: 关闭时重定向 `/leaderboard`、`/achievements`、`/u/:userId` 并跳过社区 preload。
- `dashboard/src/ui/components/Sidebar.jsx`
  - Reason: 社区导航入口定义在此。
  - Changes: 按开关隐藏排行榜和成就导航项。
- `dashboard/src/components/settings/AccountSection.jsx`
  - Reason: 公共资料设置控件定义在此。
  - Changes: 社区关闭时不渲染公共资料 toggle/details。
- `dashboard/src/lib/dashboard-preload.js`
  - Reason: 排行榜默认预加载和缓存定义在此。
  - Changes: disabled 时不发起或缓存排行榜预加载。
- `dashboard/src/lib/cloud-sync.ts`
  - Reason: 云同步成功后触发 leaderboard refresh。
  - Changes: disabled 时保留上传但跳过 refresh 和刷新事件。
- `dashboard/vite.config.js`
  - Reason: 浏览器构建需要接收非 `VITE_` 部署变量。
  - Changes: 注入社区开关映射。
- `.github/workflows/leaderboard-anticheat.yml`
  - Reason: 反作弊 workflow 当前以 InsForge URL 控制。
  - Changes: 增加独立社区开关条件。
- `.github/workflows/leaderboard-freshness.yml`
  - Reason: freshness workflow 当前以 InsForge URL 控制。
  - Changes: 增加独立社区开关条件。
- `.github/workflows/leaderboard-moderation-audit.yml`
  - Reason: moderation audit workflow 当前以 InsForge URL 控制。
  - Changes: 增加独立社区开关条件。
- `docs/personal-insforge.md`
  - Reason: 自部署说明需要告知开关、构建变量、Actions 变量和回滚方式。
  - Changes: 增加社区停用配置说明并澄清个人同步仍依赖 InsForge URL。
- `dashboard/src/App.navigation-preload.test.jsx`
  - Reason: 已覆盖路由和 preload 行为。
  - Changes: 增加 disabled 路由回退/无 preload 断言。
- `dashboard/src/ui/components/Sidebar.test.jsx`
  - Reason: 已覆盖导航渲染。
  - Changes: 增加 disabled 社区入口隐藏断言。
- `dashboard/src/pages/SettingsPage.test.jsx`
  - Reason: 设置页回归测试基线。
  - Changes: 保持设置页渲染回归覆盖。
- `dashboard/src/App.preload.test.jsx`
  - Reason: 已覆盖 Dashboard 资源预加载。
  - Changes: 增加社区关闭分支。
- `dashboard/src/lib/cloud-sync.test.ts`
  - Reason: 已覆盖云同步调用。
  - Changes: 断言关闭时上传保留且 refresh 不调用。

### Add

- `dashboard/src/lib/community-features.js`
  - Purpose: 统一读取和规范化社区功能开关，供 Dashboard 各模块复用。
  - Contents: disabled 默认值、`true`/`1` 解析和构建环境读取。
- `dashboard/src/lib/community-features.d.ts`
  - Reason: `cloud-sync.ts` 需要严格类型声明才能通过仓库 TypeScript guardrail。
  - Changes: 声明社区开关 helper 的输入和返回类型。
- `dashboard/src/components/settings/AccountSection.test.jsx`
  - Purpose: 验证公共资料设置在社区关闭时不可见。
  - Contents: disabled 开关下的 AccountSection 渲染断言。
- `dashboard/src/lib/community-features.test.js`
  - Purpose: 验证社区开关的默认值和规范化规则。
  - Contents: 缺失、未知、`true`、`TRUE`、`1` 的测试用例。
- `test/community-features-workflow.test.js`
  - Purpose: 验证三个 GitHub Actions 使用独立社区变量。
  - Contents: workflow 条件和 InsForge endpoint 保留断言。

### Delete

- None。

## 7. Implementation Steps

1. 校验当前 `plan_revision` 已获批准并运行 execute preflight gate。
2. 新增开关 helper，配置 Vite 映射和文档。
3. 接入 Dashboard 路由、导航、设置、preload 和 cloud-sync。
4. 修改三个 workflow 条件，保持 InsForge URL 作为 endpoint。
5. 创建/修改测试；将 SEP 标记为 `verifying` 并执行预声明命令。
6. 更新 `verification.md`、验收审查和任务账本；全部 required evidence 通过后标记 `ready_to_archive`，等待归档授权。

## 8. Data/API Changes

- Database: None。
- API: 不改变既有 API/Edge Function 契约，仅在客户端关闭时减少调用。
- Configuration: 新增 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，Dashboard 构建映射为 `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`；GitHub repository Variables 使用同名变量。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| 构建变量未映射导致默认关闭行为不明确 | Medium | helper 默认 disabled 并覆盖 Vite 映射测试；部署文档明确显式开启方式 |
| 深链未回退仍暴露社区页面 | High | App 路由选择前统一判断三类路径，并用路由测试验证 |
| 误停个人云同步 | High | refresh gate 与 upload/recovery 分离；cloud-sync 测试验证上传仍成功 |
| workflow 条件仍依赖 URL | Medium | 三个文件的 guardrail 测试要求独立变量和 endpoint 同时存在 |

## 10. Testing Plan

### Unit Test

- 社区开关规范化和 Vite 映射测试。

### Integration Test

- App/Sidebar/Settings/preload/cloud-sync 的 disabled/enabled 分支测试。
- 三个 GitHub Actions 的静态 guardrail 测试。

### Manual Test

- 不设置 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 构建并打开三个社区 URL，确认最终路径为 `/dashboard`。
- 在同一环境执行个人云同步，确认上传成功且网络记录中没有 `tokentracker-leaderboard-refresh`。
- 将变量改回 `true` 并重新构建，确认社区入口恢复。

## 11. Acceptance Criteria

- [ ] AC-001: 开关解析默认 disabled，显式开启值 enabled — Evidence: VER-001
- [ ] AC-002: 默认关闭时社区入口/公共资料设置隐藏，三个社区 URL 重定向到 `/dashboard` — Evidence: VER-002
- [ ] AC-003: 默认关闭时无排行榜 preload/refresh，请求仍完成个人上传 — Evidence: VER-003
- [ ] AC-004: 三个 workflow 仅由显式开启变量运行，个人 InsForge URL 仍可用于同步 — Evidence: VER-004
- [ ] AC-005: 显式 enabled 路径保留，构建与相关测试通过，源码/migration 未删除 — Evidence: VER-005

## 12. Notes

- 当前变更只停用调用和调度，不做数据库清理；后续若要删除 schema，应另立 change 和 migration。
- 执行 Agent 必须读取 proposal、spec、design、tasks、verification 全部关联 artifacts。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
