# Design: 关闭个人桌面包的上游更新入口

## Context

`TokenTrackerWin/UpdateChecker.cs` 固定读取上游 GitHub latest release。`AutoUpdatePolicy` 缺省开启，`TrayApplicationContext` 在启动与定时器回调调用静默检查，托盘菜单和 Dashboard 原生动作可手动检查。macOS 工作区已暂存 `UpdateChecker.swift` 禁用门禁、`TokenTrackerBarApp.swift`/`StatusBarController.swift` 菜单与启动入口移除、`NativeBridge.swift` 更新状态和动作移除；这些改动尚未作为 007 验证。`NativeAppFooter` 仍在原生平台展示上游 GitHub 按钮及状态页链接。个人构建工作流只上传 Actions artifacts，没有个人 Release。

## Architecture

验证并纳入已暂存的 macOS 门禁与入口移除改动，在 Windows 更新器网络入口设置同等禁用门禁，停止 Windows 主动调度及展示更新操作；Dashboard 对 macOS、Windows 原生环境隐藏页脚上游外链。保留两端更新器历史实现，以便未来建立个人 Release 渠道时恢复。

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| macOS `UpdateChecker`、`TokenTrackerBarApp`、`StatusBarController`、`NativeBridge` | 上游更新检查、启动/菜单与桥接 | 纳入已暂存的禁用改动并验证旧动作安全性 |
| Windows `UpdateChecker` | 上游 release 检查与安装 | 在任何请求前拒绝检查，阻断旧动作 |
| Windows `TrayApplicationContext` | 托盘菜单、定时器、原生桥接 | 不调度或展示 Windows 更新入口 |
| `MenuBarSection` / `NativeAppFooter` | 内嵌 Dashboard 设置界面 | 隐藏两端更新控件及上游页脚链接 |
| 个人部署说明 | 告知更新方式 | 说明手动重建和安装 |

## Data Flow

1. macOS 启动与菜单不再调用更新器，旧检查调用由门禁拒绝；Windows 不启动更新定时检查，旧动作同样被拒绝。
2. Dashboard 在 macOS 和 `platform: windows` 原生环境只显示本地控制，页脚保留版本文本；浏览器保持原链接。

## Technical Decisions

### Decision: 两端双层阻断上游更新

- **Choice:** 两端均关闭原生调度/界面入口，并在各自 `UpdateChecker` 的网络访问前设置固定禁用门禁；macOS 已暂存实现须纳入验证。
- **Reason:** 旧 Dashboard 资源或已保存的自动更新偏好可能继续触发旧路径；网络入口门禁可覆盖这些情况。
- **Alternatives:** 只把 `AutoUpdatePolicy` 默认值改为 `false`；用户原有 `true` 设置和手动检查仍可连上游。

### Decision: 原生桌面专属页脚

- **Choice:** macOS、Windows 原生设置页脚仅显示版本，隐藏 GitHub 与状态页外链；浏览器保留原有内容。
- **Reason:** 两条链接都指向上游服务，个人桌面包不应把它们当作更新或支持入口。
- **Alternatives:** 直接替换为 fork 链接；fork 的 Actions artifacts 不是稳定的公开下载入口，暂不引入误导性目标。

## Data and API Design

- 不改变数据、网络 API 或持久配置格式；原生桥接对旧更新消息安全忽略。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 个人 macOS、Windows 包不被上游版本覆盖 | 用户需手动获取新包 | 当前工作流没有个人 Release 渠道 |
| 未来可恢复更新器 | 少量禁用后的历史代码仍存在 | 避免提前删除可复用的下载和校验实现 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 仅隐藏 UI，旧动作仍触发请求 | High | 更新器入口门禁及旧动作测试 |
| 平台判断影响浏览器页脚 | Medium | macOS/Windows/浏览器分支渲染测试 |
| macOS 已暂存改动与现有测试断言冲突 | Medium | 更新 `native-bridge-sync-feedback` 与 `localization-regressions` 并运行回归 |
| 缺少 Windows 运行环境导致行为未验证 | Medium | Windows CI 构建加手工网络观察 |

## Rollout and Rollback

- **Rollout:** 在个人分支构建新 macOS DMG 与 Windows 安装包，替换旧包；用户后续通过个人 Actions artifacts 手动更新。
- **Rollback:** 恢复本次两端代码及 Dashboard 条件，重新构建个人包；恢复自动更新前需先建立个人更新渠道。

## Open Questions

- 暂无；范围按当前 Windows 个人构建语境限定。
