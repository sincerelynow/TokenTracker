# Verification: 修复账户用量发布与刷新延迟

## Summary

- Status: Not Run
- Verified revision: 1
- Executor: 未分配
- Started at: 未开始
- Completed at: 未完成

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001 / S-001 | npm --prefix dashboard test -- src/hooks/use-cloud-usage-sync.test.tsx src/lib/usage-publication.test.ts | Not Run | 假时钟证明60秒启动上界、无积压不ingest、同身份single flight。 | Codex |
| VER-002 | yes | REQ-002 / S-002 | npm --prefix dashboard test -- src/pages/DashboardPage.account-refresh.test.jsx src/components/settings/IntegrationsSection.test.jsx src/lib/api.local-sync.test.ts | Not Run | 一次操作覆盖采集→目标→发布→新鲜读取，未完成不得报成功。 | Codex |
| VER-003 | yes | REQ-003 / S-003 | node --test test/sync-publication-result.test.js test/local-api-usage-publication.test.js test/sync-upload-batching.test.js | Not Run | 含100批上限、HTTP失败、游标未达标、并发队列增长、连续两次sync与锁竞争。 | Codex |
| VER-004 | yes | REQ-004 / S-004 | node --test test/account-fresh-read.test.js test/account-fresh-read-db.test.js；npm --prefix dashboard test -- src/lib/api.account-fresh.test.ts src/lib/cloud-sync.test.ts | Not Run | 真实行为测试+隔离Postgres；六类聚合预热后fresh返回新数据，旧请求不得覆盖。DB测试未配置不得记Pass。 | Codex |
| VER-005 | yes | REQ-005 / S-005 | node --test test/local-api-usage-publication.test.js test/personal-insforge-sync.test.js test/local-api-account-view.test.js test/cloud-account.test.js；npm --prefix dashboard test -- src/lib/usage-publication.test.ts src/contexts/AccountViewContext.test.jsx | Not Run | 退出/开关/账号/实例切换断言，无新上传、无越权、无跨身份污染。 | Codex |
| VER-006 | yes | REQ-006 / S-006 | node --test test/serve-account-publication.test.js test/serve-native-background-sync.test.js test/windows-background-sync-args.test.js test/macos-background-sync-source.test.js | Not Run | 五分钟兜底、native所有者排他、无凭据及退避行为。 | Codex |
| VER-007 | yes | REQ-007 / S-007 | node --test test/sync-publication-result.test.js test/account-fresh-read.test.js；npm --prefix dashboard test -- src/lib/api.account-fresh.test.ts | Not Run | 脱敏结构化日志；旧后端缺能力头失败提示；旧客户端普通请求仍成功。 | Codex |
| VER-008 | yes | 整体集成与真实验收 | 隔离测试home+测试InsForge实例，预热缓存→新增固定Token记录→单击刷新；关闭页面等待兜底；连续第二次同步；注入429/500/断网/账号切换 | Not Run | 记录时间线、目标/确认offset、六聚合与预期值；重复同步不增加总量；不读取真实聊天内容。禁止以生产账号写入测试数据代替。 | Codex |
| VER-009 | yes | 迁移/部署顺序/回滚 | 隔离Postgres应用新migration并调用5个fresh包装器；检查anon/authenticated拒绝；回滚到前版函数定义；测试普通读取 | Not Run | 验证SET LOCAL不泄漏事务、普通缓存继续有效，回滚不更改用量表和offset。 | Codex |
| VER-010 | yes | 仓库回归与构建 | npm run ci:local；npm --prefix dashboard test；npm --prefix dashboard run typecheck | Not Run | 退出码均0；既有基线失败必须独立记录和解释，不记Pass。 | Codex |
| VER-011 | yes | 规划完整性 | python "C:/Users/Administrator/.agents/skills/open-spec-workflow/scripts/change_gate.py" validate --repo . --change openspec/changes/008-fix-account-usage-refresh --phase plan | Pass | 2026-09-27，退出码0：PASS: plan gate。首次校验发现SEP多Evidence引用不符合工具单引用格式，修正后通过；不代表实施已验证。 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | python "C:/Users/Administrator/.agents/skills/open-spec-workflow/scripts/change_gate.py" validate --repo . --change openspec/changes/008-fix-account-usage-refresh --phase archive | Not Run | 仅ready_to_archive后经用户授权执行，不属于当前实施前验收。 | Codex |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | 在无退避且服务可用时，60 秒内启动发布；无待上传数据时不发送 ingest；同一身份最多一个上传 | Not Run | VER-001, VER-008 |
| AC-002 | 在本次请求超时边界内，发布达到本次采集后的目标后显示新值，或明确显示未完成；不得要求再次点击；期间新产生的数据不得无限延长本次任务 | Not Run | VER-002, VER-008 |
| AC-003 | 仅确认目标上传完成才更新云成功时间并发送成功事件；失败/部分完成保留旧统计且标记未完成；到期后允许重试 | Not Run | VER-003, VER-008 |
| AC-004 | 六类账户聚合反映已确认发布；旧请求不得覆盖；新数据读取失败不以 stale-if-error 伪装刷新成功；普通浏览仍使用缓存 | Not Run | VER-004, VER-008 |
| AC-005 | 本地可显示新值且不发起新云上传；旧身份结果不可发布到新视图；不会把本地值直接加到云总量造成重复计数 | Not Run | VER-005, VER-008 |
| AC-006 | CLI 每五分钟至多一次兜底采集/发布；native 已拥有调度时不得再启动第二套发布定时器；凭据缺失明确记录跳过 | Not Run | VER-006, VER-008 |
| AC-007 | 记录 runId、阶段耗时、目标/确认进度和错误分类且不记录凭据/内容；旧后端不被宣称刷新成功；新旧客户端普通请求兼容 | Not Run | VER-007, VER-008 |

## Deviations

- None. 生产部署和正式发布不属于当前实施就绪验收；隔离数据库与云端集成仍为必需验证。

## Blockers

- None at planning. 测试环境缺失将在实施时记录责任、原始错误、影响与恢复条件，不记为Pass。

## Handoff

- Current status: draft
- Next action: 等待用户对revision 1的明确实施批准。
- 本轮仅创建规划；没有修改业务代码、测试、数据库、用户配置或运行服务。
