---
type: SEP
version: 1.2
title: "Dashboard 手动管理统计集成"
change_id: "001-manage-integrations-in-dashboard"
status: ready_to_archive
plan_revision: 2
approved_revision: 2
approved_by: "User"
approved_at: "2026-09-03T20:15:45+08:00"
approval_evidence: "用户消息：openspec\\changes\\001-manage-integrations-in-dashboard 批准执行 plan_revision: 2"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/001-manage-integrations-in-dashboard/tasks.md"
verification_record: "openspec/changes/001-manage-integrations-in-dashboard/verification.md"
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Claude Code"
  - "Codex"
  - "Cursor"
created_at: "2026-09-03"
updated_at: "2026-09-03"
related_issue: ""
---

# Dashboard Manual Integration Management

## 1. Objective

取消 TokenTracker 初始化和启动阶段对第三方 AI 工具的自动 Hook/插件写入，改由本地 Dashboard 按 provider 手动管理；确保无 Hook 场景仍具备定时和立即统计能力，并支持从 Dashboard 持久化配置多个独立 Codex roots（例如 `.codex` 与 `.codex-ipc`）统一统计。

## 2. Background

当前首次 `serve` 自动执行 `init --yes`，`init` 安装检测到的集成；后续 `serve` 还会修复部分集成。统计数据实际来自 provider 日志、SQLite 或允许的 API，Hook 主要提供实时触发。原生三端已有五分钟后台统计，普通 CLI 缺少同等周期；Dashboard 已有 local-sync API 和 Usage Overview 刷新图标，可复用到更明确的集成管理界面。

revision 1 已实现 Hook 手动管理和普通 CLI 定时统计，但审查发现 Grok 所有权保护与 Settings 立即统计后的 usage 刷新仍需修正。Codex 同步目前只支持单值 `CODEX_HOME` 加可选 Windows WSL root，不能同时扫描两个独立本机 roots；parser/cursor store 已具备合并和去重基础。

## 3. Scope

### In Scope

- init/serve 启动零第三方集成写入。
- 十类可管理 provider 的状态、手动安装和手动卸载。
- 普通 CLI 五分钟轻量定时统计，保留原生现有调度。
- 本地 Dashboard 集成管理区域和显式立即统计反馈。
- CLI help、五份 README 和 Dashboard 多语言文案更新。
- Dashboard 添加、移除、探测并持久化最多 16 个 Codex 扫描 roots。
- sync、后台统计、session analytics、context breakdown、status 和 diagnostics 使用同一有效 roots 集合。
- 修正 revision 1 审查发现的 Grok 非托管文件保护和立即统计 usage 刷新偏差。

### Out of Scope

- 禁止或筛选被动数据源。
- 自定义统计周期。
- 托管 Dashboard 操作本机文件。
- 自动删除既有 Hook 或保留旧版自动安装行为。
- queue/cursors/cloud schema 变更。
- 为每个自定义 Codex root 管理 notify Hook。
- 移除 root 时撤回已经统计或上传的历史用量。

## 4. Current Architecture

合入前基线中，`bin/tracker.js -> src/cli.js -> cmdServe/cmdInit` 管理本地服务和初始化，`cmdInit -> applyIntegrationSetup` 执行全量集成安装，`cmdServe -> repairRuntimeIntegrations` 执行启动修复。当前 revision 1 工作树已移除这两条启动写入路径，并已加入 Integration Manager、integrations API、Settings 管理区和普通 CLI 定时同步；这些尚未提交的实现是 revision 2 的保留基线，仍需连同新增多 roots 能力一起复验。各 provider 的安全 upsert/remove/probe 位于 `src/lib/*-config.js`、`*-hook.js` 和 `openclaw-session-plugin.js`。`src/lib/local-api.js` 已提供鉴权 local-sync，Dashboard 通过 `triggerLocalSync()` 调用。原生三端独立调度后台同步。

当前 Codex root 在 `sync.js`、status、diagnostics 和 analytics 中分别从单值 `CODEX_HOME || ~/.codex` 解析。`openCursorStore()` 已接受 `codexRoots` 数组，Codex parser 已按事件身份去重，但主同步只向 cursor store 传一个本机 root。

## 5. Technical Approach

### Design

1. 增加服务端 Integration Manager 注册表，统一 provider 探测和单项安装/卸载，并供 CLI uninstall 与本地 API 复用。
2. 删除 init/serve 对第三方 mutator 的调用；手动安装时按需确保 TokenTracker runtime 和 `notify.cjs` 已准备。
3. 在本地 API 增加 integrations 查询和鉴权 action endpoint。
4. 在 Settings 增加 Integrations section，按 provider 展示状态和操作，并复用 `triggerLocalSync()` 提供立即统计。
5. 扩展 Node 服务后台同步选择：普通 CLI 五分钟执行，macOS/Linux 交给原生端，Windows 保持既有兜底。
6. 新增统一 Codex root resolver；持久化配置存在时使用 `config.json.codexHomes`，否则保持 `CODEX_HOME -> ~/.codex` fallback，并在 Windows union 允许的 WSL root。
7. 新增受保护 roots API 和 Dashboard 编辑器；配置保存后下一次同步无需重启生效。
8. 让所有 Codex usage/session/status consumers 使用同一 roots 集合；删除 root 只停止未来扫描，不改写历史统计。
9. 修正 Grok 托管文件所有权和跨页面 usage refresh 事件。

### Reason

该设计把“解析统计数据”和“修改第三方工具配置”拆成独立权限边界，用户可以不安装任何 Hook 仍依赖定时/手动统计；统一 roots resolver 进一步保证 totals、会话分析和诊断不会因各自读取不同 `CODEX_HOME` 而漂移。

## 6. Files Impact

### Modify

- `src/commands/init.js`
  - Reason: 当前初始化自动安装集成。
  - Changes: 仅初始化 TokenTracker 自身；不调用 integration setup，调整 dry-run/report。
- `src/commands/serve.js`
  - Reason: 当前启动自动修复集成且普通 CLI 缺少定时统计。
  - Changes: 删除 runtime integration repair；增加按 shell 选择的非重叠后台同步。
- `src/commands/uninstall.js`
  - Reason: 当前全量卸载逻辑与新逐项卸载重复。
  - Changes: 复用 Integration Manager 的安全卸载 adapter，保留 purge 行为。
- `src/lib/local-api.js`
  - Reason: Dashboard 需要受保护的集成操作和 Codex roots 配置入口。
  - Changes: 增加 integrations 与 codex-roots GET/POST 路由、输入校验、local-auth、Origin 和错误映射。
- `src/commands/sync.js`
  - Reason: 主同步当前只解析一个本机 Codex root。
  - Changes: 使用统一 resolver，将所有有效 roots 的 `sessions/` 和符合扫描模式的 `archived_sessions/` union 后交给 cursor store/parser。
- `src/commands/status.js`
  - Reason: 状态输出当前只显示单值 `CODEX_HOME`。
  - Changes: 展示每个有效 Codex root 的来源和探测状态。
- `src/lib/diagnostics.js`
  - Reason: 诊断当前只检查一个 Codex home。
  - Changes: 使用统一 resolver 并安全报告多 root 状态。
- `src/lib/session-analytics.js`
  - Reason: 会话浏览必须与 totals 使用相同 roots。
  - Changes: 从 resolver 获取所有 roots 并合并 sessions/archives，保持 session ID 去重。
- `src/lib/codex-context-breakdown.js`
  - Reason: Codex context 分析当前只读取一个 home。
  - Changes: 对有效 roots 执行一致扫描并合并去重结果。
- `src/lib/grok-hook.js`
  - Reason: revision 1 审查发现固定文件覆盖/删除缺少托管所有权校验。
  - Changes: 增加托管标记和安全写删语义，保留非托管同名文件。
- `src/cli.js`
  - Reason: 帮助文本仍描述自动安装。
  - Changes: 更新 init/集成管理和定时统计说明。
- `dashboard/src/pages/SettingsPage.jsx`
  - Reason: 设置导航缺少集成管理入口。
  - Changes: 注册仅本地可见的 Integrations section。
- `dashboard/src/pages/DashboardPage.jsx`
  - Reason: Settings 立即统计后 usage 数据不会即时刷新。
  - Changes: 订阅本地统计完成事件并复用既有聚合刷新函数。
- `dashboard/src/pages/DashboardPage.test.jsx`
  - Reason: 跨页面 usage refresh 必须有回归保护。
  - Changes: 验证 Settings 同步完成事件会触发 Dashboard usage consumers 重新读取统计。
- `dashboard/src/pages/SettingsPage.test.jsx`
  - Reason: 设置分区行为改变。
  - Changes: 覆盖本地可用/不可用及导航。
- `dashboard/src/content/copy.csv`
  - Reason: 新增用户可见文案。
  - Changes: 注册集成状态、操作、立即统计和错误文案。
- `dashboard/src/content/i18n/zh/core.json`
- `dashboard/src/content/i18n/zh-TW/core.json`
- `dashboard/src/content/i18n/ja/core.json`
- `dashboard/src/content/i18n/ko/core.json`
- `dashboard/src/content/i18n/de/core.json`
  - Reason: Dashboard 支持的 locale 必须覆盖新增 key。
  - Changes: 增加对应翻译。
- `README.md`
- `README.zh-CN.md`
- `README.ja.md`
- `README.ko.md`
- `README.de.md`
  - Reason: 当前文档宣称首次运行自动安装全部 Hook。
  - Changes: 改为 Dashboard 手动管理，并说明五分钟/立即统计。
- `test/init-uninstall.test.js`
- `test/init-dry-run.test.js`
- `test/serve-runtime-repair.test.js`
  - Reason: 当前测试锁定自动安装/修复行为。
  - Changes: 改为验证零启动写入及全量 CLI uninstall。
- `test/serve-native-background-sync.test.js`
  - Reason: 后台调度增加普通 CLI 分支。
  - Changes: 覆盖五分钟、参数、非重叠和原生 shell 选择。
- `test/codex-sync-hot-path.test.js`
- `test/cursor-store.test.js`
  - Reason: 多 roots 必须共享 parser 去重并保持独立 cursor path。
  - Changes: 覆盖双 root、追加、archive、重复会话、即时配置变化和 v2 cursor 分片。
- `test/status.test.js`
- `test/diagnostics.test.js`
- `test/session-analytics-codex-subagents.test.js`
- `test/codex-context-hot-path.test.js`
  - Reason: 所有 Codex 消费者必须使用一致 roots。
  - Changes: 增加持久化配置、fallback 和多 root 一致性用例。

### Add

- `src/lib/codex-roots.js`
  - Purpose: Codex 扫描 roots 的单一事实来源。
  - Contents: config fallback、路径校验/规范化/realpath 去重、上限、探测与原子保存。
- `test/codex-roots.test.js`
  - Purpose: 验证 roots 领域规则。
  - Contents: fallback、优先级、路径安全、重复、超限和原子写失败测试。
- `test/local-api-codex-roots.test.js`
  - Purpose: 验证 roots 本地 API。
  - Contents: GET/POST、local-auth、Origin、路径敏感信息保护、输入错误和配置保留。
- `dashboard/src/lib/codex-roots-api.js`
  - Purpose: Codex roots API client。
  - Contents: 受保护查询、原子保存和错误归一化。
- `dashboard/src/lib/codex-roots-api.test.js`
  - Purpose: 验证 roots client 请求与错误语义。
  - Contents: GET、POST、鉴权 header 和失败响应测试。
- `dashboard/src/hooks/use-codex-roots.js`
  - Purpose: 管理 roots 加载、草稿保存和刷新状态。
  - Contents: 仅本地主机加载、pending/error 和保存后状态替换。
- `dashboard/src/hooks/use-codex-roots.test.jsx`
  - Purpose: 验证 roots hook 生命周期。
  - Contents: 本地/托管模式、加载、保存和错误测试。
- `dashboard/src/components/settings/CodexRootsSettings.jsx`
  - Purpose: Dashboard 多 Codex roots 编辑器。
  - Contents: roots 列表、路径输入、添加/移除、探测状态、保存和错误反馈。
- `dashboard/src/components/settings/CodexRootsSettings.test.jsx`
  - Purpose: 验证 roots 的可观察 UI 行为。
  - Contents: 添加、删除、重复、pending、状态和失败测试。

- `src/lib/integration-manager.js`
  - Purpose: 单一 provider 集成注册表和操作边界。
  - Contents: probe/install/uninstall/list、输入白名单和 per-provider 串行化。
- `test/integration-manager.test.js`
  - Purpose: 验证 adapter 生命周期与托管内容安全边界。
  - Contents: 临时 HOME 的逐 provider 安装、卸载、失败隔离测试。
- `test/local-api-integrations.test.js`
  - Purpose: 验证 integrations API。
  - Contents: GET、local-auth、Origin、输入验证和错误响应测试。
- `dashboard/src/lib/integrations-api.js`
  - Purpose: Dashboard integrations API client。
  - Contents: list/action 请求、local-auth 和错误归一化。
- `dashboard/src/lib/integrations-api.test.js`
  - Purpose: 验证 client 请求与错误语义。
  - Contents: GET、install、uninstall、401/失败测试。
- `dashboard/src/hooks/use-integrations.js`
  - Purpose: 管理探测、刷新和 provider 操作状态。
  - Contents: 仅本地主机加载、并发状态和 refresh API。
- `dashboard/src/hooks/use-integrations.test.jsx`
  - Purpose: 验证 hook 生命周期。
  - Contents: 本地探测、托管站禁用、操作后刷新测试。
- `dashboard/src/components/settings/IntegrationsSection.jsx`
  - Purpose: 集成状态、手动操作和立即统计界面。
  - Contents: provider rows、安装/卸载确认、loading、成功/错误反馈。
- `dashboard/src/components/settings/IntegrationsSection.test.jsx`
  - Purpose: 验证可观察 UI 行为。
  - Contents: 状态渲染、操作防重入、立即统计成功/失败测试。

### Delete

- None

## 7. Implementation Steps

1. 校验当前 `plan_revision` 已获批准，读取关联 change 的全部 artifacts，将其以显式路径加入 Git 跟踪，并运行 execute preflight gate。
2. 将 SEP 标记为 `implementing`，实现 roots resolver 和配置原子读写，再接入 sync/cursor store。
3. 将 resolver 接入 status、diagnostics、session analytics 和 context breakdown，保证消费者一致。
4. 实现 roots 本地 API、Dashboard API/hook/editor，并修正 Grok 所有权和 usage refresh 偏差。
5. 创建或修改测试与多语言文档，并核对 Requirements/Scenarios；此步骤不表示测试已执行。
6. 将 SEP 标记为 `verifying`，运行聚焦测试、校验器、完整 Node 测试、Dashboard build 和双 root 人工验收，把结果只写入 `verification.md`。
7. 核对 AC-001..AC-007、兼容性、历史保留语义、README 和范围；全部 required evidence 通过后标记为 `ready_to_archive`。
8. 更新 handoff，结束本次执行并等待用户在 `ready_to_archive` 后明确授权归档。

## 8. Data/API Changes

- API: 新增 `GET/POST /functions/tokentracker-integrations`。
- API: 新增受保护的 `GET/POST /functions/tokentracker-codex-roots`。
- Configuration: `~/.tokentracker/tracker/config.json` 增加可选 `codexHomes: string[]`；字段缺失时保持 `CODEX_HOME -> ~/.codex`。
- Database: None。
- Environment Variables: None。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| 错误删除用户自有 Hook | High | 仅调用现有托管标记/命令匹配的 remove/restore，增加逐 provider 生命周期测试 |
| API 被非本地页面滥用 | High | local-auth、自定义 header、loopback Origin 和 provider/action 白名单 |
| 同步或配置写入并发 | Medium | provider 级串行化、UI 防重入、复用 sync.lock |
| 普通 CLI 与原生调度重复 | Medium | 按 `TOKENTRACKER_APP_SHELL` 分支，不给 macOS/Linux 增加 Node 五分钟 timer |
| 重复/symlink roots 双计数 | High | 规范化、realpath 去重、事件身份 dedup 和双 root 集成测试 |
| roots 指向文件系统根或超大目录 | High | 拒绝根目录和文件，只扫描固定子目录，最多 16 项 |
| config 原子更新覆盖其他字段 | High | 原子读改写且保留未知字段，失败测试证明原文件不变 |
| 各 Codex 消费者范围不一致 | Medium | 统一 resolver 和跨消费者契约测试 |

## 10. Testing Plan

### Unit Test

- Integration Manager provider 生命周期、未知输入、失败隔离和非托管内容保护。
- Dashboard API/hook/component 状态转换、loading 和错误反馈。
- CLI 定时器参数、周期和非重叠。
- Codex roots fallback、规范化、realpath 去重、路径安全、上限和原子写入。
- Dashboard roots editor 的添加、移除、保存、pending、探测和错误状态。

### Integration Test

- local API GET/POST 鉴权与 manager 组合。
- init/serve 在临时 HOME 下不写 provider 配置。
- 完整 Node suite、copy/locale/guardrails 和 Dashboard build。
- `.codex` 与 `.codex-ipc` 双 root 的 totals、cursor、session analytics、context/status/diagnostics 一致性。
- roots API 鉴权、配置保留和保存后无需重启生效。

### Manual Test

- 本地 Dashboard 安装/卸载一个临时 provider，确认状态即时变化。
- 点击立即统计，确认按钮 loading、数据刷新和失败提示。
- 无 Hook 保持 CLI `serve` 五分钟，确认 queue 更新时间变化。
- 在临时 HOME 配置 `.codex` 与 `.codex-ipc`，分别写入唯一会话，验证合并统计；移除 `.codex-ipc` 后验证仅停止新增扫描且历史保留。
- 重启本地服务后确认 roots 配置和探测状态保持。

## 11. Acceptance Criteria

- [ ] AC-001: init/serve 不改变 provider 配置且不调用集成 mutator — Evidence: VER-001
- [ ] AC-002: 单 provider 可安装、查询、卸载且非托管配置保留 — Evidence: VER-003
- [ ] AC-003: 未授权、未知输入和 provider 失败被隔离并返回确定错误 — Evidence: VER-004
- [ ] AC-004: 普通 CLI 五分钟非重叠统计且原生端不新增重复调度 — Evidence: VER-005
- [ ] AC-005: Dashboard 立即统计具有防重入、usage 数据刷新和可见错误反馈 — Evidence: VER-006
- [ ] AC-006: `.codex` 与 `.codex-ipc` 同时统计且移除只停止未来扫描、保留历史 — Evidence: VER-014
- [ ] AC-007: roots 路径安全、消费者一致且未配置时保持 `CODEX_HOME` 兼容 — Evidence: VER-013

## 12. Notes

- 工作树已删除仓库 `.gitignore` 中的 `openspec/` 规则，但当前规划文档仍未 Git 跟踪；执行门禁前必须显式加入。
- revision 1 的批准因 Scope、行为和 Files Impact 实质变化而失效；必须基于 revision 2 获得新的实施确认。
- 持久化 roots 只影响 Codex 会话被动扫描；per-root notify Hook 管理不在本 change。
- 执行 Agent 不得只读取本 SEP；必须解析 `task_ledger` 与 `verification_record` 并读取关联 proposal、spec、design。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
