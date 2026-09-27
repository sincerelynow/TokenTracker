---
type: SEP
version: 1.2
title: "修复账户用量发布与刷新延迟"
change_id: "008-fix-account-usage-refresh"
status: draft
plan_revision: 1
approved_revision: null
approved_by: ""
approved_at: ""
approval_evidence: ""
archive_approved_by: ""
archive_approved_at: ""
archive_approval_evidence: ""
execution_mode: implementation-to-ready-to-archive
task_ledger: "openspec/changes/008-fix-account-usage-refresh/tasks.md"
verification_record: "openspec/changes/008-fix-account-usage-refresh/verification.md"
blocked_from: ""
blocked_reason: ""
archived_at: ""
archive_path: ""
created_by:
  - "Codex"
target_agents:
  - "Codex"
created_at: "2026-09-27"
updated_at: "2026-09-27"
related_issue: ""
---

# 修复账户用量发布与刷新延迟

## 1. Objective

解决账户视图需多次点击才显示新Token的问题：自动发布新用量，一次手动操作确认本次目标上传并读取新数据，失败可见且可诊断。

## 2. Background

现场曾出现本地队列持续增长、上传offset约26分钟不变；代码存在仅本地刷新的按钮、依赖路由的云触发、非drain失败吞掉及多层缓存。日志不足以断言InsForge查询慢；30分钟节流不是已证实根因。7680被DoSvc占用、回退7681已确认正常。

## 3. Scope

### In Scope

- REQ-001至007：Dashboard和CLI自动发布、两种手动入口、固定目标结果、六类聚合fresh读取、身份隔离、诊断、测试及部署/回滚指引。
- 新后端能力验证与旧客户端兼容；native既有发布协议保持兼容。

### Out of Scope

- Token算法/历史数据修复、端口/DoSvc变更、原生UI重写、用户真实数据改写。
- 当前轮实现、部署、发版或归档；规划提交与推送按用户单独指令进行，后续获实施批准先交付ready_to_archive。

## 4. Current Architecture

现有工具日志→解析→queue.jsonl→本地API；云开启后视图读取InsForge account endpoints。CLI兜底为本地后台扫描，native另有所有者。云响应经浏览器/代理/edge/SQL缓存。身份checkpoint按实例、账号、machine隔离。详细证据见proposal.md与design.md。

## 5. Technical Approach

### Design

1. 增加统一发布协调器与认证轻量状态接口；可见页60秒检查、事件唤醒、CLI五分钟兜底，尊重native所有者。
2. 采集后捕获queueGeneration+targetOffset；确认scoped offset达标才发布成功事件；部分/失败独立反馈。
3. 单次账户手动请求合并轻量采集及发布，不重复全扫；纯本地不走云。
4. 六account endpoints支持fresh=1及能力头；新增五个事务范围SQL包装器绕过共享旧缓存，保留聚合口径。
5. 缓存与在途请求按身份/代次隔离，fresh失败不得回退旧值冒充成功。
6. 脱敏结构化诊断、测试库验证与兼容部署/回滚。

### Reason

直接覆盖观察到的采集和发布脱节、重复刷新旧值及错误成功反馈；以可确认进度替代固定等待时间。

## 6. Files Impact

### Modify

- `src/commands/sync.js`
  - Reason: 捕获解析后队列目标，返回结构化发布结果，精确区分部分完成/失败并保留原 CLI 输出默认行为。
  - Changes: 限定于本条职责及其兼容性处理。
- `src/lib/local-api.js`
  - Reason: 复用身份与凭据签发流程，暴露认证的同步状态与发布结果，将云开关作为发布边界。
  - Changes: 限定于本条职责及其兼容性处理。
- `src/commands/serve.js`
  - Reason: 在现有五分钟兜底中调用统一发布协调器；保留 native 所有者排他规则。
  - Changes: 限定于本条职责及其兼容性处理。
- `src/lib/cloud-account.js`
  - Reason: 上传后按身份清理代理缓存；新鲜读取不共享旧请求且禁止旧值回退。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/api.ts`
  - Reason: 解析同步结果，传递新鲜读取语义与代次，拒绝未支持能力标识的响应。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/cloud-sync.ts`
  - Reason: 统一手动/自动发布，校验上传目标，错误分类，成功后失效缓存并请求新值。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/cloud-sync-prefs.ts`
  - Reason: 云成功事件只用于已确认发布，身份切换重置状态。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/hooks/use-cloud-usage-sync.ts`
  - Reason: 可见页面60秒本地状态检查、focus/online/本地事件唤醒，卸载取消与合并。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/contexts/AccountViewContext.jsx`
  - Reason: 同步代次及新鲜读取上下文，账号切换隔离，完成事件触发刷新。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/pages/DashboardPage.jsx`
  - Reason: 账户手动刷新等待完整流程，显示阶段与失败；纯本地保留现有快速统计。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/components/settings/IntegrationsSection.jsx`
  - Reason: 立即统计复用账户发布流程，按结果发布对应事件和反馈。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/dashboard-refresh.ts`
  - Reason: 协调统计与云上传完成顺序，配额读取不阻塞用量反馈。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/hooks/use-usage-data.ts`
  - Reason: 传递新鲜读取上下文；旧请求和本地持久缓存不得覆盖本次确认结果。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/hooks/use-trend-data.ts`
  - Reason: 趋势读取支持新鲜代次及失败保留状态。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/hooks/use-activity-heatmap.ts`
  - Reason: 热图读取支持新鲜代次及失败保留状态。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/hooks/use-usage-model-breakdown.ts`
  - Reason: 模型读取支持新鲜代次及失败保留状态。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-summary.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-daily.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-hourly.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-monthly.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-heatmap.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/edge-patches/tokentracker-account-model-breakdown.ts`
  - Reason: 增加认证 fresh=1 路径，调用 fresh RPC，隔离缓存及在途请求，输出能力响应头；普通路径保留缓存。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/content/copy.csv`
  - Reason: 登记采集、上传、读取、部分完成及失败的用户文案。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/content/i18n/zh/dashboard.json`
  - Reason: 补齐新增简体中文 Dashboard 文案。
  - Changes: 限定于本条职责及其兼容性处理。
- `docs/personal-insforge.md`
  - Reason: 记录同步完成语义、时间边界、升级顺序、诊断和7681端口说明。
  - Changes: 限定于本条职责及其兼容性处理。
- `test/backend-hot-path-guardrails.test.js`
  - Reason: 保留普通账户读取缓存约束，允许明确 fresh 路径；防止30秒全量云轮询。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/cloud-sync.test.ts`
  - Reason: 扩展失败/部分完成/水位线和成功事件时序用例。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/lib/api.local-sync.test.ts`
  - Reason: 覆盖结构化返回、旧服务兼容与本地调用。
  - Changes: 限定于本条职责及其兼容性处理。
- `dashboard/src/components/settings/IntegrationsSection.test.jsx`
  - Reason: 覆盖一次立即统计完成账户刷新及错误反馈。
  - Changes: 限定于本条职责及其兼容性处理。

### Add

- `src/lib/usage-publication.js`
  - Purpose: 服务端共用发布与状态协调器；HTTP和CLI兜底共享云开关、凭据、排他和退避边界。
  - Contents: 按 design.md 的边界实现与验证。
- `src/lib/sync-result.js`
  - Purpose: 定义结构化同步结果、目标判定与脱敏诊断格式，提供可独立测试的协议。
  - Contents: 按 design.md 的边界实现与验证。
- `dashboard/src/lib/usage-publication.ts`
  - Purpose: Dashboard统一发布协调器：合并、代次、状态及新鲜读取上下文。
  - Contents: 按 design.md 的边界实现与验证。
- `migrations/20260928000000_add-account-fresh-reads.sql`
  - Purpose: 增加五个fresh RPC包装器和事务内绕过共享缓存的服务端开关，保留原RPC签名及权限。
  - Contents: 按 design.md 的边界实现与验证。
- `test/sync-publication-result.test.js`
  - Purpose: 水位线、队列更换、失败、部分批次、连续两次同步回归。
  - Contents: 按 design.md 的边界实现与验证。
- `test/local-api-usage-publication.test.js`
  - Purpose: 身份、开关、锁、缺凭据、状态接口授权和结构化结果。
  - Contents: 按 design.md 的边界实现与验证。
- `test/serve-account-publication.test.js`
  - Purpose: CLI兜底发布及native所有者互斥。
  - Contents: 按 design.md 的边界实现与验证。
- `test/account-fresh-read.test.js`
  - Purpose: 六个edge新鲜路径、缓存隔离、失败及能力头的运行行为。
  - Contents: 按 design.md 的边界实现与验证。
- `test/account-fresh-read-db.test.js`
  - Purpose: 隔离Postgres中migration、fresh包装器、权限、缓存及事务设置回滚验证。
  - Contents: 按 design.md 的边界实现与验证。
- `dashboard/src/hooks/use-cloud-usage-sync.test.tsx`
  - Purpose: 假时钟覆盖页面常驻、焦点、网络恢复、隐藏页与注销取消。
  - Contents: 按 design.md 的边界实现与验证。
- `dashboard/src/lib/usage-publication.test.ts`
  - Purpose: 发布调度、代次隔离、重试以及本地兼容用例。
  - Contents: 按 design.md 的边界实现与验证。
- `dashboard/src/lib/api.account-fresh.test.ts`
  - Purpose: 缓存命中、旧在途响应、fresh响应能力和stale-if-error隔离。
  - Contents: 按 design.md 的边界实现与验证。
- `dashboard/src/pages/DashboardPage.account-refresh.test.jsx`
  - Purpose: 一次点击全链路及局部读取失败时保持错误状态。
  - Contents: 按 design.md 的边界实现与验证。

### Delete

- None

规划文件本身为本SEP与 `openspec/changes/008-fix-account-usage-refresh/proposal.md`、`openspec/changes/008-fix-account-usage-refresh/spec.md`、`openspec/changes/008-fix-account-usage-refresh/design.md`、`openspec/changes/008-fix-account-usage-refresh/tasks.md`、`openspec/changes/008-fix-account-usage-refresh/verification.md`。业务范围若增加其他文件须更新revision并重新确认；不使用通配路径扩大范围。

## 7. Implementation Steps

1. 读取全部artifacts，记录当前revision的后续用户批准并执行execute gate。
2. 按tasks顺序实现协议/固定目标→服务调度→Dashboard协调→SQL/edge fresh→缓存代次→反馈诊断。
3. 创建列明测试资产，测试创建与执行分开记录。
4. 执行VER-001至010，运行连续两次sync，记录隔离后端、能力、失败注入及回滚证据。
5. 全部必要实施证据通过后进入ready_to_archive；环境真实阻塞记blocked并说明恢复条件。
6. 等待单独部署/发布或归档指令；归档只能在ready_to_archive后获批准执行。

## 8. Data/API Changes

- Database: 新migration加五个fresh包装器并替换缓存函数体；不改用量表、原RPC签名和历史数据。
- API: 新认证sync-status、local-sync附加syncResult、六account可选fresh=1与能力响应头。
- CLI: 可选--result-json，默认文本不变。
- Configuration: 无新增用户必填配置；继续使用现有云开关、实例、凭据及native所有者。
- Environment Variables: 无新增生产必填变量；隔离数据库测试连接配置在测试文件与文档中说明。

## 9. Risks

| Risk | Impact | Solution |
| --- | --- | --- |
| fresh SQL查询增加负载 | Medium | 仅发布/显式刷新使用，合并请求，保留普通缓存 |
| 旧服务忽略fresh | High | 强制能力头，不宣称成功，先升级后端 |
| 身份切换及队列更换 | High | scoped identity、generation、锁后复核 |
| 后端环境不可用 | Medium | 真实记录blocked，禁止跳过云/DB验证 |
| 运行版本与工作区不同 | Medium | 验收记录具体构建/后端版本 |

## 10. Testing Plan

### Unit Test

- 固定目标/部分失败/代次，调度假时钟，缓存并发及身份隔离。

### Integration Test

- 六edge+隔离数据库fresh运行行为、权限、事务开关不泄漏、回滚。
- 测试InsForge中一次点击、自动兜底、连续两次sync及错误注入。

### Manual Test

- 可见页面新增固定日志后等待自动同步；一次立即统计；纯本地、退出/开关、网络恢复；检查新鲜结果和脱敏日志。
- 具体执行步骤、命令和证据必须写入verification.md，不能以源码断言代替真实结果。

## 11. Acceptance Criteria

- [ ] AC-001: 持续自动发布（另见 VER-008 集成证据） — Evidence: VER-001
- [ ] AC-002: 一次手动刷新完成发布（另见 VER-008 集成证据） — Evidence: VER-002
- [ ] AC-003: 准确区分上传结果（另见 VER-008 集成证据） — Evidence: VER-003
- [ ] AC-004: 上传后读取新数据（另见 VER-008 集成证据） — Evidence: VER-004
- [ ] AC-005: 本地与身份隔离（另见 VER-008 集成证据） — Evidence: VER-005
- [ ] AC-006: 独立于页面的兜底发布（另见 VER-008 集成证据） — Evidence: VER-006
- [ ] AC-007: 可诊断与兼容升级（另见 VER-008 集成证据） — Evidence: VER-007

## 12. Notes

- 本轮用户明确要求规划，状态为draft，批准字段留空；规划完成后再次明确批准才能实施。
- 执行Agent须解析task_ledger、verification_record并读取proposal/spec/design；不得只读SEP摘要。
- tasks.md为唯一任务账本，verification.md为唯一证据账本。
- 正式src/dashboard发版遵循CLAUDE.md npm与三平台流程；生产部署与归档授权均不从本规划请求推定。
