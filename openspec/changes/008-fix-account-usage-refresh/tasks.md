# Tasks: 修复账户用量发布与刷新延迟

## Execution Contract

- tasks.md为唯一任务账本，verification.md为唯一证据账本。
- 当前revision获后续明确批准后，连续推进实施和验证到ready_to_archive；真实阻塞记blocked。归档需之后独立批准。
- 只执行008；文件范围实质变化必须递增revision并更新全套文档。

## 1. Preparation

- [ ] 1.1 核对运行版本、当前源码、测试环境及Files Impact，记录基线。
- [ ] 1.2 记录本规划完成后用户对revision 1的实施批准，更新SEP批准字段。
- [ ] 1.3 将六个规划文件纳入Git跟踪并运行execute门禁；不得混入用户其他变更。
- [ ] 1.4 准备隔离home和测试数据库/InsForge，确认不使用真实账号写测试数据。

## 2. Implementation

- [ ] 2.1 实现固定目标、queueGeneration及结构化结果；处理批次上限/失败/锁/缺凭据 — Files: src/commands/sync.js, src/lib/sync-result.js — REQ-002/003/007。
- [ ] 2.2 实现服务端发布协调、认证状态接口及CLI兜底 — Files: src/lib/usage-publication.js, src/lib/local-api.js, src/commands/serve.js — REQ-001/005/006。
- [ ] 2.3 实现Dashboard协调器、自动唤醒、手动两入口和结果反馈 — Files: dashboard/src/lib/usage-publication.ts, dashboard/src/lib/cloud-sync.ts, dashboard/src/lib/cloud-sync-prefs.ts, dashboard/src/hooks/use-cloud-usage-sync.ts, dashboard/src/contexts/AccountViewContext.jsx, dashboard/src/pages/DashboardPage.jsx, dashboard/src/components/settings/IntegrationsSection.jsx, dashboard/src/lib/dashboard-refresh.ts — REQ-001/002/003/005。
- [ ] 2.4 实现五个fresh RPC包装器及共享缓存函数事务开关；编写回滚指引 — Files: migrations/20260928000000_add-account-fresh-reads.sql, docs/personal-insforge.md — REQ-004/007。
- [ ] 2.5 实现六个账户edge的fresh路径与能力头 — Files: design.md列明的六endpoint，对应SEP精确路径 — REQ-004/007。
- [ ] 2.6 实现proxy、API及四个hook的代次/缓存隔离和失败反馈 — Files: src/lib/cloud-account.js, dashboard/src/lib/api.ts, dashboard/src/hooks/use-usage-data.ts, dashboard/src/hooks/use-trend-data.ts, dashboard/src/hooks/use-activity-heatmap.ts, dashboard/src/hooks/use-usage-model-breakdown.ts — REQ-004/005。
- [ ] 2.7 完成文案、脱敏诊断、升级/回滚文档 — Files: dashboard/src/content/copy.csv, dashboard/src/content/i18n/zh/dashboard.json, src/lib/sync-result.js, src/lib/usage-publication.js, docs/personal-insforge.md — REQ-007。

## 3. Test Authoring

- [ ] 3.1 创建 `test/sync-publication-result.test.js`：水位线、队列更换、失败、部分批次、连续两次同步回归。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.2 创建 `test/local-api-usage-publication.test.js`：身份、开关、锁、缺凭据、状态接口授权和结构化结果。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.3 创建 `test/serve-account-publication.test.js`：CLI兜底发布及native所有者互斥。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.4 创建 `test/account-fresh-read.test.js`：六个edge新鲜路径、缓存隔离、失败及能力头的运行行为。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.5 创建 `test/account-fresh-read-db.test.js`：隔离Postgres中migration、fresh包装器、权限、缓存及事务设置回滚验证。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.6 创建 `dashboard/src/hooks/use-cloud-usage-sync.test.tsx`：假时钟覆盖页面常驻、焦点、网络恢复、隐藏页与注销取消。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.7 创建 `dashboard/src/lib/usage-publication.test.ts`：发布调度、代次隔离、重试以及本地兼容用例。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.8 创建 `dashboard/src/lib/api.account-fresh.test.ts`：缓存命中、旧在途响应、fresh响应能力和stale-if-error隔离。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.9 创建 `dashboard/src/pages/DashboardPage.account-refresh.test.jsx`：一次点击全链路及局部读取失败时保持错误状态。 — Covers: REQ-001至007中对应职责；映射见verification.md。
- [ ] 3.10 修改cloud-sync.test.ts、api.local-sync.test.ts、IntegrationsSection.test.jsx及backend-hot-path-guardrails.test.js，补齐集成、协议与普通缓存回归（精确路径见SEP）。
- [ ] 3.11 核对全部REQ/Scenario至少一个运行行为断言，源文件字符串断言不能单独证明fresh结果正确。

## 4. Verification

- [ ] 4.1 执行 VER-001，记录实际命令、退出码、版本和证据 — Evidence: VER-001。
- [ ] 4.2 执行 VER-002，记录实际命令、退出码、版本和证据 — Evidence: VER-002。
- [ ] 4.3 执行 VER-003，记录实际命令、退出码、版本和证据 — Evidence: VER-003。
- [ ] 4.4 执行 VER-004，记录实际命令、退出码、版本和证据 — Evidence: VER-004。
- [ ] 4.5 执行 VER-005，记录实际命令、退出码、版本和证据 — Evidence: VER-005。
- [ ] 4.6 执行 VER-006，记录实际命令、退出码、版本和证据 — Evidence: VER-006。
- [ ] 4.7 执行 VER-007，记录实际命令、退出码、版本和证据 — Evidence: VER-007。
- [ ] 4.8 执行 VER-008，记录实际命令、退出码、版本和证据 — Evidence: VER-008。
- [ ] 4.9 执行 VER-009，记录实际命令、退出码、版本和证据 — Evidence: VER-009。
- [ ] 4.10 执行 VER-010，记录实际命令、退出码、版本和证据 — Evidence: VER-010。
- [ ] 4.11 核对全部AC、范围、spec、文档及回滚；必要证据未通过不得结束为ready。

## 5. Ready to Archive

- [ ] 5.1 必要实施验证全部Pass，更新SEP为ready_to_archive。
- [ ] 5.2 更新handoff，说明代码完成度、独立部署步骤、待授权归档。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] ready_to_archive后获显式归档批准，记录授权字段并执行archive gate — Evidence: VER-ARCHIVE-GATE。
- [ ] 6.2 [ARCHIVE-ACTION] 归档到日期目录并更新SEP；失败标blocked，禁止直接归档blocked状态。
