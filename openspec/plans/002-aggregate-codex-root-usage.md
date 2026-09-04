---
type: SEP
version: 1.2
title: "按 Codex 配置目录拆分并汇总用量"
change_id: "002-aggregate-codex-root-usage"
status: ready_to_archive
plan_revision: 1
approved_revision: 1
approved_by: "User"
approved_at: "2026-09-04T09:33:33+08:00"
approval_evidence: "用户消息：批准实施 plan revision 1，先只实施代码，不执行test"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/002-aggregate-codex-root-usage/tasks.md"
verification_record: "openspec/changes/002-aggregate-codex-root-usage/verification.md"
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

# Codex Root Usage Breakdown and Aggregate

## 1. Objective

在保持总量不重复、Codex provider 语义和路径隐私的前提下，分别统计并展示每个已配置 Codex root 的用量，同时提供汇总全部 roots 的 `CODEX ALL` 卡片。

## 2. Background

当前 resolver 已支持最多 16 个 roots，但 sync 将所有 rollout 统一归入 `source: codex`，小时桶在 parser 阶段已合并。Dashboard 已有按 source 卡片与点击下钻能力，因此需要补充稳定 root 归属、兼容迁移、Codex family canonicalization 和不参与二次总计的汇总卡。

## 3. Scope

### In Scope

- 每个 Codex root 独立的本地/project/cloud 用量桶。
- 多 root 时显示 root 卡片与 `CODEX ALL`，单 root 时只显示实例卡。
- root 与 aggregate 的模型、cost、cache 和 context 下钻。
- Codex family 定价、reasoning、排行榜聚合及路径隐私。
- 旧配置与旧合并数据的兼容、撤回、重建和 retry。

### Out of Scope

- 其他 provider 的实例统计。
- 公开 root 级排行榜。
- 上传 root 绝对路径。
- 删除已移除 root 的历史。
- 数据库 schema 变更。

## 4. Current Architecture

`codex-roots.js` 输出多个路径，`sync.js` 枚举每个路径但统一传递 `source: codex`；`rollout.js`、local-api queue reader、upload batch 和云端 ingest 均以 source/model/hour 为 latest key。account model breakdown 和 Usage Overview 按 source 生成 provider cards。Codex 价格与 reasoning 在 Node 和 edge 中以严格 source 判断实现。

## 5. Technical Approach

### Design

1. 引入 `codex-root:<opaque-key>` 内部 source namespace 和 Codex family helper。
2. roots 配置持久化稳定 key/label，并兼容旧字符串数组和 fallback。
3. parser 逻辑 source 保持 codex，bucket stats source 使用 root namespace。
4. 本地、project、upload 和 cloud 复用现有 source 唯一键保存独立 roots，不迁移数据库。
5. 私有 breakdown 保留实例，Dashboard 合成不参与基础总计的 `CODEX ALL`；公共 leaderboard 折叠为 codex。
6. context endpoint 支持 root filter；旧合并历史通过可重试全量重建拆分，缺失历史保留为 legacy aggregate。

### Reason

该方案复用现有持久化唯一键，避免高风险数据库和 account RPC schema 迁移；同时把 parser 语义与展示/统计归属明确分开，使所有实例继续获得 Codex 的解析、去重和定价行为。

## 6. Files Impact

### Modify

- `src/lib/codex-roots.js`: 配置对象、稳定 key/label、旧输入升级。
- `src/commands/sync.js`: root stats source、upload latest key、历史重建编排。
- `src/lib/rollout.js`: parser source 与 bucket/project stats source 分离。
- `src/lib/local-api.js`: queue/project 去重、family 元数据、context filter 与 legacy fallback。
- `src/lib/diagnostics.js`: 在损坏配置下继续生成诊断结果并报告配置错误。
- `src/lib/wrapped-aggregator.js`: 实例 latest key 与 Codex family 汇总。
- `src/lib/pricing/index.js`: 实例 source 使用 Codex 定价/reasoning 规则。
- `src/lib/codex-context-breakdown.js`: 单 root 与 all-roots 扫描。
- `dashboard/edge-patches/tokentracker-account-model-breakdown.ts`: 私有 root breakdown 与 Codex 定价。
- `dashboard/edge-patches/tokentracker-account-summary.ts`: Codex root reasoning 规则。
- `dashboard/edge-patches/tokentracker-account-daily.ts`: Codex root reasoning 规则。
- `dashboard/edge-patches/tokentracker-leaderboard-refresh.ts`: 实例定价并折叠公共 provider。
- `dashboard/edge-patches/tokentracker-leaderboard-profile.ts`: 实例定价并折叠公共 provider。
- `dashboard/src/lib/codex-roots-api.js`: roots 对象请求/响应兼容。
- `dashboard/src/hooks/use-codex-roots.js`: roots 对象状态。
- `dashboard/src/components/settings/CodexRootsSettings.jsx`: 展示实例 label/key 并编辑路径。
- `dashboard/src/lib/model-breakdown.ts`: root rows 与 synthetic aggregate card。
- `dashboard/src/lib/provider-display.js`: root/aggregate 显示名称。
- `dashboard/src/ui/dashboard/components/ProviderIcon.jsx`: root/aggregate 复用 Codex icon。
- `dashboard/src/ui/dashboard/components/UsageOverview.jsx`: 实例/汇总卡布局、计量隔离和下钻。
- `dashboard/src/ui/dashboard/components/ContextBreakdownPanel.jsx`: instance 查询参数。
- `dashboard/src/content/copy.csv`: 新增卡片与设置文案。
- `dashboard/src/content/i18n/zh/core.json`: 新文案翻译。
- `dashboard/src/content/i18n/zh-TW/core.json`: 新文案翻译。
- `dashboard/src/content/i18n/ja/core.json`: 新文案翻译。
- `dashboard/src/content/i18n/ko/core.json`: 新文案翻译。
- `dashboard/src/content/i18n/de/core.json`: 新文案翻译。
- `test/codex-roots.test.js`: 配置、身份与隐私测试。
- `test/local-api-codex-roots.test.js`: roots API 兼容测试。
- `test/rollout-parser.test.js`: stats source 归属测试。
- `test/codex-sync-hot-path.test.js`: 双 root、复制和连续 sync 测试。
- `test/codex-source-scoped-cache.test.js`: 后台同步输出 root source 的回归断言。
- `test/codex-union-cursor-divergence.test.js`: union 游标回归按 Codex family 汇总。
- `test/codex-wsl-shadow.test.js`: WSL roots 矩阵按 Codex family 汇总。
- `test/copilot-session-store-parser.test.js`: 隔离宿主 `CODEX_HOME`，避免跨 provider 测试污染。
- `test/sync-codex-rescan-repair.test.js`: legacy 历史迁移/retry 测试。
- `test/local-api-legacy-codex-schema.test.js`: legacy 与实例读取测试。
- `test/sync-upload-batching.test.js`: 实例 upload key 与 payload 隐私测试。
- `test/wrapped-aggregator-dedup.test.js`: 实例 latest 与 family 合计测试。
- `test/edge-pricing-parity.test.js`: Node/edge Codex root 定价 parity。
- `test/leaderboard-machine-cluster-parity.test.js`: 公共 Codex folding。
- `test/local-api-source-scope.test.js`: root source scope/family。
- `test/local-api-skills.test.js`: 隔离宿主 `CODEX_HOME`。
- `test/omp-hook.test.js`: 隔离宿主 `CODEX_HOME`。
- `test/session-analytics-wsl-roots.test.js`: Codex roots 与 Claude roots 独立性回归。
- `test/skills-manager.test.js`: 隔离宿主 `CODEX_HOME`。
- `test/sync-background.test.js`: 隔离宿主 `CODEX_HOME`。
- `test/sync-trae-cn.test.js`: 隔离宿主 `CODEX_HOME`。
- `dashboard/src/lib/codex-roots-api.test.js`: roots client 对象兼容。
- `dashboard/src/hooks/use-codex-roots.test.jsx`: roots hook 对象状态。
- `dashboard/src/components/settings/CodexRootsSettings.test.jsx`: 设置 UI label/path。
- `dashboard/src/lib/model-breakdown.test.ts`: root/aggregate totals。
- `dashboard/src/lib/provider-display.test.js`: root/aggregate 名称。
- `dashboard/src/ui/dashboard/components/ProviderIcon.test.jsx`: Codex icon 复用。
- `dashboard/src/ui/dashboard/components/__tests__/UsageOverview.test.jsx`: 卡片、下钻和 non-duplicate UI。
- `dashboard/src/ui/dashboard/components/__tests__/ContextBreakdownPanel.test.jsx`: instance/all roots context。

### Add

- `src/lib/codex-source.js`
  - Purpose: Codex root source namespace 的单一事实来源。
  - Contents: source 生成/解析、family canonicalization、display metadata 与 validation。

### Delete

- None

## 7. Implementation Steps

1. 校验 revision 1 已批准，读取全部 artifacts，将 artifacts 精确加入 Git 跟踪并运行 execute gate。
2. 标记 SEP 为 `implementing`，实现 source helper 与 roots 配置兼容层。
3. 接入 sync/rollout/queue/project/upload，并实现可重试历史重建。
4. 接入本地、edge、context 与公共 leaderboard 的 Codex family 行为。
5. 实现 Dashboard root cards 和 synthetic `CODEX ALL`，补齐文案。
6. 创建并核对所有测试资产，不提前标记执行通过。
7. 标记 SEP 为 `verifying`，运行 VER-001 至 VER-008，记录真实结果并核对 AC-001 至 AC-006。
8. 全部通过后标记 `ready_to_archive`，停止并等待单独归档授权。

## 8. Data/API Changes

- Database: None。
- Configuration: `codexHomes` 兼容 `string[]`，规范化保存为 `{ path, key, label }[]`。
- Queue/API: 内部 source 可为 `codex-root:<key>`；legacy `codex` 保留。私有 breakdown 增加 Codex family/instance metadata。
- Context API: 可选 `source_instance` 查询参数。
- Privacy: queue、cloud 和 network payload 不包含 root 绝对路径。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| Codex 专属逻辑遗漏实例 source | High | 统一 helper 与 Node/edge parity 测试 |
| 重建中断造成新旧重复 | High | 分阶段 marker、零值撤回、幂等 retry 测试 |
| synthetic aggregate 重复计入总量 | High | 展示层标记，基础 totals 只从真实 rows 计算 |
| root 名称或路径泄露 | Medium | opaque key、basename label、payload 安全断言 |
| 老版本 UI 显示内部 source | Low | 总量和 ingest 保持兼容，统一 release 更新客户端 |

## 10. Testing Plan

### Unit Test

- roots identity、source helper、model builder、display/icon、context filter 和定价 parity。

### Integration Test

- 双 root 同小时、复制 session、project queue、upload、两次 sync、迁移中断恢复、cloud/public folding。

### Manual Test

- 本地 Dashboard 桌面与移动视口验证 `CODEX`、`CODEX_IPC`、`CODEX ALL` 的数值、点击下钻、布局和 network payload。

## 11. Acceptance Criteria

- [x] AC-001: root 身份重载稳定、冲突可区分且 payload 无绝对路径 — Evidence: VER-001
- [x] AC-002: 同小时双 root 独立、复制只计一次且第二次 sync 幂等 — Evidence: VER-002
- [x] AC-003: 多 root 三卡、单 root 无冗余汇总且总量不重复 — Evidence: VER-004
- [x] AC-004: 实例卡与汇总卡的模型/context 下钻范围正确 — Evidence: VER-005
- [x] AC-005: 定价/reasoning 与 Codex 一致且公共 breakdown 只有 codex — Evidence: VER-006
- [x] AC-006: 旧配置和历史迁移可重试，不可恢复差额只保留一次 — Evidence: VER-003

## 12. Notes

- plan revision 1 已获批准，Implementation 与 CLI 验证已完成；用户明确排除原生 App 测试及人工 App/UI 验证。
- change 已进入 `ready_to_archive`；归档仍需用户另行明确授权。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
- 执行 Agent 必须读取关联 proposal、spec、design、tasks 与 verification，不得只读取 SEP。
