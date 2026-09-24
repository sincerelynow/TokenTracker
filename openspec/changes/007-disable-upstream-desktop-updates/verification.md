# Verification: 关闭个人桌面包的上游更新入口

## Summary

- Status: Blocked
- Verified revision: 2
- Executor: Codex
- Started at: 2026-09-24
- Completed at: 2026-09-24

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001, REQ-002 / 更新路径和托盘 | `node --test test/windows-update-check-scheduling.test.js test/windows-server-manager-lifecycle.test.js` | Pass | 相关测试通过；更新器在请求前阻断、无启动/定时调度、旧动作安全忽略且同步/版本保留。更新路径与 Windows server lifecycle 测试均通过。 | Codex |
| VER-002 | yes | REQ-002, REQ-003, REQ-005 / 设置页与页脚 | `npm --prefix dashboard run test -- --run src/components/settings/MenuBarSection.test.jsx` | Pass | 6 tests passed；原生 macOS/Windows 更新控件和页脚外链隐藏，版本/同步保留，浏览器链接保留。 | Codex |
| VER-003 | yes | REQ-003 / 构建与静态约束 | `npm run dashboard:build && npm run validate:copy && npm run validate:guardrails && git diff --check` | Pass | Dashboard build、copy registry、guardrails、git diff checks 均通过；仅有既存 Vite/copy warnings。 | Codex |
| VER-004 | no | REQ-001, REQ-002 / Windows 端到端 | 在 Windows 安装当前分支包，监控上游 release API 与安装进程；打开托盘、设置页并触发旧 `checkForUpdates` 消息 | Not Run | 当前环境无 Windows/.NET 端到端环境；剩余风险为未进行真实安装包网络/UI 观察。 | Codex |
| VER-005 | yes | 全部 / 文档与验收核对 | 对照 `proposal.md`、`spec.md`、`design.md`、已暂存 macOS 改动、代码差异和 `docs/personal-insforge.md` | Pass | 代码范围与 approved revision 2 一致；平台边界、版本/同步保留、手动构建更新说明与回滚说明已核对。 | Codex |
| VER-006 | yes | REQ-004, REQ-005 / macOS 更新路径 | `node --test test/macos-update-check-scheduling.test.js test/native-bridge-sync-feedback.test.js test/localization-regressions.test.js test/macos-update-alert-activation-policy.test.js` | Pass | 21 tests passed, 0 failed；macOS 更新器门禁、启动/菜单/桥接禁用及同步反馈回归通过。 | Codex |
| VER-007 | yes | REQ-004, REQ-005 / macOS 原生构建与测试 | 在具备 `xcodegen` 的 macOS 环境，于 `TokenTrackerBar/` 运行 `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb && xcodebuild test -scheme TokenTrackerBarTests -destination 'platform=macOS'` | Not Run | 阻塞：当前环境有 `xcodebuild` 但无 `xcodegen`，且未生成 `.xcodeproj`；需在安装 xcodegen 或 macOS CI 可用后执行。 | Codex |
| VER-008 | no | REQ-004, REQ-005 / macOS 端到端 | 运行个人 DMG，观察上游 release API 与安装动作；查看应用菜单、菜单栏菜单和设置页，并发送旧更新动作 | Not Run | 当前未生成个人 DMG；剩余风险为未进行真实包观察。 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/007-disable-upstream-desktop-updates --phase archive` | Not Run | 仅在用户于 ready_to_archive 后明确授权归档时执行 | Implementer |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | Windows 自动和旧手动路径的上游请求、下载及安装次数均为 0 | Pass | VER-001, VER-004 |
| AC-002 | 托盘/设置页无更新控件，保留同步及版本信息 | Pass | VER-001, VER-002, VER-004 |
| AC-003 | macOS、Windows 页脚无上游链接，浏览器保留原链接 | Pass | VER-002, VER-003 |
| AC-004 | macOS 自动和旧手动路径的上游请求、下载及安装次数均为 0 | Blocked | VER-006, VER-007, VER-008 |
| AC-005 | macOS 菜单/设置页无更新控件，保留同步及版本 | Blocked | VER-002, VER-006, VER-007, VER-008 |

## Deviations

- None.

## Blockers

- `blocked_from: verifying`；VER-007 未运行，因为当前环境缺少 `xcodegen` 且没有生成的 Xcode project。
- Resume condition: 安装/提供 `xcodegen` 或使用 macOS CI 执行计划中的 xcodegen + xcodebuild 命令。
- Owner: Codex / repository maintainer.

## Handoff

- Current status: `blocked`
- Next action: 在可用 macOS 原生构建环境执行 VER-007；通过后恢复至 `verifying` 并重新运行 verification gate。
