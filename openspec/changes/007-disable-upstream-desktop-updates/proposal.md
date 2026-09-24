# Change: 关闭个人桌面包的上游更新入口

## Why

当前个人分支的 Windows 包仍以 `xiufengsun/TokenTracker` 为更新源，安装版默认在启动及驻留期间检查并静默安装较新版本，可能覆盖个人包。工作区已暂存 macOS 更新器门禁、启动检查与菜单入口的移除，但这些改动尚未纳入 007 验证；macOS 和 Windows 原生 Dashboard 页脚仍有通往上游仓库及状态页的链接。

## What

- 停止个人 macOS、Windows 包的自动与手动更新检查及安装。
- 隐藏两端原生菜单和 Dashboard 设置页中的更新操作，移除两端 Dashboard 设置页脚的上游外链，保留版本展示和同步操作。
- 验证工作区已暂存的 macOS 禁用改动，修正受影响的回归测试，并说明个人桌面包通过构建工作流手动更新。

## Scope

### In Scope

- 当前分支的 macOS 菜单栏应用、Windows 托盘应用及其内嵌 Dashboard。
- 启动/定时检查、原生菜单手动检查、Dashboard 手动检查和上游安装入口。

### Out of Scope

- Linux 和普通浏览器 Dashboard 的更新行为及外链；非更新用途的原生菜单 GitHub Star 入口。
- 个人构建工作流、版本号、安装器身份与并存策略。
- 删除历史更新器实现或改建个人 Release 更新渠道。

## Success Criteria

- SC-001: macOS、Windows 包启动、驻留、原生菜单及 Dashboard 操作均不会请求上游 release API 或启动上游安装包。
- SC-002: 两端原生菜单和 Dashboard 设置页不展示更新操作；两端设置页脚只保留版本信息，不提供上游链接。
- SC-003: Linux 和浏览器 Dashboard 界面不受桌面专属条件影响；相关测试与构建通过。

## Dependencies and Constraints

- 两端 `UpdateChecker` 仍可提供当前应用版本；macOS 已暂存的禁用门禁须通过验证，Windows 须在网络请求前设置同等门禁。
- 个人构建继续通过 `.github/workflows/build-desktop-apps.yml` 上传短期 Actions artifacts，不创建 Release。
- macOS 已暂存改动属于本 change 的待验证实施输入；不得覆盖或丢失。

## Open Questions

- None.
