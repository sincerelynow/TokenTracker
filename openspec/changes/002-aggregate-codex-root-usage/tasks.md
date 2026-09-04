# Tasks: 按 Codex 配置目录拆分并汇总用量

## Execution Contract

- 本文件是唯一任务完成状态账本；验证结果只写入 `verification.md`，任务通过 `Evidence: VER-xxx` 引用证据。
- 当前 `plan_revision` 获得批准后，执行 Agent 必须在一次运行中连续推进 Implementation 和 Verification，最终进入 `ready_to_archive`；仅在真实阻塞或规划实质变化时停止。归档必须另获授权。
- 每次只执行 `002-aggregate-codex-root-usage`，不得混入其他 change。

## 1. Preparation

- [x] 1.1 确认 Scope、Files Impact、仓库规则、工作树与基线测试结果；按用户要求未运行基线测试。
- [x] 1.2 记录 planning artifacts 完成后用户对 plan revision 1 的二次实施确认，并同步 SEP 批准字段。
- [x] 1.3 将本 change 与 SEP 精确加入 Git 跟踪，运行 `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change /Volumes/NV3500/Java/project/TokenTracker/openspec/changes/002-aggregate-codex-root-usage --phase execute`；结果 PASS。

## 2. Implementation

- [x] 2.1 新增 Codex family/root source helper，定义 namespace、canonical source、label 与安全校验 — Files: `src/lib/codex-source.js` — Verifies: REQ-001, REQ-004。
- [x] 2.2 将 roots 配置升级为稳定对象模型并保持 `string[]`、`CODEX_HOME`、默认 root 与 WSL 兼容 — Files: `src/lib/codex-roots.js`, `src/lib/local-api.js`, `dashboard/src/lib/codex-roots-api.js`, `dashboard/src/hooks/use-codex-roots.js`, `dashboard/src/components/settings/CodexRootsSettings.jsx` — Verifies: REQ-001, REQ-005。
- [x] 2.3 分离 parser source 与 stats source，扩展 hourly/project bucket 归属和一次性可重试历史重建 — Files: `src/commands/sync.js`, `src/lib/rollout.js` — Verifies: REQ-002, REQ-005。
- [x] 2.4 更新本地 queue/project reader、上传 batch 与 Codex fallback，使实例 rows 独立去重且 legacy rows 兼容 — Files: `src/lib/local-api.js`, `src/commands/sync.js`, `src/lib/wrapped-aggregator.js` — Verifies: REQ-002, REQ-005。
- [x] 2.5 让本地与云端 model breakdown 输出 root family 元数据，并让 Codex 定价/reasoning 识别实例 source — Files: `src/lib/pricing/index.js`, `src/lib/local-api.js`, `dashboard/edge-patches/tokentracker-account-model-breakdown.ts`, `dashboard/edge-patches/tokentracker-account-summary.ts`, `dashboard/edge-patches/tokentracker-account-daily.ts` — Verifies: REQ-003, REQ-004。
- [x] 2.6 让公共 leaderboard/profile 将 root sources 折叠回 Codex — Files: `dashboard/edge-patches/tokentracker-leaderboard-refresh.ts`, `dashboard/edge-patches/tokentracker-leaderboard-profile.ts` — Verifies: REQ-004。
- [x] 2.7 支持按 root 或全部 roots 读取 Codex context breakdown — Files: `src/lib/codex-context-breakdown.js`, `src/lib/local-api.js`, `dashboard/src/ui/dashboard/components/ContextBreakdownPanel.jsx` — Verifies: REQ-003。
- [x] 2.8 构建独立 root cards 与 synthetic `CODEX ALL` 卡片，复用 Codex 图标并防止总量重复 — Files: `dashboard/src/lib/model-breakdown.ts`, `dashboard/src/lib/provider-display.js`, `dashboard/src/ui/dashboard/components/ProviderIcon.jsx`, `dashboard/src/ui/dashboard/components/UsageOverview.jsx` — Verifies: REQ-003, REQ-004。
- [x] 2.9 注册汇总/实例卡及设置字段文案和全部现有翻译 — Files: `dashboard/src/content/copy.csv`, `dashboard/src/content/i18n/zh/core.json`, `dashboard/src/content/i18n/zh-TW/core.json`, `dashboard/src/content/i18n/ja/core.json`, `dashboard/src/content/i18n/ko/core.json`, `dashboard/src/content/i18n/de/core.json` — Verifies: REQ-001, REQ-003。

## 3. Test Authoring

- [x] 3.1 扩展 roots 与 API 测试，覆盖旧配置升级、稳定 key、冲突、隐私和 config 字段保留 — Files: `test/codex-roots.test.js`, `test/local-api-codex-roots.test.js`, `dashboard/src/lib/codex-roots-api.test.js`, `dashboard/src/hooks/use-codex-roots.test.jsx`, `dashboard/src/components/settings/CodexRootsSettings.test.jsx` — Covers: REQ-001, REQ-005。
- [x] 3.2 扩展 parser/sync 测试，覆盖同小时双 root、复制 session、project rows、两次 sync 与中断迁移 — Files: `test/rollout-parser.test.js`, `test/codex-sync-hot-path.test.js`, `test/sync-codex-rescan-repair.test.js` — Covers: REQ-002, REQ-005。
- [x] 3.3 扩展本地 API、上传与 wrapped 测试，覆盖实例 latest keys、legacy coexistence 和 payload 隐私 — Files: `test/local-api-legacy-codex-schema.test.js`, `test/sync-upload-batching.test.js`, `test/wrapped-aggregator-dedup.test.js` — Covers: REQ-001, REQ-002, REQ-005。
- [x] 3.4 扩展 Dashboard 测试，覆盖 root/aggregate 卡、单 root、下钻、图标和非重复总计 — Files: `dashboard/src/lib/model-breakdown.test.ts`, `dashboard/src/lib/provider-display.test.js`, `dashboard/src/ui/dashboard/components/ProviderIcon.test.jsx`, `dashboard/src/ui/dashboard/components/__tests__/UsageOverview.test.jsx`, `dashboard/src/ui/dashboard/components/__tests__/ContextBreakdownPanel.test.jsx` — Covers: REQ-003, REQ-004。
- [x] 3.5 扩展 edge parity/leaderboard 测试，覆盖实例定价、reasoning 与公开 Codex 聚合 — Files: `test/edge-pricing-parity.test.js`, `test/leaderboard-machine-cluster-parity.test.js`, `test/local-api-source-scope.test.js` — Covers: REQ-004。
- [x] 3.6 更新既有 CLI 回归的 Codex family 断言与环境隔离，避免把 `codex-root:*` 误判为非 Codex 或读取宿主 `CODEX_HOME` — Files: `test/codex-source-scoped-cache.test.js`, `test/codex-union-cursor-divergence.test.js`, `test/codex-wsl-shadow.test.js`, `test/copilot-session-store-parser.test.js` — Covers: REQ-002, REQ-005。

## 4. Verification

- [x] 4.1 运行聚焦 Node 测试并记录结果 — Evidence: VER-001, VER-002, VER-003, VER-006。
- [x] 4.2 运行聚焦 Dashboard 测试并记录结果 — Evidence: VER-004, VER-005。
- [x] 4.3 运行 `npm run validate:copy`、`npm run validate:ui-hardcode` 与 `npm run validate:guardrails` — Evidence: VER-006。
- [x] 4.4 运行 CLI Node 全量回归（排除两个调用 Swift 的原生 App 文件）与 `npm run dashboard:build` — Evidence: VER-006。
- [x] 4.5 按用户最新要求将验证范围收窄为 CLI，不执行本地 App/UI 人工检查并记录 waiver — Evidence: VER-007。
- [x] 4.6 逐项核对 AC-001 至 AC-006、兼容性、隐私和 migration retry — Evidence: VER-001 至 VER-007。
- [x] 4.7 确认文档、spec 与实际行为一致，并按 `CLAUDE.md` 判断版本同步与发布准备 — Evidence: VER-008。

## 5. Ready to Archive

- [x] 5.1 确认所有 required verification 为 Pass（VER-007 经用户明确 waiver），更新验收项并将 SEP 标记为 `ready_to_archive`。
- [x] 5.2 更新 `verification.md` Handoff，明确 change 等待用户归档授权。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 获得 `ready_to_archive` 后的明确授权，记录 SEP archive approval 并运行 archive gate — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change 并将 SEP 标记为 `archived`；失败时按规则标记 `blocked`。
