# Verification: 可配置停用社区功能

## Summary

- Status: Pass
- Verified revision: 2
- Executor: Codex
- Started at: 2026-09-23
- Completed at: 2026-09-23

## Personal Instance Redeployment (2026-09-24)

- 个人实例全量重部署后，`functions list --json` 显示包含社区相关函数在内的 23/23 个 `tokentracker-*` Functions 均为 `active`；远端 38 个迁移版本与仓库完全一致。
- 部署没有修改 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES` 配置；本次未重复执行社区页面或真实账号验收。

## Post-merge Verification (2026-09-24, v1.0.4)

- 合入 `origin/main` 的 v1.0.4 与 Hy4 preview 定价后，`npm run ci:local` 通过：Node 3036 通过、2 跳过，相关校验与 Dashboard 构建通过；Dashboard 802 项测试和类型检查通过。
- 合并差异未修改社区开关、UI 路由、预加载、云同步刷新或三个排行榜 workflow；默认关闭与显式开启行为继续由现有测试覆盖。

## Post-merge Verification (2026-09-24)

- 合入 `origin/main` 后，`npm run ci:local` 通过：Node 3030 通过、2 跳过，相关校验与 Dashboard 构建通过；`npm --prefix dashboard run test -- --run` 通过 802 项测试，`npm --prefix dashboard run typecheck` 通过。
- 合并差异未修改社区开关、UI 路由、预加载、云同步刷新或三个排行榜 workflow；默认关闭与显式开启行为继续由现有测试覆盖。

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001 / 默认关闭、显式开启 | `npm --prefix dashboard run test -- --run src/lib/community-features.test.js` | Pass | 2 tests passed；缺失/空/未知/false/0 为 disabled，true/TRUE/1 为 enabled。 | Codex |
| VER-002 | yes | REQ-002 / 社区入口隐藏、社区 URL 回退 | `npm --prefix dashboard run test -- --run src/App.navigation-preload.test.jsx src/ui/components/Sidebar.test.jsx src/components/settings/AccountSection.test.jsx` | Pass | 12 tests passed；社区深链回退、导航及公共资料控件关闭行为通过。 | Codex |
| VER-003 | yes | REQ-003 / 预加载和同步刷新抑制 | `npm --prefix dashboard run test -- --run src/App.preload.test.jsx src/lib/cloud-sync.test.ts` | Pass | 14 tests passed；默认关闭/显式关闭时跳过排行榜 preload/refresh，个人上传仍完成。 | Codex |
| VER-004 | yes | REQ-004 / workflow 独立开关、个人 URL 保留 | `node --test test/community-features-workflow.test.js test/backend-hot-path-guardrails.test.js` | Pass | 30 tests passed；三个 workflow 使用 `== 'true'` 且保留 InsForge URL endpoint。 | Codex |
| VER-005 | yes | REQ-005 / 显式开启兼容、源码/migration 保留 | `npm --prefix dashboard run test -- --run`；`npm --prefix dashboard run typecheck`；`npm run validate:copy`；`npm run validate:locale`；`npm run validate:guardrails`；`npm --prefix dashboard run build`；`npm test`；`git diff --check` | Pass | Dashboard 114 files/801 tests passed；typecheck/build/validators passed；CLI 3010 tests（3008 passed, 2 skipped）；diff check passed。构建保留社区源码，未删除 edge patch/migration。 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/006-disable-community-features --phase archive` | Not Run | 仅在用户明确授权归档后执行 | Codex |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | 开关解析默认 disabled，显式开启值 enabled | Pass | VER-001 |
| AC-002 | 默认关闭时社区入口/公共资料设置隐藏，三个社区 URL 重定向到 `/dashboard` | Pass | VER-002 |
| AC-003 | 默认关闭时无排行榜 preload/refresh，请求仍完成个人上传 | Pass | VER-003 |
| AC-004 | 三个 workflow 仅由显式开启变量运行，个人 InsForge URL 仍可用于同步 | Pass | VER-004 |
| AC-005 | 显式 enabled 路径保留，构建与相关测试通过，源码/migration 未删除 | Pass | VER-005 |

## Deviations

- None。

## Blockers

- None。

## Handoff

- Current status: `ready_to_archive`
- Next action: 等待用户明确授权归档；归档前不移动 change artifacts。
