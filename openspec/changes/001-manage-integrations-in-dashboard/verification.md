# Verification: Dashboard 手动管理统计集成

## Summary

- Status: Not Run
- Verified revision: 2
- Executor: unassigned
- Started at:
- Completed at:

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001 / 首次初始化、后续启动 | `node --test test/init-uninstall.test.js test/init-dry-run.test.js test/serve-runtime-repair.test.js` | Not Run | revision 2 必须重新验证启动零第三方写入 | Codex |
| VER-002 | yes | REQ-001 / 首次初始化 | 临时 HOME provider 文件清单与 SHA-256 前后比较 | Not Run | 预期所有 provider 文件不变 | Codex |
| VER-003 | yes | REQ-002 / 安装、卸载 | `node --test test/integration-manager.test.js test/init-uninstall.test.js` | Not Run | 必须含 Grok 非托管文件保护 | Codex |
| VER-004 | yes | REQ-002 / API 安全与错误 | `node --test test/local-api-integrations.test.js` | Not Run | 预期鉴权、校验、失败隔离通过 | Codex |
| VER-005 | yes | REQ-003 / 定时统计 | `node --test test/serve-native-background-sync.test.js` | Not Run | 预期 CLI/原生调度矩阵通过 | Codex |
| VER-006 | yes | REQ-002, REQ-004 / Dashboard 操作 | `npm --prefix dashboard test -- --run src/lib/integrations-api.test.js src/hooks/use-integrations.test.jsx src/components/settings/IntegrationsSection.test.jsx src/pages/SettingsPage.test.jsx src/pages/DashboardPage.test.jsx` | Not Run | 必须证明同步完成后 usage consumers 刷新 | Codex |
| VER-007 | yes | REQ-002, REQ-004, REQ-005 / UI 与文案 | `npm run validate:copy && npm run validate:locale && npm run validate:ui-hardcode && npm run validate:guardrails` | Not Run | 所有校验退出码应为 0 | Codex |
| VER-008 | yes | 全部需求 / Node regression | `env -u CODEX_HOME npm test` | Not Run | 预期 0 fail；平台 skip 单独记录 | Codex |
| VER-009 | yes | REQ-002, REQ-004, REQ-005 / Dashboard build | `npm --prefix dashboard run build` | Not Run | Vite production build 应成功 | Codex |
| VER-010 | yes | REQ-002, REQ-004 / 本地人工验收 | 本地 Dashboard 安装/卸载临时 provider 并立即统计 | Not Run | 证据保存到仓库内 verification artifact 路径 | Codex |
| VER-011 | yes | AC-001..AC-007 | 逐项核对 spec Acceptance Criteria | Not Run | 每项必须引用通过证据 | Codex |
| VER-012 | yes | 文档一致性 | 对照 README、CLI help、spec 与实际界面/API | Not Run | 自动安装与 roots 说明必须一致 | Codex |
| VER-013 | yes | REQ-005 / resolver 与 API 安全 | `node --test test/codex-roots.test.js test/local-api-codex-roots.test.js` | Not Run | fallback、路径校验、鉴权、原子写通过 | Codex |
| VER-014 | yes | REQ-005 / 多 root 同步与消费者一致性 | `node --test test/codex-sync-hot-path.test.js test/cursor-store.test.js test/status.test.js test/diagnostics.test.js test/session-analytics-codex-subagents.test.js test/codex-context-hot-path.test.js` | Not Run | 双 root、去重、即时生效和一致性通过 | Codex |
| VER-015 | yes | REQ-005 / Dashboard roots 管理 | `npm --prefix dashboard test -- --run src/lib/codex-roots-api.test.js src/hooks/use-codex-roots.test.jsx src/components/settings/CodexRootsSettings.test.jsx src/components/settings/IntegrationsSection.test.jsx src/pages/SettingsPage.test.jsx` | Not Run | 添加、移除、保存、状态、错误、托管站隐藏通过 | Codex |
| VER-016 | yes | REQ-005 / 双 root 人工验收 | 临时 HOME 启动本地服务，配置 `.codex` + `.codex-ipc`，同步、移除、重启后复核 | Not Run | 保存可复查日志/截图并记录各 root 唯一 token 断言 | Codex |
| VER-ARCHIVE-GATE | yes | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/001-manage-integrations-in-dashboard --phase archive` | Not Run | 仅在显式归档授权后执行 | Codex |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | init/serve 不改变任何 provider 配置且不调用集成 mutator | Not Run | VER-001, VER-002 |
| AC-002 | 目标 provider 状态按安装生命周期变化且非托管内容保留 | Not Run | VER-003, VER-004 |
| AC-003 | 未授权和未知输入被拒绝，单 provider 失败不影响其他 provider | Not Run | VER-004 |
| AC-004 | CLI 每五分钟非重叠同步，原生端不增加重复调度器 | Not Run | VER-005 |
| AC-005 | Dashboard 立即统计有防重入、usage 数据刷新、成功和可见失败反馈 | Not Run | VER-006, VER-010 |
| AC-006 | `.codex` 与 `.codex-ipc` 同时统计，删除 root 立即停止未来扫描且保留历史 | Not Run | VER-013, VER-014, VER-015 |
| AC-007 | roots 路径安全、消费者一致且未配置时保持 `CODEX_HOME` 兼容 | Not Run | VER-013, VER-014, VER-016 |

## Deviations

- revision 1 审查发现 Grok 托管所有权和立即统计后的 usage 数据刷新未满足原验收描述，纳入 revision 2 修正。

## Blockers

- change/SEP 当前尚未 Git 跟踪；实施前必须完成 task 1.3。

## Handoff

- Current status: `draft`
- Next action: 等待用户明确批准 `plan_revision: 2` 后进入 Implementation。

## Revision 1 Historical Evidence

- 2026-09-03 revision 1 曾记录聚焦 Node 54/54、Dashboard 15/15、validators、Node full suite 和 Dashboard build 通过；该证据因 Scope 与 Files Impact 实质变化而不作为 revision 2 的通过结论。
- 2026-09-03 后续审查复跑聚焦 Node 13/13、Dashboard 15/15 和 Dashboard build 通过；完整 Node suite 为 2518 pass、2 fail、2 skip，两项失败来自本机 Swift SDK/toolchain 与 ModuleCache 权限，仍须在 revision 2 实施后重新验证。
