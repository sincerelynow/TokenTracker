# Change: 按 Codex 配置目录筛选会话

## Why

Sessions 页面已经扫描全部已配置 Codex roots，但扫描结果统一暴露为 `source: codex`，root 身份在进入本地 sidecar 前丢失。因此用户虽然能浏览 `.codex`、`.codex-ipc` 等自定义目录中的会话，却无法像首页 Usage Overview 一样按 `CODEX`、`CODEX_IPC` 区分和筛选。

## What

- 在本地会话扫描和浏览器响应中保留稳定、非路径形式的 Codex root key 与显示 label，同时继续保持 provider `source: codex`。
- 在 Sessions 的 Codex provider 筛选下，根据实际会话动态提供 `CODEX ALL` 与各 root 的二级筛选。
- 单 root 或没有可识别 root 元数据时隐藏冗余二级筛选；旧响应和非 Codex 会话保持现有行为。
- 使 sidecar 缓存和重复 session 归属能够正确响应 root 配置、key 或 label 变化。

## Scope

### In Scope

- `sessions/` 与 `archived_sessions/` 中 Codex 会话的 root 归属传播。
- 本地 `tokentracker-sessions` 响应增加可选的 `source_instance`、`instance_label` 字段。
- Sessions 页面 `CODEX ALL`、`CODEX`、`CODEX_IPC` 及其他动态 root label 的二级筛选。
- 同一 session ID 出现在多个 roots 时的确定性归属。
- sidecar 版本升级、缓存失效、旧字段缺失兼容和路径隐私验证。

### Out of Scope

- 改变首页 Usage Overview 或 Daily Breakdown 的行为。
- 为 Claude、Grok 或其他 provider 增加实例筛选。
- 改变 token、cost、会话合并、subagent lineage 或时间范围口径。
- 修改云端 account API、排行榜、数据库 schema 或上传 payload。
- 修改 `codex resume <id>` 以自动设置 `CODEX_HOME`。
- 在每个会话行上新增 root badge。

## Success Criteria

- SC-001: 同时存在两个 Codex roots 的会话时，选择 Codex 后显示 `CODEX ALL` 和两个 root label，选择任一 label 后只保留该 root 的会话。
- SC-002: 只有一个可识别 Codex root 时不显示二级筛选，现有 Codex provider 筛选仍可用。
- SC-003: 同一 session ID 的跨 root 副本只出现一次，并确定性归属配置顺序中的第一个 root。
- SC-004: 本地浏览器响应只增加 opaque root key 和 label，不增加 Codex root 绝对路径；非浏览器 analytics/CSV 契约不扩展 root 元数据。

## Dependencies and Constraints

- 依赖 `002-aggregate-codex-root-usage` 已建立的稳定 root `key`、`label` 和 resolver；该 change 当前为 `ready_to_archive`，满足 `003` 的规划前置条件。
- Sessions 是 local-only 功能，响应已包含会话项目路径和原始 session ID；新增 root 元数据仍不得进入云端或 CSV 输出。
- `source` 必须继续为 `codex`，以保持定价、thread lineage、provider icon 和 resume 命令兼容。
- 新增用户可见文案必须登记在 `dashboard/src/content/copy.csv` 并覆盖全部现有 locale。

## Open Questions

- None. 本规划默认二级筛选只由当前已加载且包含 `source_instance` 的 Codex 会话动态生成，不为空 root 显示选项。
