# Verification: 配置 DeepSeek Harness 多扫描目录

## Summary

- Status: Pass
- Verified revision: 2
- Executor: Codex
- Started at: 2026-09-20T14:39:28+08:00
- Completed at: 2026-09-20T14:58:47+08:00

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001, REQ-002, REQ-004 / roots manager 与 API | `node --test test/dsh-roots.test.js test/local-api-dsh-roots.test.js` | Pass | roots manager 与授权 API 定向测试全部通过 | Implementer |
| VER-002 | yes | REQ-002, REQ-003, REQ-005 / parser 与消费者 | `node --test test/deepseek-harness.test.js test/status.test.js test/diagnostics.test.js test/sync-upload-batching.test.js` | Pass | 54/54 passed | Implementer |
| VER-003 | yes | REQ-004 / Dashboard roots 管理 | `npm --prefix dashboard test -- src/lib/dsh-roots-api.test.js src/hooks/use-dsh-roots.test.jsx src/components/settings/DshRootsSettings.test.jsx src/lib/model-breakdown.test.ts src/pages/SettingsPage.test.jsx` | Pass | Dashboard 定向测试 39/39 passed | Implementer |
| VER-004 | yes | REQ-004 / copy、locale 与架构约束 | `npm run validate:copy && npm run validate:locale && npm run validate:ui-hardcode && npm run validate:guardrails` | Pass | copy、locale、UI hardcode 与 architecture guardrails 全部通过 | Implementer |
| VER-005 | yes | 全部 requirements / 全量回归与构建 | `npm test && npm run dashboard:build` | Pass | Node suite 2956 passed, 2 skipped；Dashboard production build passed；edge pricing parity 11/11 passed | Implementer |
| VER-006 | yes | REQ-002, REQ-003, REQ-005 / 兼容与隐私矩阵 | 自动化 fixtures：配置/override/default/Windows WSL、两个 roots 同 session、两次 sync、owner 失败恢复、legacy `dsh` source migration、queue/upload 路径扫描 | Pass | fallback、确定性 owner、连续 sync 幂等、legacy ledger 迁移及 payload 不含绝对路径均通过 | Implementer |
| VER-007 | yes | REQ-004 / 本地人工验收 | 在 `http://127.0.0.1:7681` 的桌面与 390px 视口打开 Settings → Integrations，检查 roots 添加、删除、保存、错误和中文文案；sync 生效与 401 契约由自动化测试验证 | Pass | 桌面与移动端 Playwright 检查通过；截图 `/tmp/dsh-settings-zh-visible.png`、`/tmp/dsh-settings-zh-mobile.png`。为避免改写真实 queue/upload，未执行 live sync | Implementer |
| VER-008 | yes | AC-001–AC-006 / artifacts 一致性 | 审阅 proposal/spec/design/tasks/SEP、实现 diff 与 VER-001–VER-007 证据 | Pass | AC-001 至 AC-006 与 revision 2 artifacts、实现和证据一致 | Reviewer |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change /Volumes/NV3500/Java/project/TokenTracker/openspec/changes/004-configure-dsh-scan-roots --phase archive` | Not Run | 仅在用户明确授权归档后执行，归档前必须通过 | Implementer |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | 两个有效 roots 可规范化保存/重载并保留其他配置字段；无效输入被拒绝且不改文件 | Pass | VER-001, VER-003 |
| AC-002 | 无配置时保持旧 fallback/WSL 行为，有配置时所有消费者只使用持久化 roots | Pass | VER-001, VER-002, VER-006 |
| AC-003 | 重叠 root/同 session 仅计一次，连续 sync 幂等，失败替换不双计且可恢复 | Pass | VER-002, VER-006 |
| AC-004 | 本地 Settings 完成 roots 管理与可访问反馈；非授权 GET/POST 为 401 且不泄露路径 | Pass | VER-003, VER-004, VER-007 |
| AC-005 | 多 root usage 使用稳定 `dsh-root:<key>`，公共统计保持 `dsh`，合计正确且 queue/upload 不含 root 绝对路径 | Pass | VER-002, VER-005, VER-006 |
| AC-006 | 每 root 卡片与 `DSH ALL` 正确展示/下钻且不重复计数，中文 Settings 无英文回退 | Pass | VER-003, VER-007, VER-008 |

## Deviations

- None.

## Blockers

- None.

## Handoff

- Current status: `ready_to_archive`
- Next action: 等待用户单独明确授权归档；授权前不得执行 archive gate 或移动 change。
