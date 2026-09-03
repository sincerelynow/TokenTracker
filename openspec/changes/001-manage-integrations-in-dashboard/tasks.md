# Tasks: Dashboard 手动管理统计集成

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；仅在真实阻塞或规划实质变化时停止。归档必须在用户于 `ready_to_archive` 后显式授权时单独执行。
- 每次只执行一个 `change_id`，不得混入其他 change 的文件或任务。

## 1. Preparation

- [x] 1.1 核对 revision 1 已有实现、当前多 Codex root 架构、已知验收偏差和工作树状态。
- [ ] 1.2 记录 planning artifacts 完成后用户对 `plan_revision: 2` 的二次实施确认，并同步 SEP 的 `approved_revision`、`approved_by`、`approved_at`；旧 revision 批准不再有效。
- [ ] 1.3 将 change/SEP 以显式路径加入 Git 跟踪，并运行 `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/001-manage-integrations-in-dashboard --phase execute`；门禁通过后才能实施。

## 2. Implementation

### Revision 1 Baseline

- [x] 2.1 提取 provider manager，并让 CLI uninstall 复用 — Files: `src/lib/integration-manager.js`, `src/commands/uninstall.js` — Verifies: REQ-002。
- [x] 2.2 从 init/serve 移除第三方集成安装与修复，并增加普通 CLI 五分钟非重叠同步 — Files: `src/commands/init.js`, `src/commands/serve.js` — Verifies: REQ-001, REQ-003。
- [x] 2.3 增加 integrations API、Dashboard section、文案和 README 基线 — Files: `src/lib/local-api.js`, `dashboard/src/lib/integrations-api.js`, `dashboard/src/hooks/use-integrations.js`, `dashboard/src/components/settings/IntegrationsSection.jsx`, `dashboard/src/pages/SettingsPage.jsx`, `src/cli.js`, `README.md`, `README.zh-CN.md`, `README.ja.md`, `README.ko.md`, `README.de.md`, `dashboard/src/content/copy.csv`, `dashboard/src/content/i18n/zh/core.json`, `dashboard/src/content/i18n/zh-TW/core.json`, `dashboard/src/content/i18n/ja/core.json`, `dashboard/src/content/i18n/ko/core.json`, `dashboard/src/content/i18n/de/core.json` — Verifies: REQ-002, REQ-004。

### Revision 2 Implementation

- [ ] 2.4 新增 Codex roots 模块，定义 `config.json.codexHomes` fallback、路径规范化/realpath 去重、16 项上限、探测和保留未知字段的原子保存 — Files: `src/lib/codex-roots.js` — Verifies: REQ-005。
- [ ] 2.5 让主同步和 cursor store 使用完整 roots 数组，合并各 root 的 `sessions/` 与 `archived_sessions/`，保留 Windows WSL union 和事件级去重 — Files: `src/commands/sync.js` — Verifies: REQ-005。
- [ ] 2.6 让状态、诊断、会话分析和 context breakdown 统一使用 root resolver — Files: `src/commands/status.js`, `src/lib/diagnostics.js`, `src/lib/session-analytics.js`, `src/lib/codex-context-breakdown.js` — Verifies: REQ-005。
- [ ] 2.7 新增受 local-auth 与 loopback Origin 保护的 Codex roots GET/POST endpoint — Files: `src/lib/local-api.js` — Verifies: REQ-005。
- [ ] 2.8 在本地 Settings > Integrations 增加 Codex scan roots 编辑器，支持添加、移除、保存、重复提示、探测状态和可见错误 — Files: `dashboard/src/lib/codex-roots-api.js`, `dashboard/src/hooks/use-codex-roots.js`, `dashboard/src/components/settings/CodexRootsSettings.jsx`, `dashboard/src/components/settings/IntegrationsSection.jsx`, `dashboard/src/pages/SettingsPage.jsx` — Verifies: REQ-005。
- [ ] 2.9 修正 revision 1 已发现偏差：Grok 只覆盖/删除可验证的托管文件；立即统计后通知 Dashboard usage consumers 重新读取统计 — Files: `src/lib/grok-hook.js`, `dashboard/src/components/settings/IntegrationsSection.jsx`, `dashboard/src/pages/DashboardPage.jsx` — Verifies: REQ-002, REQ-004。
- [ ] 2.10 更新 CLI help、五份 README 和 Dashboard locale，说明 roots 优先级、历史保留及 Hook 边界 — Files: `src/cli.js`, `README.md`, `README.zh-CN.md`, `README.ja.md`, `README.ko.md`, `README.de.md`, `dashboard/src/content/copy.csv`, `dashboard/src/content/i18n/zh/core.json`, `dashboard/src/content/i18n/zh-TW/core.json`, `dashboard/src/content/i18n/ja/core.json`, `dashboard/src/content/i18n/ko/core.json`, `dashboard/src/content/i18n/de/core.json` — Verifies: REQ-002, REQ-004, REQ-005。

## 3. Test Authoring

- [x] 3.1 revision 1 已创建 Integration Manager、local API、调度器和 Dashboard 基线测试 — Files: `test/integration-manager.test.js`, `test/local-api-integrations.test.js`, `test/serve-native-background-sync.test.js`, `dashboard/src/lib/integrations-api.test.js`, `dashboard/src/hooks/use-integrations.test.jsx`, `dashboard/src/components/settings/IntegrationsSection.test.jsx`, `dashboard/src/pages/SettingsPage.test.jsx` — Covers: REQ-001..REQ-004。
- [ ] 3.2 创建 resolver 测试，覆盖 fallback、配置优先级、路径展开、realpath 重复、文件/根目录/超限拒绝和原子写失败保护 — Files: `test/codex-roots.test.js` — Covers: REQ-005 / 保持 CODEX_HOME 兼容、拒绝无效或不安全路径。
- [ ] 3.3 扩展 Codex sync/cursor 测试，验证 `.codex` + `.codex-ipc` union、追加、归档、去重、删除 root 和无需重启生效 — Files: `test/codex-sync-hot-path.test.js`, `test/cursor-store.test.js` — Covers: REQ-005 / 同时统计两个独立目录、保存并移除自定义目录。
- [ ] 3.4 扩展跨消费者一致性测试 — Files: `test/status.test.js`, `test/diagnostics.test.js`, `test/session-analytics-codex-subagents.test.js`, `test/codex-context-hot-path.test.js` — Covers: REQ-005 / 同时统计两个独立目录、保持 CODEX_HOME 兼容。
- [ ] 3.5 创建 roots API 鉴权、校验、配置保留和失败原子性测试 — Files: `test/local-api-codex-roots.test.js` — Covers: REQ-005 / 保存并移除自定义目录、拒绝无效或不安全路径。
- [ ] 3.6 创建 Dashboard roots API/hook/editor 测试 — Files: `dashboard/src/lib/codex-roots-api.test.js`, `dashboard/src/hooks/use-codex-roots.test.jsx`, `dashboard/src/components/settings/CodexRootsSettings.test.jsx`, `dashboard/src/components/settings/IntegrationsSection.test.jsx`, `dashboard/src/pages/SettingsPage.test.jsx` — Covers: REQ-005。
- [ ] 3.7 增加 Grok 非托管文件保护和跨页面 usage refresh 测试 — Files: `test/integration-manager.test.js`, `test/init-uninstall.test.js`, `dashboard/src/components/settings/IntegrationsSection.test.jsx`, `dashboard/src/pages/DashboardPage.test.jsx` — Covers: REQ-002 / 卸载单个集成；REQ-004 / 手动统计成功。

## 4. Verification

- [ ] 4.1 运行聚焦 Node 测试 — Evidence: VER-001, VER-003, VER-004, VER-005, VER-013, VER-014。
- [ ] 4.2 运行聚焦 Dashboard Vitest — Evidence: VER-006, VER-015。
- [ ] 4.3 运行 copy、locale、UI hardcode 和 guardrails 校验 — Evidence: VER-007。
- [ ] 4.4 运行 `env -u CODEX_HOME npm test` 和 Dashboard build — Evidence: VER-008, VER-009。
- [ ] 4.5 用临时 HOME 人工验证集成安装/卸载、usage 刷新、双 root、即时同步、移除、跨重启和可复查证据 — Evidence: VER-010, VER-016。
- [ ] 4.6 核对 AC-001..AC-007、兼容性和历史保留语义 — Evidence: VER-011。
- [ ] 4.7 确认 README、CLI help、spec 与行为一致 — Evidence: VER-012。

## 5. Ready to Archive

- [ ] 5.1 所有 required verification 为 `Pass` 后更新验收项并将 SEP 标记为 `ready_to_archive`。
- [ ] 5.2 更新 Handoff，等待显式归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 记录归档授权并运行 archive gate — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change 并更新 SEP；失败时记录阻塞证据与恢复条件。
