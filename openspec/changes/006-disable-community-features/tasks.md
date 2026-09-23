# Tasks: 可配置停用社区功能

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；归档必须在用户于 `ready_to_archive` 后显式授权时单独执行。
- 每次只执行 `006-disable-community-features`，不得混入其他 change 的文件或任务。

## 1. Preparation

- [x] 1.1 确认 Scope、Files Impact、仓库规则和基线测试结果。
- [x] 1.2 记录用户对当前 `plan_revision` 的二次实施确认，并同步 SEP 的 `approved_revision`、`approved_by`、`approved_at`；未确认不得开始 Implementation。
- [x] 1.3 运行 `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/006-disable-community-features --phase execute`。

## 2. Implementation

- [x] 2.1 调整统一社区开关 helper、Vite 映射和 Actions 条件为默认关闭/显式开启 — Files: `dashboard/src/lib/community-features.js`, `dashboard/vite.config.js`, `.github/workflows/leaderboard-anticheat.yml`, `.github/workflows/leaderboard-freshness.yml`, `.github/workflows/leaderboard-moderation-audit.yml` — Verifies: REQ-001, REQ-004。Evidence: VER-001, VER-004。
- [x] 2.2 保持 Sidebar、App 路由、排行榜 preload、AccountSection 和 cloud sync 在 disabled 默认值下的关闭行为 — Files: `dashboard/src/ui/components/Sidebar.jsx`, `dashboard/src/App.jsx`, `dashboard/src/lib/dashboard-preload.js`, `dashboard/src/components/settings/AccountSection.jsx`, `dashboard/src/lib/cloud-sync.ts` — Verifies: REQ-002, REQ-003。Evidence: VER-002, VER-003。
- [x] 2.3 更新个人 InsForge 配置文档，说明默认关闭、显式开启、Actions 变量和回滚 — Files: `docs/personal-insforge.md` — Verifies: REQ-001, REQ-004, REQ-005。Evidence: VER-005。

## 3. Test Authoring

- [x] 3.1 更新社区开关解析/构建映射测试 — Files: `dashboard/src/lib/community-features.test.js` — Covers: REQ-001 / 默认关闭、显式开启。
- [x] 3.2 扩展 App、Sidebar、Settings、preload 和 cloud-sync 测试覆盖默认 disabled 与显式 enabled 分支 — Files: `dashboard/src/App.navigation-preload.test.jsx`, `dashboard/src/ui/components/Sidebar.test.jsx`, `dashboard/src/components/settings/AccountSection.test.jsx`, `dashboard/src/App.preload.test.jsx`, `dashboard/src/lib/cloud-sync.test.ts` — Covers: REQ-002、REQ-003。
- [x] 3.3 更新三个 workflow 的独立变量 guardrail 测试 — Files: `test/community-features-workflow.test.js` — Covers: REQ-004、REQ-005。

## 4. Verification

- [x] 4.1 运行社区相关 Dashboard 测试和新增测试，记录 VER-001、VER-002、VER-003。
- [x] 4.2 运行 workflow/架构 guardrail 测试，记录 VER-004。
- [x] 4.3 运行 `npm run validate:copy && npm run validate:locale && npm run validate:guardrails && npm --prefix dashboard run build`，记录 VER-005。
- [x] 4.4 核对 `TOKENTRACKER_INSFORGE_BASE_URL` 仍可驱动个人同步，且默认关闭不产生 refresh 请求；记录 VER-003、VER-004。
- [x] 4.5 确认源码、测试、edge patch 和历史 migration 未删除，记录 VER-005。
- [x] 4.6 验证每项验收标准和兼容性要求 — Evidence: VER-001 至 VER-005。

## 5. Ready to Archive

- [x] 5.1 确认所有 required verification 为 `Pass`，更新验收项并将 SEP 标记为 `ready_to_archive`。
- [x] 5.2 更新 `verification.md` Handoff，明确 change 等待用户的归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 用户在 `ready_to_archive` 后明确授权时，记录归档批准并运行 archive gate — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change 并将 SEP 标记为 `archived`；归档失败时按规则标记 `blocked`。
