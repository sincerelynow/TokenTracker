# Tasks: 配置 DeepSeek Harness 多扫描目录

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；仅在真实阻塞或规划实质变化时停止。归档必须在用户于 `ready_to_archive` 后显式授权时单独执行。
- 每次只执行一个 `change_id`，不得混入其他 change 的文件或任务。

## 1. Preparation

- [x] 1.1 确认 `Scope`、`Files Impact`、仓库规则、`002/003` 未归档 change 的独立性和基线测试结果。
- [x] 1.2 记录 revision 2 planning artifacts 完成后用户对当前 `plan_revision` 的二次实施确认，并同步 SEP 的 `approved_revision`、`approved_by`、`approved_at`；批准证据：用户消息“批准实施 plan_revision: 2”。
- [x] 1.3 将 revision 2 planning artifacts 精确加入 Git 跟踪，重新运行 execute gate。

## 2. Implementation

- [x] 2.1 完善 DSH roots manager，实现 `dshHomes` 兼容读取、稳定 key/label、校验、realpath 去重、fallback、探测和原子保存 — Files: `src/lib/dsh-roots.js`, `src/lib/dsh-source.js` — Verifies: REQ-001, REQ-002, REQ-005。
- [x] 2.2 将 DSH discovery/parser 接入 ordered root records 与 deterministic session owner，同时保持 legacy cursor/contribution ledger 并写入 `dsh-root:<key>` — Files: `src/lib/rollout.js` — Verifies: REQ-003, REQ-005。
- [x] 2.3 让 sync、status 与 diagnostics 统一消费 root state，并使单 root 错误可诊断且不阻断健康 roots — Files: `src/commands/sync.js`, `src/commands/status.js`, `src/lib/diagnostics.js` — Verifies: REQ-002, REQ-003。
- [x] 2.4 增加受 local authorization 保护的 DSH roots GET/POST API — Files: `src/lib/local-api.js` — Verifies: REQ-001, REQ-004。
- [x] 2.5 新增 Dashboard API client、hook 与 Settings component，并接入 Settings/Integrations — Files: `dashboard/src/lib/dsh-roots-api.js`, `dashboard/src/hooks/use-dsh-roots.js`, `dashboard/src/components/settings/DshRootsSettings.jsx`, `dashboard/src/components/settings/IntegrationsSection.jsx`, `dashboard/src/pages/SettingsPage.jsx` — Verifies: REQ-004。
- [x] 2.6 登记 UI copy 与五种真实 locale 翻译，更新 DeepSeek Harness README 说明 — Files: `dashboard/src/content/copy.csv`, `dashboard/src/content/i18n/zh/core.json`, `dashboard/src/content/i18n/zh-TW/core.json`, `dashboard/src/content/i18n/ja/core.json`, `dashboard/src/content/i18n/ko/core.json`, `dashboard/src/content/i18n/de/core.json`, `README.md` — Verifies: REQ-001, REQ-002, REQ-004, REQ-006。
- [x] 2.7 扩展私有 model breakdown、provider display/icon 与 Usage Overview，展示 root cards 和 synthetic `DSH ALL`，公共统计继续 fold 为 `dsh` — Files: `dashboard/src/lib/model-breakdown.ts`, `dashboard/src/lib/provider-display.js`, `dashboard/src/ui/dashboard/components/ProviderIcon.jsx`, local/cloud aggregation helpers — Verifies: REQ-005, REQ-006。

## 3. Test Authoring

- [x] 3.1 创建 roots manager 与 local API 测试 — Files: `test/dsh-roots.test.js`, `test/local-api-dsh-roots.test.js` — Covers: REQ-001, REQ-002, REQ-004 / AC-001, AC-002, AC-004。
- [x] 3.2 扩展 parser/sync、status、diagnostics 与隐私回归测试 — Files: `test/deepseek-harness.test.js`, `test/status.test.js`, `test/diagnostics.test.js`, `test/sync-upload-batching.test.js` — Covers: REQ-002, REQ-003, REQ-005 / AC-002, AC-003, AC-005。
- [x] 3.3 创建 Dashboard API/hook/component/model breakdown 测试并更新页面 wiring fixture — Files: `dashboard/src/lib/dsh-roots-api.test.js`, `dashboard/src/hooks/use-dsh-roots.test.jsx`, `dashboard/src/components/settings/DshRootsSettings.test.jsx`, `dashboard/src/lib/model-breakdown.test.ts`, `dashboard/src/ui/dashboard/components/__tests__/UsageOverview.test.jsx`, `dashboard/src/pages/SettingsPage.test.jsx` — Covers: REQ-004, REQ-006 / AC-004, AC-006。

## 4. Verification

- [x] 4.1 运行 roots manager/local API 定向测试并记录结果 — Evidence: VER-001。
- [x] 4.2 运行 DSH parser、status、diagnostics、upload 定向测试并记录结果 — Evidence: VER-002。
- [x] 4.3 运行 Dashboard roots 定向测试并记录结果 — Evidence: VER-003。
- [x] 4.4 运行 copy、locale、UI hardcode 和 architecture guardrails — Evidence: VER-004。
- [x] 4.5 运行完整 Node test suite 与 Dashboard production build — Evidence: VER-005。
- [x] 4.6 执行多 root 连续 sync、fallback/WSL、legacy source migration 和路径隐私兼容检查 — Evidence: VER-006。
- [x] 4.7 在本地 Dashboard 桌面与窄屏视口执行 roots 添加、删除、保存、错误和下次 sync 检查 — Evidence: VER-007。
- [x] 4.8 逐项核对 AC-001 至 AC-006、文档、spec 与实际行为一致 — Evidence: VER-008。

## 5. Ready to Archive

- [x] 5.1 确认所有 required verification 为 `Pass`，更新验收项并将 SEP 标记为 `ready_to_archive`。
- [x] 5.2 更新 `verification.md` Handoff，明确 change 等待用户的归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 在用户于 `ready_to_archive` 后明确授权时，在 SEP 记录 `archive_approved_by`、`archive_approved_at`、`archive_approval_evidence`，再运行 `change_gate.py validate --phase archive` — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change，并将 SEP 标记为 `archived`；归档失败时标记 `blocked`，设置 `blocked_from: ready_to_archive` 并记录恢复条件。`blocked` 不得直接归档。
