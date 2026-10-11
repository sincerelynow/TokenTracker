# upstream/main 合并验证记录

- 日期：2026-10-11（Asia/Shanghai）
- 目标：将 `upstream/main` 合入 `origin/main`，保持四项现有 OpenSpec 功能与验收契约。
- origin 基线：`d7aaf5b5d309da17adbafcef1440713a0bc55ddd`
- upstream 基线：`70a6b1325d7a82420196cf8a1be077c9b16899c7`（v1.3.5，97 个新增提交）
- 策略：普通双父 merge；逐项解决 16 个文件冲突。

## 功能保留与兼容处理

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | init/serve 继续不安装或修复第三方 Hook；保留单项安装/卸载、立即统计、本地授权与 CLI 五分钟非重叠调度。将上游 WorkBuddy AI 接入同一 manager，支持 `WORKBUDDY_AI_HOME` 与 `~/` 展开；回归验证仅修改目标 provider 并保留其他 Hook。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 `codex-root:<key>`、显式扫描边界、独立桶、副本去重、历史迁移、Codex reasoning 与定价、root/ALL 下钻及合成卡；五条 edge 定价路径同时保留上游 OmO reasoning subset 修复。 |
| 003 Codex root 会话筛选 | 保留本地 browser-only 实例 key/label、动态二级筛选、旧行兼容、失效选择回退、模型/项目/搜索/深链接组合。将实例筛选应用于上游 `scopedSessions`，新增跨日会话切换日期时只汇总所选 root 当日桶的回归。 |
| 004 DSH 多扫描目录与汇总 | 保留 `dshHomes`、受保护 Settings/API、fallback/Windows WSL 语义、稳定 `dsh-root:<key>`、唯一 owner、legacy ledger、路径隐私、root 卡与 `DSH ALL`。 |

- 保留上游 Cloud 页面、会员与自部署应用代码、安全修复、WorkBuddy AI provider、跨日会话用量、存储指标、生命周期效率分母及原生端改进。
- 会话 sidecar 版本提升到 17，避免与 origin v15 或 upstream v16 缓存碰撞；v14/v15/v16 缓存重建回归同时验证 root 身份、会话存储大小和 request/model performance。
- BotFrames 构建保留上游随机私有临时目录及 `finally` 清理，同时在仓库同盘使用相对 imports，保持 Windows 跨盘兼容。生成与临时目录回归通过。
- 上游新增 `.gitattributes` 强制 LF；本机旧检出仍有 CRLF，首次全量造成 SQL 源码匹配与原生源码断言失败。按该规则规范化工作树后复验，这些失败消失；规范化未产生额外内容改动。
- 沿用上游统一版本 v1.3.5。四个 change/SEP 的行为文档、生命周期与历史验证账本保持不变。
- 本任务只合并源码；未执行版本递增、npm/桌面发布、数据库迁移、支付配置或 edge 部署。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| OpenSpec/合并相关 Node 定向回归（见下方命令） | 693 项：686 passed、7 项平台条件 skipped、0 failed、0 cancelled，退出码 0。 |
| 新增兼容边界 + BotFrames：`node --test --test-reporter=spec test/integration-manager.test.js test/session-performance.test.js test/bot-engine-temp.test.js` | 27/27 passed，退出码 0。 |
| Dashboard 全量：`npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1` | 162 个文件、1561 项测试全部通过，退出码 0。 |
| 新增跨日 root 回归后的页面复验：`npm --prefix dashboard test -- src/pages/SessionsPage.test.jsx src/pages/SettingsPage.test.jsx --maxWorkers=2 --minWorkers=1` | 2 个文件、38 项测试全部通过（含新增用例），退出码 0。 |
| `npm --prefix dashboard run typecheck` | Pass，退出码 0。 |
| `npm run dashboard:build` | Pass，退出码 0；已有 externalization、动态/静态 import 与大 chunk 提示保留。 |
| `validate:copy`、`validate:locale`、`validate:ui-hardcode`、`validate:guardrails`、`validate:versions`、`validate:bot-frames` | 全部 Pass，退出码 0；managed versions 匹配 v1.3.5。 |
| 最终 Node 全量：`node --test --test-timeout=60000 --test-reporter=spec test/*.test.js` | 4043 项：3991 passed、5 failed、47 skipped、0 cancelled，退出码 1。 |
| 原始 upstream 对照 | 在隔离检出 `70a6b132` 复验初次失败文件（排除本分支专属缓存用例），108 项：102 passed、5 failed、1 skipped。最终合并全量的全部 5 个失败名称均在原始上游复现，没有新增失败名称。 |
| 原生平台编译 | Not Run：本机 .NET host 未安装 SDK；macOS/Linux 原生构建需要对应平台 CI。 |
| `git diff --check`、`git diff --cached --check`、关键 JS 语法及冲突标记检查 | Pass。 |

### 最终全量未通过项

- `test/copilot-app-parser.test.js`、`test/dual-install-ownership-probe.test.js`、`test/graph-auto-index-import.test.js`、`test/sync-workbuddy-repair.test.js`：本机 PATH 缺少 `sqlite3`。
- `test/skills-manager-windows-copy.test.js`：当前 Node/Windows Unicode 路径的 `fs.cpSync` 失败，原始上游同样复现。

本地功能回归、Dashboard 与静态检查通过，不表示全量跨平台 CI 已通过。剩余问题的恢复条件是提供 sqlite3、在受支持的 Windows Node 环境复验 Unicode copy，并由对应平台 CI 完成原生构建。

原始日志位于被忽略的 `script/merge-evidence-2026-10-11/`；临时上游检出和 dependency junction 在提交前清理。

## 核心复验命令

```powershell
npm ci
npm ci --prefix dashboard
node --test --test-reporter=spec test/integration-manager.test.js test/local-api-integrations.test.js test/init-dry-run.test.js test/init-uninstall.test.js test/serve-native-background-sync.test.js test/serve-runtime-repair.test.js test/codex-roots.test.js test/local-api-codex-roots.test.js test/dsh-roots.test.js test/local-api-dsh-roots.test.js test/scan-roots-sync.test.js test/session-analytics.test.js test/session-analytics-codex-subagents.test.js test/session-analytics-scan-roots.test.js test/session-performance.test.js test/deepseek-harness.test.js test/deepseek-harness-migration.test.js test/cursor-store.test.js test/model-breakdown.test.js test/codex-sync-hot-path.test.js test/sync-codex-rescan-repair.test.js test/rollout-parser.test.js test/codex-context-breakdown.test.js test/codex-context-hot-path.test.js test/sync-upload-batching.test.js test/local-api-source-scope.test.js test/edge-pricing-parity.test.js test/account-model-wire.test.js test/account-summary-model-wire.test.js test/architecture-guardrails.test.js
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
node --test --test-timeout=60000 --test-reporter=spec test/*.test.js
```
