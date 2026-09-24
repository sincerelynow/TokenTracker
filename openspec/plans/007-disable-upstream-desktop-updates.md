---
type: SEP
version: 1.2
title: "关闭个人桌面包的上游更新入口"
change_id: "007-disable-upstream-desktop-updates"
status: blocked
plan_revision: 2
approved_revision: 2
approved_by: "user"
approved_at: "2026-09-24"
approval_evidence: "用户在 revision 2 规划完成后明确回复：批准实施计划（2026-09-24）"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/007-disable-upstream-desktop-updates/tasks.md"
verification_record: "openspec/changes/007-disable-upstream-desktop-updates/verification.md"
blocked_from: "verifying"
blocked_reason: "VER-007 未运行：当前环境缺少 xcodegen，无法生成 Xcode project 并执行 macOS 原生构建测试。"
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Codex"
created_at: "2026-09-24"
updated_at: "2026-09-24"
related_issue: ""
---

# 关闭个人桌面包的上游更新入口

## 1. Objective

阻止个人 macOS、Windows 包从上游自动或手动更新，并移除两端 Dashboard 设置页脚的上游入口。

## 2. Background

两端 `UpdateChecker` 都指向 `xiufengsun/TokenTracker`，而个人构建只生成 Actions artifacts，没有独立 Release。Windows 默认启用静默更新，存在被上游安装包替换的现实风险。工作区已暂存 macOS 更新器门禁、启动/菜单入口和桥接状态移除，但尚未纳入 007 验证；两端原生 Dashboard 页脚仍显示上游链接。

## 3. Scope

### In Scope

- 禁止 macOS、Windows 启动、定时与旧手动动作连通上游更新器。
- 隐藏两端原生菜单及 Dashboard 设置页的更新控件和状态；两端设置页脚不再链接上游，保留版本和同步功能。
- 将已暂存的 macOS 更新禁用改动纳入验证，修复对应回归测试，并补充两端手动更新说明。

### Out of Scope

- Linux、浏览器 Dashboard 的更新行为；非更新用途的原生菜单 GitHub Star 入口。
- 个人 Release 渠道、版本号、安装器身份和并存策略。
- 删除历史更新器实现。

## 4. Current Architecture

Windows `TrayApplicationContext` 在启动与定时器回调调用 `UpdateChecker.CheckAsync(silent: true)`；手动托盘和 Dashboard 原生动作调用非静默检查。macOS 工作区已暂存 `UpdateChecker.swift` 禁用门禁及 `TokenTrackerBarApp.swift`、`StatusBarController.swift`、`NativeBridge.swift` 的更新入口移除。Dashboard 的 `MenuBarSection` 当前只在 Windows 显示更新控件，`NativeAppFooter` 仍在两端显示上游 GitHub 与状态页链接。

## 5. Technical Approach

### Design

1. 核对并纳入已暂存的 macOS 更新门禁、启动与菜单入口、桥接移除改动，补齐对应测试。
2. 在 Windows 更新器网络入口前设置固定禁用门禁，停止托盘主动调度及用户可见更新入口，使旧 Dashboard 动作也不能连接上游。
3. 在 macOS、Windows 原生 Dashboard 隐藏更新控件与页脚上游外链；浏览器保持原界面。
4. 更新个人部署文档与两端定向测试。

### Reason

两端网络入口门禁与 UI 隐藏相互补充，可覆盖旧资源、既有 `autoUpdateEnabled=true` 偏好及用户可见入口；保留历史更新器代码便于未来接入个人 Release 渠道。

## 6. Files Impact

### Modify

- `TokenTrackerBar/TokenTrackerBar/Services/UpdateChecker.swift`
  - Reason: macOS 上游 release 网络入口。
  - Changes: 核对已暂存的请求前禁用门禁，必要时补齐旧动作安全性，保留版本读取。
- `TokenTrackerBar/TokenTrackerBar/TokenTrackerBarApp.swift`
  - Reason: macOS 启动静默检查和应用菜单入口。
  - Changes: 核对已暂存的入口移除，保留设置和其他菜单行为。
- `TokenTrackerBar/TokenTrackerBar/Services/StatusBarController.swift`
  - Reason: macOS 菜单栏更新项与状态观察。
  - Changes: 核对已暂存的更新项移除，保留版本及其他菜单操作。
- `TokenTrackerBar/TokenTrackerBar/Services/NativeBridge.swift`
  - Reason: macOS Dashboard 更新状态与动作桥接。
  - Changes: 核对已暂存的更新字段、观察及动作移除，保留同步和版本桥接。
- `TokenTrackerWin/UpdateChecker.cs`
  - Reason: 唯一上游 release 网络入口。
  - Changes: 在检查前固定跳过，保留版本读取。
- `TokenTrackerWin/TrayApplicationContext.cs`
  - Reason: Windows 自动调度、托盘菜单与 Dashboard 原生动作位于此。
  - Changes: 停止更新调度和可见入口，旧更新动作不触发检查，保留同步/版本。
- `dashboard/src/components/settings/MenuBarSection.jsx`
  - Reason: 两端设置页更新控件及原生页脚位于此。
  - Changes: 在已暂存的 macOS 更新控件移除基础上隐藏 Windows 控件；两端原生页脚隐藏上游外链，浏览器保持行为。
- `test/windows-update-check-scheduling.test.js`
  - Reason: 原测试要求定时检查，需更新为禁用行为断言。
  - Changes: 验证无启动/定时检查与旧动作的阻断。
- `dashboard/src/components/settings/MenuBarSection.test.jsx`
  - Reason: 已暂存测试仍要求 Windows 更新控件可用，且未覆盖两端页脚。
  - Changes: 验证 macOS、Windows 无更新控件/上游页脚链接及浏览器兼容性。
- `test/native-bridge-sync-feedback.test.js`
  - Reason: 原测试仍要求 macOS 更新状态由桥接推送。
  - Changes: 改为断言更新状态/动作不再暴露，同步反馈保留。
- `test/localization-regressions.test.js`
  - Reason: 原测试仍要求 macOS 启动静默更新检查。
  - Changes: 改为断言启动不触发更新检查，并保留其他本地化断言。
- `docs/personal-insforge.md`
  - Reason: 用户需知道个人 macOS、Windows 包如何后续更新。
  - Changes: 说明重新运行个人构建工作流并手动安装产物。

### Add

- `test/macos-update-check-scheduling.test.js`
  - Purpose: 为已暂存的 macOS 禁用改动补独立回归覆盖。
  - Contents: 验证启动、菜单、桥接与更新器网络门禁。

### Delete

- None.

## 7. Implementation Steps

1. 校验当前 `plan_revision` 已获批准，读取关联 change 的全部 artifacts，并运行 execute preflight gate。
2. 将 SEP 标记为 `implementing`，按 `tasks.md` 核对已暂存 macOS 改动、完成 Windows 门禁及两端 Dashboard 修改，逐项回写任务状态。
3. 创建或修改两端定向测试并核对 Requirement/Scenario 覆盖；创建测试不代表执行通过。
4. 将 SEP 标记为 `verifying`，运行 `verification.md` 的 required 检查并记录真实结果。
5. 核对 AC-001 至 AC-005、平台兼容性及文档；所有 required evidence 通过后标记为 `ready_to_archive`。
6. 更新 Handoff 并结束；仅在后续收到显式归档授权时运行 archive gate。

## 8. Data/API Changes

None. 两端既有 `autoUpdateEnabled` 持久值保留；旧更新动作在个人桌面包内安全跳过。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| 旧 Dashboard 仍能触发上游更新 | High | 两端更新器网络入口门禁与旧动作测试 |
| 桌面条件误伤浏览器页脚 | Medium | macOS/Windows/浏览器渲染测试 |
| 已暂存 macOS 改动与旧测试断言冲突 | Medium | 更新两项回归断言并运行 macOS 定向测试 |
| 无本地 Windows 环境 | Medium | 定向静态/组件测试与构建；可用时补 Windows 冒烟 |

## 10. Testing Plan

### Unit Test

- `test/windows-update-check-scheduling.test.js` 检查原生更新路径。
- `test/macos-update-check-scheduling.test.js`、`test/native-bridge-sync-feedback.test.js`、`test/localization-regressions.test.js` 检查 macOS 更新路径与原有桥接行为。
- `dashboard/src/components/settings/MenuBarSection.test.jsx` 检查两端控件、页脚和浏览器兼容性。

### Integration Test

- Dashboard 生产构建、文案和架构校验；macOS 原生构建与测试；若有 Windows 构建环境，构建个人 Windows 包。

### Manual Test

- 可用 macOS、Windows 环境时分别观察启动、旧更新消息和原生菜单/设置页，不应请求上游或启动安装包。

## 11. Acceptance Criteria

- [ ] AC-001: Windows 自动与旧手动路径的上游更新请求、下载和安装数均为 0 — Evidence: VER-001
- [ ] AC-002: Windows 托盘与设置页无更新控件，同时保留同步及版本信息 — Evidence: VER-002
- [ ] AC-003: macOS、Windows 页脚无上游链接，浏览器页脚保留原链接 — Evidence: VER-002
- [ ] AC-004: macOS 自动与旧手动路径的上游请求、下载和安装数均为 0 — Evidence: VER-006
- [ ] AC-005: macOS 应用菜单、菜单栏和设置页无更新控件，保留同步及版本 — Evidence: VER-006

## 12. Notes

- `plan_revision: 2` 已按用户要求纳入 macOS 范围，之前针对 revision 1 的确认即使存在也不授权执行此版本；当前未获实施批准。
- macOS 已暂存的相关改动是现有工作区内容，实施时应核对并保留，不能当作已通过验证。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
- 执行 Agent 必须读取 proposal、spec、design、tasks、verification，不得只读取 SEP。
