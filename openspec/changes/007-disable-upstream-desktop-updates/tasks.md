# Tasks: 关闭个人桌面包的上游更新入口

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；仅在真实阻塞或规划实质变化时停止。归档必须在用户于 `ready_to_archive` 后显式授权时单独执行。
- 每次只执行一个 `change_id`，不得混入其他 change 的文件或任务。

## 1. Preparation

- [x] 1.1 确认 `Scope`、`Files Impact`、仓库规则、已暂存 macOS 改动与两端更新/页脚基线。
- [x] 1.2 在修订版 2 planning artifacts 完成后记录用户对 `plan_revision: 2` 的二次实施确认，并同步 SEP 批准字段；未确认不得实施。
- [x] 1.3 运行 `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/007-disable-upstream-desktop-updates --phase execute`。

## 2. Implementation

- [x] 2.1 核对并纳入已暂存的 macOS 更新门禁、启动/菜单入口及原生桥接改动；补齐发现的缺口 — Files: `TokenTrackerBar/TokenTrackerBar/Services/UpdateChecker.swift`, `TokenTrackerBar/TokenTrackerBar/TokenTrackerBarApp.swift`, `TokenTrackerBar/TokenTrackerBar/Services/StatusBarController.swift`, `TokenTrackerBar/TokenTrackerBar/Services/NativeBridge.swift` — Verifies: REQ-004, REQ-005。
- [x] 2.2 在所有网络请求前阻断 Windows 更新检查，保留版本查询 — Files: `TokenTrackerWin/UpdateChecker.cs` — Verifies: REQ-001。
- [x] 2.3 停止 Windows 更新定时调度与托盘入口，令旧 Dashboard 更新动作安全跳过，保留同步操作 — Files: `TokenTrackerWin/TrayApplicationContext.cs` — Verifies: REQ-001, REQ-002。
- [x] 2.4 隐藏两端设置页更新控件及页脚上游外链，保留版本和浏览器行为 — Files: `dashboard/src/components/settings/MenuBarSection.jsx` — Verifies: REQ-002, REQ-003, REQ-005。
- [x] 2.5 说明个人 macOS、Windows 包的手动更新方式 — Files: `docs/personal-insforge.md` — Verifies: REQ-001, REQ-004。

## 3. Test Authoring

- [x] 3.1 更新 Windows 调度与旧动作回归断言 — Files: `test/windows-update-check-scheduling.test.js` — Covers: REQ-001, REQ-002。
- [x] 3.2 新增 macOS 启动、菜单与更新器门禁回归断言 — Files: `test/macos-update-check-scheduling.test.js` — Covers: REQ-004, REQ-005。
- [x] 3.3 更新 macOS 原生桥接回归断言，不再要求更新状态推送 — Files: `test/native-bridge-sync-feedback.test.js` — Covers: REQ-004, REQ-005。
- [x] 3.4 更新旧本地化回归断言，不再要求 macOS 启动静默检查 — Files: `test/localization-regressions.test.js` — Covers: REQ-004。
- [x] 3.5 更新 macOS/Windows/浏览器设置页与页脚渲染测试 — Files: `dashboard/src/components/settings/MenuBarSection.test.jsx` — Covers: REQ-002, REQ-003, REQ-005。

## 4. Verification

- [x] 4.1 运行 Windows 定向 Node 测试并记录结果 — Evidence: VER-001。
- [x] 4.2 运行 Dashboard 定向组件测试并记录结果 — Evidence: VER-002。
- [x] 4.3 运行 Dashboard 构建、架构/文案检查及差异检查 — Evidence: VER-003。
- [x] 4.4 如有可用 Windows 环境，运行 Windows 构建与网络/UI 冒烟检查；若不可用，明确记录限制 — Evidence: VER-004。
- [x] 4.5 核对文档、代码与全部验收标准 — Evidence: VER-005。
- [x] 4.6 运行 macOS 定向 Node 回归测试并记录结果 — Evidence: VER-006。
- [ ] 4.7 运行 macOS 原生构建并记录结果 — Evidence: VER-007。
- [ ] 4.8 如有可用 macOS 包，观察更新网络/UI 行为；若不可用，明确记录限制 — Evidence: VER-008。

## 5. Ready to Archive

- [ ] 5.1 确认所有 required verification 为 `Pass`，更新验收项并将 SEP 标记为 `ready_to_archive`。
- [ ] 5.2 更新 `verification.md` Handoff，明确 change 等待用户的归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 在用户于 `ready_to_archive` 后明确授权时，记录 SEP 归档批准字段并运行 archive gate — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change，将 SEP 标记为 `archived`；归档失败时标记 `blocked`，记录恢复条件。
