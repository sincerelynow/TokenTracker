# upstream/main 合并验证记录

- 日期：2026-10-05（Asia/Shanghai）
- 目标：将 `upstream/main` 合并至 `origin/main`，保留现有 OpenSpec 功能设计。
- origin 基线：`2e5df43dd17d664d269a33e202748bdc0f8a79b7`
- upstream 基线：`17247d9d0c9e40eb958b03e638fc4a3978b52a83`（v1.1.11，24 个新增提交）
- 策略：普通双父 merge；逐项解决 9 个文件的内容冲突。

## 设计保留与兼容处理

| 设计 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | init/serve 不自动修改第三方 Hook；手动安装/卸载、本地授权、立即统计和 CLI 五分钟非重叠调度继续保留。对应 manager、API、init/serve 测试通过。 |
| 002 Codex root 用量拆分与汇总 | 统一 resolver 接入上游 `scanRoots.codex`；所有 root 仍使用稳定 `codex-root:<key>`，不产生第二条 legacy 解析路径。独立上传桶、定价、去重、上下文筛选和展示模型测试通过。 |
| 003 Codex root 会话筛选 | 保留 browser-only 实例 key/label、配置顺序归属和缓存签名；同时保留上游不缓存不完整目录清单的保护。会话、隐私与 Dashboard 筛选测试通过。 |
| 004 DSH 多扫描目录与汇总 | roots 配置、`dsh-root:<key>`、确定性 owner、旧数据迁移及 `DSH ALL` 保留。DSH manager/API/parser 和 Dashboard 测试通过。 |

- Dashboard 保存的 `codexHomes` 优先于 `CODEX_HOME` 和上游 `scanRoots.codex`，避免扫描边界意外扩大；未保存时支持上游追加目录，Claude 追加目录语义保留。
- sync、cursor store、status、diagnostics、session analytics、context breakdown 和 roots API 共享 Codex resolver。
- 使用同一 realpath 规则处理 Windows 短路径/长路径，避免同一 root 被重复发现或生成不同统计身份。
- 新增跨消费者回归：配置边界、连续两次同步、实例身份、去重、上传路径隐私；调整上游测试以断言 Codex family 和带实例的会话结构。
- 上游压缩云端响应允许 `source: null`；修复原 root 定价分支的空值 `startsWith` 异常，保留 root reasoning 与公共 family 聚合规则。
- README 同时保留 DSH root 功能说明、上游 TRAE 支持，并说明两种 Codex 配置的优先级。
- 保留上游版本 v1.1.11；现有四个 change 的生命周期和历史验收记录不变。本次合并未执行发布、数据库迁移或 edge 部署。

## 验证

| 检查 | 结果 |
| --- | --- |
| 合并相关 Node 回归：integrations、init/serve、Codex roots/API/parser/context/cursor、sessions、scanRoots、DSH、status/diagnostics、upload、cloud wire、pricing parity、architecture | 345 项：340 passed，5 项因 Windows 平台条件 skipped，0 failed。 |
| `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1` | 117 个文件、859 项测试全部通过。 |
| `npm --prefix dashboard run typecheck` | Pass。 |
| `npm run dashboard:build` | Pass；保留既有大 chunk 提示。 |
| `validate:copy`、`validate:locale`、`validate:ui-hardcode`、`validate:guardrails`、`validate:versions`、`validate:bot-frames` | 全部通过；9 个 managed version 位置均为 v1.1.11。 |
| `git diff --check`、冲突标记与冲突文件 JS 语法检查 | Pass。 |
| `npm run ci:local` 全量尝试 | 初始运行：3330 passed、81 failed、34 skipped；usage-limits 文件未退出，终止已核实的测试子进程后得到汇总。该完整命令未通过。 |
| 全量失败对照 | 两项新增云端兼容失败已修复，相关 wire/pricing 45 项复验全通过。其余失败名称均在 origin 或 upstream 快照的定向复验中复现；包含 Windows 路径、符号链接权限、CRLF 源码断言、缺失 Unix 工具和既有平台 mock 问题。origin 对照设置了超时，未将其标记为全量通过。 |
| `dotnet test TokenTrackerWin.Tests/TokenTrackerWin.Tests.csproj --configuration Release` | Not Run：本机只有 .NET host，未安装 SDK；Windows 原生构建，以及 macOS/Linux 原生编译仍需对应 CI 环境验证。 |

本地验证证明本次合并的功能兼容测试通过；不等同于完整跨平台 CI 通过。

## 复验命令

```powershell
npm ci
npm ci --prefix dashboard
npm run dashboard:build
npm run ci:local
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
node --test test/account-model-wire.test.js test/account-summary-model-wire.test.js test/edge-pricing-parity.test.js test/gpt-6-1-sol-pricing.test.js
node --test test/codex-roots.test.js test/scan-roots-sync.test.js test/session-analytics-scan-roots.test.js
```
