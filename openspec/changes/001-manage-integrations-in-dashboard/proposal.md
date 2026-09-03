# Change: Dashboard 手动管理统计集成

## Why

TokenTracker 当前在首次 `serve` 时自动运行 `init --yes`，并在每次 `serve` 时修复部分 Hook/插件。这会在用户仅希望查看本地统计时修改 Claude、Codex、Gemini、OpenCode 等第三方工具的配置。取消自动 Hook 后，原生桌面端已有的五分钟定时统计可以继续读取本地日志，但普通 CLI `serve` 缺少同等的周期扫描；Dashboard 虽已有刷新图标和本地同步 API，也缺少与集成管理放在一起的明确操作入口。

## What

- 初始化和启动只准备 TokenTracker 自身运行时，不再安装、修复或卸载任何 AI 工具 Hook/插件。
- 在本地 Dashboard 增加集成管理区域，按 provider 展示检测状态，并允许用户手动安装或卸载 TokenTracker 管理的 Hook/插件。
- 普通 CLI `serve` 增加五分钟一次的非重叠轻量统计；macOS、Windows、Linux 原生端保留现有调度。
- 在集成管理区域增加显式“立即统计”操作，复用现有本地同步接口；Usage Overview 的刷新操作继续保留。
- 支持在本地 Dashboard 中维护多个 Codex 扫描根目录，例如同时统计 `~/.codex` 与 `~/.codex-ipc`；配置在后续手动和定时同步中立即生效。

## Scope

### In Scope

- Codex、Every Code、Claude、Gemini、CodeBuddy、WorkBuddy、OpenCode、OpenClaw、Grok Build、oh-my-pi 的手动安装、卸载和状态探测。
- 普通 CLI 常驻服务的五分钟本地定时统计。
- 本地 Dashboard 的集成管理和立即统计交互。
- 多个本机 Codex roots 的持久化配置、探测、去重扫描、状态展示和移除操作。
- 更新 CLI 帮助、README 和多语言 Dashboard 文案。

### Out of Scope

- 按 provider 禁止被动日志读取或 API 统计。
- 用户可配置的统计周期。
- 托管网站从浏览器跨域修改本机集成。
- 自动迁移或自动删除旧版本已安装的 Hook；用户可在 Dashboard 手动卸载。
- 改变云同步开关、上传策略或统计数据格式。
- 为每个自定义 Codex root 单独安装或卸载 notify Hook；本变更只扩展被动会话扫描来源。
- 删除某个 root 时追溯删除该目录已经产生的历史统计。

## Success Criteria

- SC-001: `init` 和 `serve` 启动测试证明不会调用任何第三方集成安装或修复逻辑。
- SC-002: 本地 Dashboard 能独立安装和卸载每个可管理 provider，并返回最新状态和明确错误。
- SC-003: 普通 CLI `serve` 每五分钟触发一次非重叠的全本地源轻量同步。
- SC-004: 本地 Dashboard 的“立即统计”触发完整本地同步，成功后刷新页面统计，失败时显示可见错误。
- SC-005: 用户可在本地 Dashboard 添加 `~/.codex`、`~/.codex-ipc` 等多个独立 Codex root，下一次同步同时统计所有 root 且不重复计数。
- SC-006: 保存的 Codex roots 在 CLI、原生端后台同步、会话分析和状态诊断中一致生效；未配置时保持现有 `CODEX_HOME` 兼容行为。

## Dependencies and Constraints

- 写操作必须复用现有 `x-tokentracker-local-auth` 和 loopback Origin 校验。
- 卸载只能删除 TokenTracker 可识别的托管配置，并恢复 Codex/Every Code 原 notify。
- provider 安装函数不得依赖启动阶段已经写入 `notify.cjs`；手动安装时应自行确保本地运行时和通知处理器存在。
- Codex root 配置属于本地敏感路径，读写 API 均须使用 local-auth 和 loopback Origin 校验；只扫描每个 root 下的 `sessions/` 与 `archived_sessions/`。
- roots 必须规范化和去重，拒绝空路径、相对路径、文件路径、文件系统根目录和超过上限的列表；允许尚未创建但父目录有效的绝对路径，以支持先配置后使用。
- 工作树已删除 `.gitignore` 中的 `openspec/` 规则，但本 change/SEP 仍未进入 Git 跟踪；实施前必须显式加入并通过 execute gate。

## Open Questions

- None.
