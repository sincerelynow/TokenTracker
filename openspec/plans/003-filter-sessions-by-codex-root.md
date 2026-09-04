---
type: SEP
version: 1.2
title: "按 Codex 配置目录筛选会话"
change_id: "003-filter-sessions-by-codex-root"
status: ready_to_archive
plan_revision: 1
approved_revision: 1
approved_by: "User"
approved_at: "2026-09-04T15:48:40+08:00"
approval_evidence: "用户消息：批准按 003 plan revision 1 开始实施，先实施代码，不执行test"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/003-filter-sessions-by-codex-root/tasks.md"
verification_record: "openspec/changes/003-filter-sessions-by-codex-root/verification.md"
blocked_from: ""
blocked_reason: ""
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Claude Code"
  - "Codex"
  - "Cursor"
created_at: "2026-09-04"
updated_at: "2026-09-04"
related_issue: ""
---

# Filter Sessions by Codex Root

## 1. Objective

让本地 Sessions 页面在保持 Codex provider 语义、现有统计口径和路径隐私的前提下，像首页一样按 `CODEX`、`CODEX_IPC` 及其他已产生会话的 Codex roots 筛选会话。

## 2. Background

当前 session discovery 已扫描所有配置 roots 的 `sessions/` 和 `archived_sessions/`，但在扁平化文件列表后固定写入 `source: codex`，root 身份没有进入 sidecar 或 browser response。Sessions UI 只有 provider、日期、项目和搜索筛选，因此自定义 root 会话可浏览但不可识别、不可按 root 筛选。

`002-aggregate-codex-root-usage` 已提供稳定的 root key/label 并处于 `ready_to_archive`。本 change 复用这些 metadata，新增 local browser 的正交实例维度，不改变 source 或云端数据。

## 3. Scope

### In Scope

- Codex session discovery、group、sidecar 与 browser row 的 root identity 传播。
- local Sessions response 的可选 `source_instance`、`instance_label`。
- Codex provider 下动态 `CODEX ALL` 与 root 级二级筛选。
- 多 root duplicate ownership、sidecar invalidation、旧行兼容和隐私边界。
- backend、Dashboard、文案、构建与桌面/移动手工验证。

### Out of Scope

- 首页、Daily Breakdown、其他 provider 实例筛选或每行 root badge。
- 云端 API、数据库、上传 payload、公开统计和配置格式变更。
- token/cost、session merge、subagent lineage、时间范围或 resume command 语义变更。

## 4. Current Architecture

`resolveCodexRootsSync()` 可输出有序 `{ path, key, label }`，但 `providerRoots()` 只返回 paths。`discoverSessionFiles()` 把所有 Codex root 的 active/archive 文件扁平化并按 session ID group；`scanCodexSession()` 只接收 file paths 并固定 `source: codex`。sidecar version 12 按 provider source、paths 与文件 stat 缓存。`listSessionsForBrowser()` 映射 local-only 行；`SessionsPage.jsx` 一次获取全部 rows 并只按 `row.source` 执行 provider filter。

## 5. Technical Approach

### Design

1. Codex discovery 直接消费有序 root records，在文件 group 上保留 first-root owner key/label，同时保持现有全局 session ID 合并与 parser 去重。
2. sidecar 保存 root metadata、升级版本并把 metadata/顺序纳入缓存身份；browser mapper 输出可选实例字段，其他 serializer 显式剥离。
3. Dashboard 类型接受可选实例字段，从加载 rows 动态派生选项；多实例时在 Codex provider 下显示 `CODEX ALL` 与实例 labels。
4. 实例条件与 provider、日期、项目、搜索条件共同过滤；选项消失时自动回退 all，缺少 metadata 的旧 Codex 行只属于 Codex/`CODEX ALL`。

### Reason

方案复用 002 的稳定身份，把 provider 与实例维度分离，避免破坏 `source: codex` 的 lineage、icon、pricing 和 resume 逻辑。客户端派生保持当前一次加载、即时筛选架构；sidecar version 与 serializer 边界保证缓存正确性和范围不扩散。

## 6. Files Impact

### Modify

- `src/lib/session-analytics.js`
  - Reason: Codex root identity 当前在 discovery 到 sidecar 的路径中丢失。
  - Changes: 传播有序 root metadata、确定 duplicate owner、升级 sidecar/cache identity、映射 browser 字段并从 insights/CSV 剥离。
- `dashboard/src/lib/sessions-api.ts`
  - Reason: local browser response 增加可选实例字段。
  - Changes: 为 `SessionRow` 增加可选 `source_instance` 与 `instance_label`，保持 source union 和 fetch API 不变。
- `dashboard/src/pages/SessionsPage.jsx`
  - Reason: 当前只有静态 provider filter。
  - Changes: 动态派生多实例 options、条件渲染二级 SegmentedControl、组合 filtering 和失效选择回退。
- `dashboard/src/content/copy.csv`
  - Reason: 新增 `CODEX ALL` 与 root filter aria 文案。
  - Changes: 登记 Sessions root filter 所需英文 copy keys。
- `dashboard/src/content/i18n/zh/core.json`
  - Reason: 新文案简体中文本地化。
  - Changes: 增加对应 copy keys。
- `dashboard/src/content/i18n/zh-TW/core.json`
  - Reason: 新文案繁体中文本地化。
  - Changes: 增加对应 copy keys。
- `dashboard/src/content/i18n/ja/core.json`
  - Reason: 新文案日文本地化。
  - Changes: 增加对应 copy keys。
- `dashboard/src/content/i18n/ko/core.json`
  - Reason: 新文案韩文本地化。
  - Changes: 增加对应 copy keys。
- `dashboard/src/content/i18n/de/core.json`
  - Reason: 新文案德文本地化。
  - Changes: 增加对应 copy keys。
- `test/session-analytics-codex-subagents.test.js`
  - Reason: 覆盖 root attribution 与 duplicate ownership。
  - Changes: 增加多 root、first-root owner、archive/subagent 兼容断言。
- `test/session-analytics.test.js`
  - Reason: 覆盖 sidecar 与 serializer 契约。
  - Changes: 增加 metadata cache invalidation、旧版本重建和 browser/insights/CSV privacy 断言。
- `dashboard/src/pages/SessionsPage.test.jsx`
  - Reason: 覆盖用户可观察的 root filter 行为。
  - Changes: 增加 all/instance、组合条件、单实例、旧行和刷新失效场景。

### Add

- None

### Delete

- None

## 7. Implementation Steps

1. 校验 revision 1 获得 planning 后二次批准，读取全部 `003` artifacts，确认 `002` 状态满足依赖，将 planning files 精确加入 Git 跟踪并运行 execute preflight gate。
2. 将 SEP 标记为 `implementing`，实现 Codex root-aware discovery/group、first-root ownership、sidecar version/cache identity 和 serializer 边界。
3. 扩展 Dashboard response 类型，实现在 Codex provider 下动态显示、切换和回退 root filter，并补齐文案。
4. 创建或修改 backend 与 UI 测试用例，核对其 Requirements/Scenarios 覆盖；此步骤不表示测试已执行。
5. 将 SEP 标记为 `verifying`，运行 `VER-001` 至 `VER-005`，再启动本地 server 完成 `VER-006` 桌面/移动交互和 Network response 检查。
6. 核对 AC-001 至 AC-006、兼容性、隐私和文档；全部 required evidence 通过后标记 `ready_to_archive`，更新 handoff 并等待独立归档授权。

## 8. Data/API Changes

- Local API: `tokentracker-sessions` 的 session row 增加可选 `source_instance?: string`、`instance_label?: string`。
- Sidecar: schema version 递增，旧缓存自动重建；不提供持久化迁移。
- Database: None。
- Cloud API / upload payload: None。
- Configuration / Environment Variables: None。
- Compatibility: 现有 response 字段和请求保持不变，新 Dashboard 兼容缺少新增字段的旧 response。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| discovery 重构破坏 duplicate/archive/subagent 语义 | High | 保留 group parser 数据流并补 first-root、archive、lineage 回归 |
| root metadata 变化未使 sidecar 失效 | Medium | 版本升级并把 key/label/顺序纳入 signature/cache identity |
| 旧行或刷新后失效选择造成意外空列表 | Medium | 旧行保留在 Codex/ALL，selected key 不存在时回退 all |
| root metadata 扩散到 insights/CSV | Medium | serializer 显式剥离和绝对路径 fixture 断言 |
| 多实例 control 在窄屏溢出 | Low | 复用现有可换行 control，并执行桌面/移动视口人工验收 |

## 10. Testing Plan

### Unit Test

- Node tests：root identity、first-root duplicate owner、sidecar invalidation、source compatibility、serializer privacy。
- Vitest：动态 options、ALL/instance、组合筛选、单实例隐藏、旧行和刷新回退。

### Integration Test

- 双 root active/archive rollout 经 `buildSessionAnalytics` 到 `listSessionsForBrowser` 的端到端本地链路。
- Dashboard production build、copy registry、UI hardcode 和 architecture guardrails。

### Manual Test

- 使用至少两个有会话的 Codex roots 启动 local CLI server，在桌面与移动视口选择 Codex、`CODEX ALL`、`CODEX`、`CODEX_IPC`，验证列表、结果计数、组合条件和布局。
- 在 Network 中检查 `tokentracker-sessions`：实例字段存在且 response 不新增 Codex root path 字段；切换筛选不触发额外请求。

## 11. Acceptance Criteria

- [x] AC-001: 两个 Codex roots 返回保持 `source: codex` 且 key/label 分别正确的 browser rows — Evidence: VER-001
- [x] AC-002: 跨 root 同 session ID 只返回一次、归属首个配置 root 且 token 不重复 — Evidence: VER-001
- [x] AC-003: `CODEX ALL`、具体实例及项目/日期/搜索组合筛选的列表和计数可判定正确 — Evidence: VER-002
- [x] AC-004: 单实例和旧行隐藏二级 control，旧行仍可见，失效选择回退 all — Evidence: VER-002
- [x] AC-005: sidecar 旧版本及 root metadata 变化触发重建，不保留旧归属或 label — Evidence: VER-001
- [x] AC-006: browser 不新增 root path，insights/CSV 不扩展实例字段，文案、guardrail 和 production build 均退出码 0 — Evidence: VER-001

## 12. Notes

- `002-aggregate-codex-root-usage` 当前为 `ready_to_archive`，`003` 可执行但不会代替或自动归档 `002`。
- 本规划不新增 session row root badge；实例身份通过二级筛选呈现。
- Implementation 与 Test Authoring 已完成；用户后续授权仅执行 CLI 验证，Dashboard 与人工验证保持未执行。
- VER-001 修复一次 root record 路径适配问题后重跑 45/45 pass；AC-001、AC-002、AC-005 已通过。
- VER-002 至 VER-006 已通过；change 当前为 `ready_to_archive`，归档仍需用户后续明确授权。
- 执行 Agent 不得只读取本 SEP；必须解析 `task_ledger` 与 `verification_record` 并读取关联 proposal、spec、design。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
