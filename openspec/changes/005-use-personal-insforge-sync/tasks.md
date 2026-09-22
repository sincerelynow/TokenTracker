# Tasks: 使用个人 InsForge 实例同步用量

## Execution Contract

- 本文件是唯一任务状态账本；结果只写入 `verification.md`。
- 本 `plan_revision` 获用户在规划完成后明确批准，才可进入实施；实施后连续完成验证至 `ready_to_archive`，归档另需明确授权。
- 仅执行 `005-use-personal-insforge-sync`，不修改或归档 `002`、`004`。

## 1. Preparation

- [x] 1.1 确认 Scope、Files Impact、仓库规则、个人实例配置与基线测试。
- [x] 1.2 用户在规划完成后明确回复“批准修订版 2 实施”；SEP 已记录批准版本与证据。
- [x] 1.3 `change_gate.py validate --phase execute` 输出 `PASS: execute gate`。

## 2. Implementation

- [x] 2.1 取消 CLI、Dashboard、页面及代理的上游实例默认连接，给未配置状态明确反馈 — Verifies: REQ-001。
- [x] 2.2 让上传 checkpoint 与设备会话绑定个人实例并安全重传历史 — Verifies: REQ-002。
- [x] 2.3 核对/补齐 Codex 与 DSH root 行上传、私有与公共聚合行为 — Verifies: REQ-003。
- [x] 2.4 更新 fork 构建工作流、云端任务、隐私与个人实例部署说明 — Verifies: REQ-001, REQ-003。
- [x] 2.5 为个人空实例补齐可复现基础 schema，运行既有增量迁移/RPC，配置服务端 secrets 并部署 23 个 edge functions — Verifies: REQ-004。

## 3. Test Authoring

- [x] 3.1 更新配置、代理、安全和 Dashboard 云同步测试，覆盖无配置与个人实例目标 — Covers: REQ-001。
- [x] 3.2 扩展 queue 上传/历史迁移测试，覆盖实例切换、失败与两次同步 — Covers: REQ-002。
- [x] 3.3 扩展 Codex/DSH root 上传测试，覆盖去重和路径隐私，并在 test 账号下核对私有/公共统计 — Covers: REQ-003。
- [x] 3.4 创建基础迁移与函数部署清单验证，覆盖对象存在性和匿名访问边界 — Covers: REQ-004。

## 4. Verification

- [x] 4.1 运行定向 Node 与 Dashboard 测试并记录输出 — Evidence: VER-001, VER-002, VER-003。
- [x] 4.2 运行 Dashboard build、guardrail 和上游 URL 扫描 — Evidence: VER-004。
- [x] 4.3 在个人实例执行真实登录、首次/二次同步及 root 汇总检查 — Evidence: VER-005。
- [x] 4.4 核对所有 AC 与文档一致性，记录真实账号验证缺口 — Evidence: VER-006。
- [x] 4.5 核对远端迁移、RPC、函数和 RLS；执行重复部署检查 — Evidence: VER-007。

## 5. Ready to Archive

- [x] 5.1 所有 required 检查通过后将 SEP 标记为 `ready_to_archive`。
- [x] 5.2 更新 handoff，等待用户单独授权归档。

## Revision 3: 本地 Dashboard 运行时登录配置

前述已勾选任务和验证属于修订版 2。修订版 3 的规划包含当前工作树中已有的实现，下面的审批和验证状态仍按本修订版单独记录。

- [x] 5.3 用户在修订版 3 规划完成后明确批准核对当前实现并完成新增验证；SEP 已记录批准版本与证据。
- [x] 5.4 核对 `src/lib/local-api.js`、`dashboard/src/lib/insforge-config.ts`、`dashboard/src/main.jsx`、`dashboard/vite.config.js` 与 `docs/personal-insforge.md`：本地运行时读取公开配置，远程构建配置保持兼容 — Verifies: REQ-005。
- [x] 5.5 核对测试资产 `test/local-cloud-config.test.js`、`dashboard/src/lib/insforge-config.test.ts` 覆盖完整配置、缺失配置、动态刷新和公开字段边界 — Covers: REQ-005。
- [x] 5.6 独立执行 CLI 定向测试、Dashboard 单元测试、类型检查与无 `VITE_INSFORGE_*` 构建，并记录结果 — Evidence: VER-008, VER-009。
- [x] 5.7 核对 AC-005、文档和回滚方式，重新满足 `ready_to_archive` 门禁。

## 6. Archive

- [ ] 6.1 [ARCHIVE-ACTION] 用户在 `ready_to_archive` 后授权时，记录证据并运行 archive gate。
- [ ] 6.2 [ARCHIVE-ACTION] 归档 change，失败则记录阻塞与恢复条件。
