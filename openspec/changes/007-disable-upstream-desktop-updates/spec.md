# Personal Desktop Updates Specification

## Requirements

### Requirement: REQ-001 禁止个人 Windows 包连接上游更新渠道

系统 SHALL 对当前分支构建的 Windows 应用禁用自动和手动更新检查，并且不得通过更新器下载或执行上游安装包。

#### Scenario: Windows 应用启动并驻留

- **Given** 用户运行包含 `EmbeddedServer` 的个人 Windows 包，自动更新偏好为开启或关闭
- **When** 应用启动并持续驻留到原定定时检查时点
- **Then** 应用不请求上游 release API
- **And** 不下载或执行上游安装包

#### Scenario: 旧版手动更新动作

- **Given** 个人 Windows 包接收到旧 Dashboard 发送的 `checkForUpdates` 动作
- **When** 原生端处理该动作
- **Then** 不请求上游 release API
- **And** 不下载或执行上游安装包

### Requirement: REQ-002 移除 Windows 更新控件

系统 SHALL 在 Windows 托盘与内嵌 Dashboard 设置页隐藏更新检查、自动更新开关及更新状态，同时保留同步操作和本地版本展示。

#### Scenario: Windows 更新界面

- **Given** 用户在个人 Windows 包中打开托盘菜单及 Dashboard 设置页
- **When** 查看应用相关操作
- **Then** 不出现“检查更新”及“自动更新”控件
- **And** 同步操作及当前版本仍可见

### Requirement: REQ-003 原生桌面设置页脚无上游入口

系统 SHALL 在 macOS 与 Windows 原生 Dashboard 的设置页脚隐藏通往上游 GitHub 仓库及状态页的外链，保留版本信息；浏览器 Dashboard 原有页脚行为保持不变。

#### Scenario: 原生桌面与浏览器页脚

- **Given** 用户分别打开 macOS、Windows 原生 Dashboard 和浏览器 Dashboard 的设置页
- **When** 查看页脚
- **Then** macOS、Windows 页脚仅显示版本信息，不显示上游外链
- **And** 浏览器页脚仍显示其原有链接

### Requirement: REQ-004 禁止个人 macOS 包连接上游更新渠道

系统 SHALL 对当前分支构建的 macOS 应用禁用自动和手动更新检查，并且不得通过更新器下载或执行上游 DMG。

#### Scenario: macOS 启动与旧动作

- **Given** 用户运行个人 macOS 包，自动更新偏好为开启或关闭
- **When** 应用启动，或旧 Dashboard 向原生桥接发送更新动作
- **Then** 应用不请求上游 release API
- **And** 不下载或安装上游 DMG

### Requirement: REQ-005 移除 macOS 更新控件

系统 SHALL 在 macOS 应用菜单、菜单栏菜单与内嵌 Dashboard 设置页隐藏更新检查、自动更新开关及更新状态，同时保留同步操作和版本展示。

#### Scenario: macOS 更新界面

- **Given** 用户打开个人 macOS 包的应用菜单、菜单栏菜单及 Dashboard 设置页
- **When** 查看应用相关操作
- **Then** 不出现“检查更新”及“自动更新”控件
- **And** 同步操作及当前版本仍可见

## Behavior

### Inputs

- macOS、Windows 原生应用启动、驻留及原生桥接动作。
- Dashboard 原生平台标识与版本信息。

### Outputs

- macOS、Windows 更新请求与安装动作均被跳过；更新控件和上游页脚链接不渲染。

### Errors and Edge Cases

- 旧版 Dashboard 仍发出 `checkForUpdates` 时，原生端安全忽略。
- 两端既有自动更新偏好即使保存为 `true`，也不得恢复上游更新。

### Compatibility

- 不修改 Linux、浏览器 Dashboard 的行为，也不改变本地 API 或用户数据。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | Windows 应用启动并驻留；旧版手动更新动作 | AC-001 |
| REQ-002 | Windows 更新界面 | AC-002 |
| REQ-003 | 原生桌面与浏览器页脚 | AC-003 |
| REQ-004 | macOS 启动与旧动作 | AC-004 |
| REQ-005 | macOS 更新界面 | AC-005 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 无上游更新请求

- **Covers** REQ-001 / Windows 应用启动并驻留、旧版手动更新动作
- **Preconditions** 当前分支 Windows 构建；自动更新偏好分别为开启及关闭；可观察 release API 请求与安装进程
- **Action** 启动应用，触发定时检查路径，并发送旧 `checkForUpdates` 动作
- **Expected Result** 上游 release API 请求数为 0，上游安装包下载及执行数为 0
- **Verification** VER-001, VER-004

### Acceptance Criterion: AC-002 Windows 更新控件不可见

- **Covers** REQ-002 / Windows 更新界面
- **Preconditions** Windows 原生 Dashboard 可用，托盘和设置页已打开
- **Action** 查看托盘菜单和设置页，并执行一次“立即同步”
- **Expected Result** 更新检查、自动更新开关和更新状态均不可见；“立即同步”可触发，版本信息仍可见
- **Verification** VER-001, VER-002, VER-004

### Acceptance Criterion: AC-003 页脚平台隔离

- **Covers** REQ-003 / 原生桌面与浏览器页脚
- **Preconditions** macOS、Windows 原生平台及浏览器设置夹具
- **Action** 分别渲染设置页脚并检查链接目标
- **Expected Result** macOS、Windows 无上游 GitHub 和状态页链接且保留版本；浏览器保留原有链接
- **Verification** VER-002, VER-003

### Acceptance Criterion: AC-004 macOS 无上游更新请求

- **Covers** REQ-004 / macOS 启动与旧动作
- **Preconditions** 当前分支 macOS 构建；自动更新偏好分别为开启和关闭；可观察 release API 请求与安装进程
- **Action** 启动应用并向原生桥接发送旧更新动作
- **Expected Result** 上游 release API 请求数为 0，上游 DMG 下载及安装数为 0
- **Verification** VER-006, VER-007

### Acceptance Criterion: AC-005 macOS 更新控件不可见

- **Covers** REQ-005 / macOS 更新界面
- **Preconditions** macOS 应用菜单、菜单栏菜单及内嵌 Dashboard 可用
- **Action** 查看三个界面并执行一次“立即同步”
- **Expected Result** 更新检查、自动更新开关和更新状态均不可见；“立即同步”可触发，版本信息仍可见
- **Verification** VER-002, VER-006, VER-007
