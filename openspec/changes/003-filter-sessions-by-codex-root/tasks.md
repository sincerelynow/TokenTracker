# Tasks: 按 Codex 配置目录筛选会话

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；仅在真实阻塞或规划实质变化时停止。归档必须在用户于 `ready_to_archive` 后显式授权时单独执行。
- 每次只执行一个 `change_id`，不得混入其他 change 的文件或任务。

## 1. Preparation

- [x] 1.1 确认 `002-aggregate-codex-root-usage` 已为 `ready_to_archive` 或 `archived`，并核对 `003` 的 `Scope`、`Files Impact`、仓库规则和基线行为。
- [x] 1.2 记录 planning artifacts 完成后用户对当前 `plan_revision` 的二次实施确认，并同步 SEP 的 `approved_revision`、`approved_by`、`approved_at`；批准证据：用户消息“批准按 003 plan revision 1 开始实施，先实施代码，不执行test”。
- [x] 1.3 已将 `003` planning artifacts 精确加入 Git 跟踪，并运行 `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/003-filter-sessions-by-codex-root --phase execute`；结果：`PASS: execute gate`。

## 2. Implementation

- [x] 2.1 调整 Codex session discovery/group 数据结构，传播有序 root key/label，并保持重复 ID、archive 和 subagent 合并语义 — Files: `src/lib/session-analytics.js` — Verifies: REQ-001。
- [x] 2.2 为 sidecar 升级版本并让 root key/label/顺序参与缓存身份；在 browser mapper 输出可选实例字段，在 insights/CSV serializer 剥离实例元数据 — Files: `src/lib/session-analytics.js` — Verifies: REQ-003。
- [x] 2.3 扩展本地 Sessions response 类型的可选实例字段，保持旧响应可解析 — Files: `dashboard/src/lib/sessions-api.ts` — Verifies: REQ-001, REQ-003。
- [x] 2.4 从已加载 Codex rows 动态派生实例选项，实现多实例二级 control、组合筛选与失效选择回退 — Files: `dashboard/src/pages/SessionsPage.jsx` — Verifies: REQ-002, REQ-003。
- [x] 2.5 登记 `CODEX ALL` 和 Codex root filter 的 aria 文案并补齐现有 locale — Files: `dashboard/src/content/copy.csv`, `dashboard/src/content/i18n/zh/core.json`, `dashboard/src/content/i18n/zh-TW/core.json`, `dashboard/src/content/i18n/ja/core.json`, `dashboard/src/content/i18n/ko/core.json`, `dashboard/src/content/i18n/de/core.json` — Verifies: REQ-002。

## 3. Test Authoring

- [x] 3.1 扩展 Codex session tests，覆盖多 root 身份、配置顺序 owner、archive/subagent 兼容和 source 保持 `codex` — Files: `test/session-analytics-codex-subagents.test.js` — Covers: REQ-001 / 多 root 会话获得独立身份；跨 root 重复 session 确定性归属。
- [x] 3.2 扩展 sidecar/browser serializer tests，覆盖版本重建、root metadata 缓存失效、旧行兼容与 insights/CSV 剥离 — Files: `test/session-analytics.test.js` — Covers: REQ-003 / sidecar 与 root 配置变化保持一致；root 元数据不越过浏览器边界。
- [x] 3.3 扩展 Sessions UI tests，覆盖 `CODEX ALL`、具体 root、组合条件、单实例隐藏、旧行和刷新回退 — Files: `dashboard/src/pages/SessionsPage.test.jsx` — Covers: REQ-002 全部场景；REQ-003 / 旧 Codex 行缺少实例字段。

## 4. Verification

- [x] 4.1 运行 `node --test test/session-analytics-codex-subagents.test.js test/session-analytics.test.js test/session-analytics-wsl-roots.test.js` 并记录 backend、缓存、privacy 与 WSL 回归结果 — Evidence: VER-001。
- [x] 4.2 运行 `npm --prefix dashboard test -- src/pages/SessionsPage.test.jsx` 并记录多实例 UI 筛选结果 — Evidence: VER-002。
- [x] 4.3 运行 `npm run validate:copy` 和 `npm run validate:ui-hardcode` 并记录文案 registry 与 UI hardcode 结果 — Evidence: VER-003。
- [x] 4.4 运行 `npm --prefix dashboard run build` 并记录 TypeScript/Vite production build 结果 — Evidence: VER-004。
- [x] 4.5 运行 `npm run validate:guardrails` 并记录架构边界结果 — Evidence: VER-005。
- [x] 4.6 启动本地 CLI server，在桌面与移动视口手工验证 Codex 二级筛选的显示、切换、组合条件、结果计数、无重叠，并检查 `tokentracker-sessions` response 不含 Codex root path 字段 — Evidence: VER-006。
- [x] 4.7 逐项核对 AC-001 至 AC-006、兼容性、隐私、文档与实际行为一致 — Evidence: VER-001, VER-002, VER-003, VER-004, VER-005, VER-006。

## 5. Ready to Archive

- [x] 5.1 确认所有 required verification 为 `Pass`，更新验收项并将 SEP 标记为 `ready_to_archive`。
- [x] 5.2 更新 `verification.md` Handoff，明确 change 等待用户的归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 在用户于 `ready_to_archive` 后明确授权时，在 SEP 记录 `archive_approved_by`、`archive_approved_at`、`archive_approval_evidence`，再运行 `change_gate.py validate --phase archive` — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change，并将 SEP 标记为 `archived`；归档失败时标记 `blocked`，设置 `blocked_from: ready_to_archive` 并记录恢复条件。`blocked` 不得直接归档。
