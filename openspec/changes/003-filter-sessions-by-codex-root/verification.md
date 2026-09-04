# Verification: 按 Codex 配置目录筛选会话

## Summary

- Status: Pass
- Verified revision: 1
- Executor: Codex
- Started at: 2026-09-04T15:48:40+08:00
- Completed at: 2026-09-04T16:29:42+08:00

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001 全部场景；REQ-003 sidecar、privacy、compatibility | `node --test test/session-analytics-codex-subagents.test.js test/session-analytics.test.js test/session-analytics-wsl-roots.test.js` | Pass | 首次运行 38/45，通过测试暴露 Codex root record 被直接传给 `path.join`；修复为 `root.path` 后重跑 45/45 pass、0 fail，退出码 0 | Codex |
| VER-002 | yes | REQ-002 全部场景；REQ-003 旧行兼容 | `npm --prefix dashboard test -- src/pages/SessionsPage.test.jsx` | Pass | 1 file、12 tests 全部通过，退出码 0；覆盖动态 options、ALL/instance、组合筛选、单实例隐藏和刷新回退 | Codex |
| VER-003 | yes | REQ-002 文案；REQ-003 compatibility | `npm run validate:copy`；`npm run validate:ui-hardcode` | Pass | 两条命令退出码均为 0；copy registry 1569 entries/1264 used keys，既有 unused-key warnings；hardcode guardrails colors=404/rawText=161 | Codex |
| VER-004 | yes | REQ-001, REQ-002, REQ-003 类型与生产构建 | `npm --prefix dashboard run build` | Pass | Vite production build 成功，3832 modules transformed，退出码 0；仅有既有 browser crypto、dynamic/static import 与 chunk-size warnings | Codex |
| VER-005 | yes | REQ-003 架构边界 | `npm run validate:guardrails` | Pass | `Guardrails ok: no violations found.`，退出码 0 | Codex |
| VER-006 | yes | REQ-002 多实例交互；REQ-003 本地隐私 | 本地 CLI server；桌面与移动视口；浏览器交互、截图和 Network response 检查 | Pass | `http://127.0.0.1:7680/sessions` 实际响应 164 sessions/143 Codex，实例为 CODEX=140、CODEX_IPC=3；ALL/CODEX/IPC UI 分别显示 139 roots+4 folded、136+4、3/164；1440x1000 与 390x844 均 globalOverflow=0；截图 `/tmp/tt003-sessions-desktop.png`、`/tmp/tt003-sessions-codex.png`、`/tmp/tt003-sessions-ipc.png`、`/tmp/tt003-sessions-mobile.png`；HTTP 200、no-store、无 root path 字段 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/003-filter-sessions-by-codex-root --phase archive` | Not Run | 仅在用户明确授权归档后执行，归档前必须通过 | Implementer |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | 两个 Codex roots 的 browser rows 保持 source=codex 并携带各自稳定 key/label | Pass | VER-001 |
| AC-002 | 跨 root 同 session ID 只产生一个归属首个配置 root 且 token 不重复的逻辑会话 | Pass | VER-001 |
| AC-003 | CODEX ALL 与具体实例筛选正确，并与项目/日期/搜索条件组合且计数一致 | Pass | VER-002, VER-006 |
| AC-004 | 单实例/旧行不显示冗余 control，旧行可见，失效选择回退 CODEX ALL | Pass | VER-002 |
| AC-005 | sidecar 版本及 root metadata 变化触发正确重建，不复用旧归属或 label | Pass | VER-001 |
| AC-006 | browser 不新增 root path，insights/CSV 不扩展实例字段，构建与文案校验通过 | Pass | VER-001, VER-003, VER-004, VER-005, VER-006 |

## Deviations

- None.

## Blockers

- None.

## Handoff

- Current status: `ready_to_archive`
- Next action: 所有 required verification 与 AC-001 至 AC-006 已通过；等待用户明确授权归档 `003-filter-sessions-by-codex-root`。
