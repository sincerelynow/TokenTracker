# Verification: 按 Codex 配置目录拆分并汇总用量

## Summary

- Status: Complete
- Verified revision: 1
- Executor: Codex
- Started at: 2026-09-04
- Completed at: 2026-09-04T11:31:25+08:00

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001; REQ-005 / 配置兼容与身份 | `node --test test/codex-roots.test.js test/local-api-codex-roots.test.js` | Pass | 10/10；稳定 key、冲突消解、旧配置升级及无路径 payload 全部通过 | Codex |
| VER-002 | yes | REQ-002; REQ-005 / sync 与迁移 | `node --test test/rollout-parser.test.js test/codex-sync-hot-path.test.js test/sync-codex-rescan-repair.test.js` | Pass | 311/311；双 root 独立、复制去重、两次 sync、空队列写入和 retry 通过 | Codex |
| VER-003 | yes | REQ-001; REQ-002; REQ-004; REQ-005 / queue 与上传 | `node --test test/local-api-legacy-codex-schema.test.js test/sync-upload-batching.test.js test/wrapped-aggregator-dedup.test.js test/local-api-source-scope.test.js` | Pass | 19/19；实例 latest key、legacy coexistence、family 与 payload 隐私通过 | Codex |
| VER-004 | yes | REQ-003; REQ-004 / 卡片展示 | `npm --prefix dashboard test -- --run src/lib/model-breakdown.test.ts src/lib/provider-display.test.js src/ui/dashboard/components/ProviderIcon.test.jsx src/ui/dashboard/components/__tests__/UsageOverview.test.jsx` | Pass | 47/47；root/aggregate/single-root/non-duplicate assertions 通过；补充 roots 设置测试 6/6 | Codex |
| VER-005 | yes | REQ-003 / 上下文下钻 | `npm --prefix dashboard test -- --run src/ui/dashboard/components/__tests__/ContextBreakdownPanel.test.jsx` | Pass | 13/13；instance/all roots 请求和内容隔离通过；仅有既存 jsdom `scrollTo` warning | Codex |
| VER-006 | yes | REQ-004 / edge、CLI 全量与构建 | 聚焦 edge 测试；三项 validator；CLI Node 全量（排除两个 Swift 原生 App 文件）；`npm run dashboard:build` | Pass | edge 7/7；copy/ui-hardcode/guardrails 全部 exit 0；269 个 CLI Node 测试文件 exit 0；Dashboard build 与 TypeScript strict check 通过。未将调用 Swift 的 `native-pet-limit-reset.test.js`、`codex-reset-bank-native.test.js` 纳入 CLI 回归 | Codex |
| VER-007 | no | REQ-001; REQ-003 / 人工 UI 与隐私 | 本地服务加载隔离 `.codex`/`.codex-ipc` 数据；桌面与移动视口交互检查 | Waived | 用户明确要求只关注 CLI，不验证 App；卡片、下钻、总量与 payload 隐私由 VER-001、VER-003、VER-004、VER-005 自动化覆盖 | User |
| VER-008 | yes | 全部 / 文档与发布约束 | 对照 `CLAUDE.md`、spec、实际 diff 和版本文件注册表审查 | Pass | 实现与 spec 一致；`src/` 和 `dashboard/` 变更在后续发布时必须统一 bump 并发布 npm/macOS/Windows/Linux，本次未获授权且未执行版本或发布操作 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change /Volumes/NV3500/Java/project/TokenTracker/openspec/changes/002-aggregate-codex-root-usage --phase archive` | Not Run | 仅在用户明确授权归档后执行 | Codex |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | root 身份重载稳定、冲突可区分、payload 无绝对路径 | Pass | VER-001, VER-003 |
| AC-002 | 同小时双 root 独立，复制 session 一次计数，二次 sync 幂等 | Pass | VER-002, VER-003 |
| AC-003 | 多 root 显示三卡，单 root 无冗余汇总，总量不重复 | Pass | VER-004 |
| AC-004 | 实例卡只下钻自身，汇总卡下钻全部 roots | Pass | VER-004, VER-005 |
| AC-005 | 定价/reasoning 与 Codex 一致，公共 breakdown 只有 codex | Pass | VER-003, VER-006 |
| AC-006 | 旧配置升级和历史迁移可重试，缺失历史只保留一次 | Pass | VER-001, VER-002, VER-003 |

## Deviations

- 用户在验证阶段明确将范围收窄为 CLI，不要求验证 App；因此跳过 Swift 原生 App 测试与 VER-007 人工 App/UI 验证。Dashboard 行为仍由已通过的聚焦组件测试和 production build 覆盖。
- 首次 CLI 全量回归发现旧测试仍严格匹配 `source === "codex"`；已改为共享 Codex family 判断或明确匹配 `codex-root:*`，相关 41 项与后续 CLI 全量均通过。

## Blockers

- None.

## Handoff

- Current status: `ready_to_archive`
- Next action: 等待用户明确授权归档；未获授权前不得运行 `VER-ARCHIVE-GATE`。
