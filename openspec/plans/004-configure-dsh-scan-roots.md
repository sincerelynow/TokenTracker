---
type: SEP
version: 1.2
title: "配置 DeepSeek Harness 多扫描目录"
change_id: "004-configure-dsh-scan-roots"
status: ready_to_archive
plan_revision: 2
approved_revision: 2
approved_by: "User"
approved_at: "2026-09-20T14:39:28+08:00"
approval_evidence: "用户消息：批准实施 plan_revision: 2"
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/004-configure-dsh-scan-roots/tasks.md"
verification_record: "openspec/changes/004-configure-dsh-scan-roots/verification.md"
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
created_at: "2026-09-20"
updated_at: "2026-09-20"
related_issue: ""
---

# Configure DeepSeek Harness Scan Roots

## 1. Objective

让用户像管理 Codex scan roots 一样，在本地 Dashboard 配置多个 DeepSeek Harness home，并由 sync、status 与 diagnostics 一致扫描这些目录；同时按 root 展示用量卡和 `DSH ALL` 汇总卡，保持 provider family、游标兼容、跨目录去重、界面本地化和路径隐私。

## 2. Background

当前 `resolveDshHome()` 支持 `TOKENTRACKER_DSH_HOME`、`DSH_HOME` 与默认 `~/.dsh`，`resolveDshHomes()` 在 Windows 无显式 override 时支持 native/WSL union，但没有持久化多 root 配置和 Settings UI。`resolveDshSessionFiles()` 已能读取多个 resolver homes，`parseDshIncremental()` 已有 session contribution ledger 和 artifact replacement 安全门禁，因此架构支持把 discovery 输入扩展为用户配置的有序 roots，无需改变 queue/cloud schema。

Codex 的多 root 管理提供了本地 `config.json`、授权 API、Settings 和诊断先例。本 change 复用其契约但保留 DSH 特有 fallback 与 session identity 规则。规划前 43 项相关基线测试通过。

## 3. Scope

### In Scope

- `dshHomes` 多 root 配置、校验、去重、原子保存与 1–16 数量约束。
- 未配置时保持 DSH env/default/Windows-WSL fallback；配置存在时作为完整显式集合。
- 跨 root session identity owner、连续 sync 幂等、legacy cursor/contribution ledger 兼容。
- sync、status、diagnostics、本地 roots API 与 Settings UI 的一致接入。
- 稳定 `dsh-root:<key>` 私有统计 identity、每 root 用量卡、条件式 `DSH ALL` 汇总及下钻。
- DSH roots Settings 控件在简中、繁中、日、韩、德 locale 下不回退英文。
- copy/locales、README、Node/Vitest、validators、build 和人工验收。

### Out of Scope

- Sessions 页面按 DSH root 筛选。
- 云端 API、数据库、上传 schema、公开统计、日志 token 映射或定价变更。
- 发布、版本递增、安装包构建，以及用户 Harness 文件的创建/移动/删除。

## 4. Current Architecture

`src/lib/rollout.js` 同时承担 DSH home resolution、artifact discovery 和 incremental parsing；sync/status 直接调用其 exports。无配置时 resolver 可在 Windows 返回 native/WSL union，但任一 DSH env override 会成为唯一 root。parser 以 `cursors.dsh.files` 和 `cursors.dsh.sessions` 维护 watermark/contribution ledger，bucket 固定为 `source: dsh`。当前 local API 与 Dashboard 只实现 Codex roots 管理。

## 5. Technical Approach

### Design

1. 新增 `dsh-roots.js` 作为 DSH roots 单一事实来源，读取 `config.json.dshHomes`，实现安全校验、realpath 去重、探测、fallback 和原子保存。
2. 在没有配置时复现旧 resolver 结果；有配置时只返回有序显式 roots，避免自动目录越过用户设置边界。
3. discovery 传播 root priority；parser 依据 Harness session identity 确定唯一 owner，复用 contribution ledger 处理复制、迁移、损坏与恢复，所有 bucket 仍使用 `dsh`。
4. sync、status、diagnostics 和 local API 统一调用 manager；API 的 GET/POST 都使用现有 local authorization。
5. Dashboard 新增 DSH roots API client、hook 与 provider-specific Settings component，并补齐 copy/locales。
6. 为 roots 持久化稳定 key/label，parser 写入 `dsh-root:<key>`；私有 model breakdown 保留实例、Dashboard 合成 `DSH ALL`，公共统计折叠为 `dsh`。

### Reason

该方案在不改变统计 source 和云端契约的前提下解决多目录漏扫，并将扫描边界集中在一个可测试 resolver。独立 DSH manager 避免泛化 Codex 代码导致额外回归；session identity owner 则覆盖仅靠路径去重无法处理的复制 session。

## 6. Files Impact

### Modify

- `src/lib/rollout.js`
  - Reason: 当前 DSH discovery/parser 缺少可配置 ordered roots 与明确的跨 root owner。
  - Changes: 接受 root records、传播 priority、按 session identity 去重，保持 cursor ledger 并按 owner 写入 `dsh-root:<key>`。
- `src/lib/dsh-source.js`
  - Reason: DSH root sources 需要统一的 family、key 和 label 语义。
  - Changes: 新增 `dsh-root:` source helpers 和 canonicalization。
- `dashboard/src/lib/model-breakdown.ts`
  - Reason: Usage Overview 需要每 root 卡片和不重复计数的汇总卡。
  - Changes: 识别 DSH family、生成 root cards 和 synthetic `DSH ALL`。
- `dashboard/src/lib/provider-display.js`, `dashboard/src/ui/dashboard/components/ProviderIcon.jsx`
  - Reason: 新 source namespace 需要正确显示和复用 DSH icon。
  - Changes: 格式化 DSH root/ALL 标签并识别 provider family。
- `src/commands/sync.js`
  - Reason: sync 当前只用环境 resolver。
  - Changes: 使用 tracker config root state 驱动 DSH discovery，并报告局部扫描/迁移问题。
- `src/commands/status.js`
  - Reason: status 必须与 sync 报告相同扫描范围。
  - Changes: 使用统一 resolver 并展示所有生效 roots/session 数。
- `src/lib/diagnostics.js`
  - Reason: 多 root 配置错误需要可诊断，且不能让整份报告崩溃。
  - Changes: 读取统一 DSH root state并报告配置/探测结果。
- `src/lib/local-api.js`
  - Reason: 本地 Settings 需要受保护的读取/保存入口。
  - Changes: 增加 `GET|POST /functions/tokentracker-dsh-roots` 与输入错误映射。
- `dashboard/src/components/settings/IntegrationsSection.jsx`
  - Reason: Integrations settings 需要展示 DSH roots 控件。
  - Changes: 接收并条件渲染 `dshRootsState`。
- `dashboard/src/pages/SettingsPage.jsx`
  - Reason: 页面需要初始化 DSH roots hook。
  - Changes: 调用 `useDshRoots()` 并传给 Integrations section。
- `dashboard/src/content/copy.csv`
  - Reason: 新增用户可见控件和状态文案。
  - Changes: 登记 DSH roots title、subtitle、fields、validation、save/error 等 keys。
- `dashboard/src/content/i18n/zh/core.json`
  - Reason: 简体中文本地化。
  - Changes: 增加对应 DSH roots keys。
- `dashboard/src/content/i18n/zh-TW/core.json`
  - Reason: 繁体中文本地化。
  - Changes: 增加对应 DSH roots keys。
- `dashboard/src/content/i18n/ja/core.json`
  - Reason: 日文本地化。
  - Changes: 增加对应 DSH roots keys。
- `dashboard/src/content/i18n/ko/core.json`
  - Reason: 韩文本地化。
  - Changes: 增加对应 DSH roots keys。
- `dashboard/src/content/i18n/de/core.json`
  - Reason: 德文本地化。
  - Changes: 增加对应 DSH roots keys。
- `README.md`
  - Reason: 当前只描述默认 `~/.dsh` 扫描。
  - Changes: 说明本地 Settings 多 root、fallback 优先级和 provider-level 聚合。
- `test/deepseek-harness.test.js`
  - Reason: 覆盖多 root discovery、duplicate owner、幂等与恢复。
  - Changes: 增加同物理 root、同 session 跨 root、连续 sync 与失败恢复 fixtures。
- `test/status.test.js`
  - Reason: 覆盖 status 与 sync root 范围一致。
  - Changes: 增加配置 roots 与 fallback matrix 断言。
- `test/diagnostics.test.js`
  - Reason: 覆盖配置错误和多 root 诊断。
  - Changes: 增加健康/损坏配置场景。
- `test/sync-upload-batching.test.js`
  - Reason: 证明多 root 路径不进入网络 payload。
  - Changes: 增加 DSH root 绝对路径负向断言。
- `dashboard/src/pages/SettingsPage.test.jsx`
  - Reason: Settings 新增 hook 和 state wiring。
  - Changes: mock DSH roots hook 并验证 Integrations 渲染。

### Add

- `src/lib/dsh-roots.js`
  - Purpose: DSH roots 配置与解析的单一事实来源。
  - Contents: config I/O、校验、规范化、realpath 去重、fallback、probe 与 save。
- `test/dsh-roots.test.js`
  - Purpose: roots manager 单元测试。
  - Contents: 优先级、兼容输入、数量/路径校验、配置保留、权限与探测。
- `test/local-api-dsh-roots.test.js`
  - Purpose: local API 契约与权限测试。
  - Contents: 授权 GET/POST、非授权 401、错误映射、原子保存。
- `dashboard/src/lib/dsh-roots-api.js`
  - Purpose: Dashboard roots API client。
  - Contents: GET/POST、response normalization 与错误处理。
- `dashboard/src/lib/dsh-roots-api.test.js`
  - Purpose: API client 测试。
  - Contents: 请求、响应与失败场景。
- `dashboard/src/hooks/use-dsh-roots.js`
  - Purpose: 本地主机 gate、load/save 状态管理。
  - Contents: available/loading/saving/error/refresh/save state。
- `dashboard/src/hooks/use-dsh-roots.test.jsx`
  - Purpose: hook 生命周期测试。
  - Contents: local/non-local、load/save/error 场景。
- `dashboard/src/components/settings/DshRootsSettings.jsx`
  - Purpose: DeepSeek Harness roots 编辑 UI。
  - Contents: root rows、add/remove、重复检查、检测状态与保存反馈。
- `dashboard/src/components/settings/DshRootsSettings.test.jsx`
  - Purpose: Settings component 行为测试。
  - Contents: render、edit、validation、save/error/accessibility 场景。

### Delete

- None

## 7. Implementation Steps

1. 校验 revision 1 已获批准，读取全部 artifacts，精确加入 planning files 并运行 execute preflight gate。
2. 标记 SEP 为 `implementing`，完善 DSH roots manager 的稳定 key/label 及 fallback 兼容层。
3. 接入 discovery/parser、sync/status/diagnostics，完成 deterministic session owner 与 legacy ledger 兼容。
4. 实现受保护的 local API 和 Dashboard Settings 管理链路，补齐全部 locale 与 README。
5. 接入 `dsh-root:<key>` 私有统计、公共 family folding、root cards 与 synthetic `DSH ALL`。
6. 创建并核对 manager、API、parser/consumer、privacy 与 Dashboard 测试资产，不把创建测试视为测试通过。
7. 标记 SEP 为 `verifying`，执行 VER-001 至 VER-008 并把真实结果写入 `verification.md`。
8. 全部 required evidence 通过后标记 `ready_to_archive`，结束并等待用户单独授权归档。

## 8. Data/API Changes

- Configuration: `config.json` 新增可选 `dshHomes`；读取兼容 `string[]` 与 `{ path }[]`，保存为带稳定 `key`/`label` 的规范记录并保留其他字段。
- Local API: 新增受保护的 `GET|POST /functions/tokentracker-dsh-roots`。
- Cursor: 只允许向现有 DSH cursor records 添加可选 owner/root metadata；旧 cursor 惰性兼容，无破坏性 migration。
- Internal queue source: `dsh-root:<key>`；Database / Cloud API / Upload schema 不变，公共输出 canonicalize 为 `dsh`。
- Environment Variables: `TOKENTRACKER_DSH_HOME` 与 `DSH_HOME` 保留；只在未配置 `dshHomes` 时生效。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| 同 session 跨 roots 重复累计或 owner 抖动 | High | stable priority、session identity owner、两次 sync 与失败恢复测试 |
| 破坏 env/default/Windows-WSL 旧行为 | High | 无配置分支复用旧语义并覆盖完整 matrix |
| config save 覆盖无关字段 | High | fresh read/merge、atomic write、`0600` 与字段保留断言 |
| API 或 payload 泄露绝对路径 | Medium | local auth、401 测试、queue/upload path scan |
| UI 在非本地部署显示不可用控件 | Low | `isLocalDashboardHost()` gate 与 hook test |

## 10. Testing Plan

### Unit Test

- DSH roots manager、local API client/hook/component、路径校验、配置优先级和检测状态。

### Integration Test

- 两 roots 的不同 sessions、同 session 副本、symlink/realpath、连续 sync、owner artifact 失败恢复、status/diagnostics、legacy migration、queue/upload privacy。

### Manual Test

- 本地 Dashboard Settings 在桌面和窄屏添加/删除/保存 roots，触发下一次 sync，检查状态反馈、Network authorization 与生效扫描范围。

## 11. Acceptance Criteria

- [x] AC-001: 有效 roots 可规范化保存/重载并保留配置其他字段，无效输入被拒绝且不改文件 — Evidence: VER-001
- [x] AC-002: 未配置时保持旧 fallback/WSL 行为，有配置时所有消费者只使用持久化 roots — Evidence: VER-006
- [x] AC-003: 重叠 root/同 session 仅计一次，连续 sync 幂等，失败替换不双计且可恢复 — Evidence: VER-006
- [x] AC-004: 本地 Settings 可管理 roots 且反馈可访问，非授权 GET/POST 为 401 且不泄露路径 — Evidence: VER-007
- [x] AC-005: 多 root usage 使用稳定 `dsh-root:<key>`，公共统计保持 `dsh`，总量正确且 queue/upload 不含 root 绝对路径 — Evidence: VER-006
- [x] AC-006: 每 root 卡片与 `DSH ALL` 正确展示/下钻且不重复计数，中文 Settings 无英文回退 — Evidence: VER-008

## 12. Notes

- 本 change 复用 `002-aggregate-codex-root-usage` 已验证的内部 source 与 synthetic aggregate 模式，但保持独立 DSH family、ledger 和 migration 边界；不合并已完成的 change。
- 实际发布需按 `CLAUDE.md` 统一版本与多平台 release 流程另行执行；本 change 不含 release。
- 执行 Agent 不得只读取本 SEP；必须解析 `task_ledger` 与 `verification_record` 并读取关联 proposal、spec、design。
- `tasks.md` 是唯一任务状态账本，`verification.md` 是唯一验证证据账本。
