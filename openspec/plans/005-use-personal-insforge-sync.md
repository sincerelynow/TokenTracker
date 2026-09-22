---
type: SEP
version: 1.2
title: "使用个人 InsForge 实例同步用量"
change_id: "005-use-personal-insforge-sync"
status: ready_to_archive
plan_revision: 2
approved_revision: 2
approved_by: "用户"
approved_at: "2026-09-22"
approval_evidence: "用户在修订版 2 规划完成后明确回复：批准修订版 2 实施"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/005-use-personal-insforge-sync/tasks.md"
verification_record: "openspec/changes/005-use-personal-insforge-sync/verification.md"
blocked_from: ""
blocked_reason: ""
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Codex"
created_at: "2026-09-22"
updated_at: "2026-09-22"
related_issue: ""
---

# 使用个人 InsForge 实例同步用量

## 1. Objective

仅连接用户显式配置的个人 InsForge 实例，并将多 Codex 与 DSH root 用量可靠同步、正确聚合。

## 2. Background

现有默认 URL/key 分布于 CLI、Dashboard 与构建工作流；单一 queue offset 无法证明新实例已收到旧历史。OpenSpec 002/004 已建立本地 root 来源，云端仍需在个人实例验证。

## 3. Scope

### In Scope

- 云端配置无上游默认目标；本地功能保持可用。
- 个人实例独立的设备身份与上传进度、可用 queue 历史重传。
- Codex/DSH root 行上传、私有统计、公共 family 汇总和路径隐私。
- fork 构建与部署配置文档。
- 已确认空库的基础 schema、现有增量迁移/RPC、edge functions 与服务端密钥部署。

### Out of Scope

- 自研同步后端、旧云账号/数据库直接迁移、实际发布 npm 或桌面包。

## 4. Current Architecture

本地 `sync.js` 解析到 `queue.jsonl`，`drainQueueToCloud` 向 ingest 上传；Dashboard 使用 InsForge SDK 登录并签发 device token；本地 API 与 Dashboard 从 account edge functions 读取跨设备统计。当前有硬编码默认目标和单一上传 offset。

## 5. Technical Approach

### Design

1. 将云配置改为显式 URL/公开 key，缺失时禁用云连接，清除所有活跃路径的上游默认回退。
2. 将设备 token 与上传 checkpoint 绑定目标实例；首次切换从本地 queue 重传，成功后才推进。
3. 维持 ingest/API 格式，验证 `codex-root:*`、`dsh-root:*` 在个人实例私有与公共统计中的语义。
4. 将构建输入改为 fork 自己的配置，清理指向上游实例的自动任务与文档指引。
5. 新增先于现有增量迁移的基础 schema，顺序应用迁移，再部署 23 个 edge functions 并检查 RLS。

### Reason

保留本地解析与 InsForge API 契约，缩小变更面和未来 upstream 合并冲突；实例专属状态解决历史遗漏。

## 6. Files Impact

### Modify

- `src/lib/runtime-config.js` — 移除默认 URL/key，校验显式云配置。
- `src/commands/init.js` — 初始化时不写入上游地址。
- `src/commands/sync.js` — 实例专属上传 checkpoint、设备令牌与安全重传。
- `src/lib/local-api.js` — 代理仅接受个人实例，未配置时不回退。
- `src/lib/cloud-account.js` — 跨设备读取不使用默认目标。
- `src/lib/browser-auth.js` — 登录入口与个人 Dashboard/实例配置一致。
- `src/lib/telemetry.js` — 匿名心跳在未配置实例时不连接上游。
- `dashboard/src/lib/insforge-config.ts` — 移除生产实例硬编码回退。
- `dashboard/src/lib/config.ts` — 云地址只取显式配置。
- `dashboard/src/lib/cloud-sync.ts` — 设备会话绑定目标实例。
- `dashboard/src/lib/cloud-sync-prefs.ts` — 持久会话带目标实例身份。
- `dashboard/src/contexts/InsforgeAuthContext.jsx` — 未配置或切换实例时清理旧登录状态。
- `dashboard/src/pages/DevicePage.jsx` — 去除上游 URL 回退。
- `dashboard/vite.config.js` — 开发代理无配置时不指向上游。
- `dashboard/edge-patches/tokentracker-ingest.ts` — 校验 root 行 ingest 契约，必要时补齐。
- `dashboard/edge-patches/tokentracker-account-model-breakdown.ts` — 核对私有 root 维度。
- `dashboard/edge-patches/tokentracker-leaderboard-refresh.ts` — 核对公共 family 汇总。
- `.github/workflows/ci.yml` — 构建不注入上游云目标。
- `.github/workflows/npm-publish.yml` — npm Dashboard 构建使用 fork 配置。
- `.github/workflows/release-dmg.yml` — macOS/Linux 包使用 fork 配置。
- `.github/workflows/release-windows.yml` — Windows 包使用 fork 配置。
- `.github/workflows/leaderboard-anticheat.yml` — 停用或改为个人实例目标。
- `.github/workflows/leaderboard-freshness.yml` — 停用或改为个人实例目标。
- `.github/workflows/leaderboard-moderation-audit.yml` — 停用或改为个人实例目标。
- `docs/PRIVACY.md` — 更新数据去向及个人实例说明。
- `README.zh-CN.md` — 更新个人实例配置、部署与示例徽章链接。
- `test/runtime-config.test.js` — 显式/缺失配置测试。
- `test/local-api-security.test.js` — 代理目标校验测试。
- `test/local-api-background.test.js` — 本地同步目标测试。
- `test/legacy-baseurl-migration.test.js` — 旧地址不再默默回退的迁移测试。
- `test/sync-background.test.js` — 自动同步无默认目标测试。
- `test/sync-upload-batching.test.js` — 目的地 offset 与四 root 载荷测试。
- `dashboard/src/lib/cloud-sync.test.ts` — 目标实例切换与会话失效测试。
- `dashboard/src/lib/cloud-sync-prefs.test.ts` — 设备会话存储测试。

### Add

- `docs/personal-insforge.md` — 个人实例所需 schema/RPC/functions、OAuth redirect、配置及首次同步步骤。
- `test/personal-insforge-sync.test.js` — 新实例重传、二次同步和失败不推进集成测试。
- `migrations/20260701000000_bootstrap-tokentracker.sql` — 空实例所需基础表、约束、RLS 和增量迁移前置对象。
- `scripts/deploy-personal-insforge.sh` — 严格核对目标项目并部署全部 edge functions、列出远端验证结果。

### Delete

- None.

## 7. Implementation Steps

1. 校验当前 revision 批准，读取关联 change 并通过 execute gate。
2. 标记 `implementing`，按 `tasks.md` 完成配置、状态、聚合与构建修改。
3. 创建/修改测试资产，保持测试执行状态独立。
4. 标记 `verifying`，运行定向测试、构建和实例端到端检查，结果只写入 `verification.md`。
5. 逐项核对 AC-001–003；所有 required evidence 通过后标记 `ready_to_archive`。
6. 结束并等待独立归档授权；失败则记录 `blocked` 和恢复条件。

## 8. Data/API Changes

- **Database:** 个人空实例新增可复现基础 schema；按顺序应用现有 migrations/RPC，不导入旧用户或用量。
- **API:** 保持现有 `tokentracker-*` 契约。
- **Configuration:** 云 URL/公开 anon key 显式配置，上传 checkpoint 绑定实例 URL。
- **Environment Variables:** CLI 使用 `TOKENTRACKER_INSFORGE_BASE_URL`、`TOKENTRACKER_INSFORGE_ANON_KEY`；Dashboard 构建使用 `VITE_INSFORGE_BASE_URL`、`VITE_INSFORGE_ANON_KEY`。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| 个人实例部署缺失 | High | 部署清单和真实实例验证 |
| 旧 offset/设备 token 泄漏到新实例 | High | 目标绑定与连续两次同步测试 |
| 合并 upstream 后回归默认地址 | Medium | 静态扫描与目标测试 |

## 10. Testing Plan

### Unit Test

- 配置、代理、设备会话与 root 载荷测试。

### Integration Test

- 临时 queue/模拟 ingest 的新实例重传、失败恢复和两次同步；Dashboard build 与 guardrails。

### Manual Test

- 真实个人实例登录、首次/二次同步、四 root 私有结果与公共汇总检查。
- 远端表/RPC/函数清单及匿名私有访问拒绝检查。

## 11. Acceptance Criteria

- [x] AC-001: 无配置不连接上游；配置后认证和云请求只到个人实例 — Evidence: VER-001
- [x] AC-002: 切换实例重传可用历史，失败不推进，二次同步幂等 — Evidence: VER-002
- [x] AC-003: 四 root 私有独立、公共按 family 只计一次且载荷无路径 — Evidence: VER-003
- [x] AC-004: 空实例建立应用对象并拒绝匿名私有访问 — Evidence: VER-007

## 12. Notes

- 真实实例已绑定，appkey 为 `8g8s7g8b`；2026-09-22 检查表、迁移与函数均为空，首条现有迁移因缺 `tokentracker_user_badges` 失败。修订后计划增加基础 schema。
- 实施中按现有边缘函数实际引用补充四条基础 RPC/配置迁移与两条校正迁移，并为三个只针对原项目用户的历史迁移增加空实例保护；这是批准的空实例部署与既有 API 契约验证所需。另修改 `src/commands/device-login.js`、设备授权 edge、对应测试及设备验证页 URL，避免跳转原站点。源代码未改变 cloud ingest 契约。实际文件与验证证据见 change tasks/verification。
- test 账号验收又发现社区 provider 汇总暴露 root source、localhost 登录配置误判及排行榜缺少定价辅助函数；均在相同批准范围内补齐并以真实账号和公开接口复测。个人项目当前有 37 条迁移和 23 个 active functions。
- 执行 Agent 必须读取关联 proposal、spec、design、tasks、verification；`tasks.md` 和 `verification.md` 分别是状态与证据唯一账本。
