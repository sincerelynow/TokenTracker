# upstream/main 合并验证记录

- 日期：2026-10-09（Asia/Shanghai）
- 目标：将 `upstream/main` 合并至 `origin/main`，保留已有四项 OpenSpec 功能。
- origin 基线：`5b3fa82da226f7b593a80ebb95f17800c6cc1fec`
- upstream 基线：`e6186b350df7942f356ef9155af71fe81a9a99d1`（v1.2.2，73 个新增提交）
- 策略：普通双父 merge，逐项解决 9 个文件的内容冲突。

## 功能保留与兼容处理

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 不自动修改第三方 Hook、手动安装/卸载、立即统计、本地授权和 CLI 五分钟非重叠调度；manager/API/启动与调度回归通过。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 `codex-root:<key>`、配置扫描边界、实例上传桶、事件去重、历史迁移、Codex 定价与 reasoning 语义、root/ALL 上下文下钻和合成汇总卡。 |
| 003 Codex root 会话筛选 | 把动态 root 筛选接入上游 Select 工具栏，兼容模型、自定义日期、项目、搜索、深链接、结果汇总与清空操作；保留旧行与单实例兼容、失效选择回退，以及本地 browser-only 实例身份。 |
| 004 DSH 多扫描目录与汇总 | 保留 `dshHomes`、受保护 Settings/API、fallback 优先级、稳定 `dsh-root:<key>`、唯一 owner、legacy ledger、路径隐私、root 卡与 `DSH ALL`。 |

- 同时保留上游会话详情、请求性能估计、定价状态、模型 token 分项、Claude fork 去重、OpenCode cursor 分片和桌面端改进。
- 会话 sidecar 从本分支/上游冲突的版本 14 升至 15，避免升级时复用缺少请求性能或实例身份的旧缓存。新增真实旧缓存重建回归，验证 key/label 与 session/model performance 同时恢复。
- 修正自动合并的语义遗漏：`CODEX ALL` 与 `DSH ALL` 的同名模型必须累加全部 token 分项，而不能沿用首个 root 的分项。新增两个 family 的 root+legacy 汇总与非重复计数回归。
- 多语言资源合并保留集成管理、Codex/DSH roots 与上游新增文案，移除上游已替换的旧日期标签。
- 修正上游会话日期测试的系统 locale 依赖：断言使用与被测试 UI 相同的英文 locale，中文 Windows 环境不再将“23日”与“Jul 23”比较。
- 保留上游统一版本 v1.2.2；四个 change/SEP 的生命周期与历史验证账本未修改。此任务未执行版本递增、发布工作流、数据库迁移或 edge 部署。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 最终 OpenSpec/合并相关 Node 回归（下方命令） | 643 项：640 passed、3 项平台条件 skipped、0 failed、0 cancelled，退出码 0。 |
| `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1` | 127 个文件、940 项测试全部通过，退出码 0。 |
| `npm --prefix dashboard run typecheck` | Pass，退出码 0。 |
| `npm run dashboard:build` | Pass，退出码 0；已有 crypto externalization、动态/静态 import 和大 chunk 提示保留。 |
| `validate:copy`、`validate:locale`、`validate:ui-hardcode`、`validate:guardrails`、`validate:versions`、`validate:bot-frames` | 全部 Pass；managed versions 均匹配 v1.2.2。copy 仅有既有 unused-key 提示。 |
| `git diff --check`、`git diff --cached --check`、冲突标记与 JS 语法检查 | Pass。 |
| 全量 Node：`node --test --test-timeout=60000 --test-reporter=spec test/*.test.js` | 未通过：3517 项，3407 passed、84 failed、2 cancelled、24 skipped。usage-limits 两项请求测试各自超时 60 秒；终止已核实的该测试文件子进程后得到最终汇总。 |
| 原始 upstream 对照 | 在隔离检出 `e6186b35` 中复验相同失败文件，并补跑后续遗漏文件。合并日志的全部 94 个唯一失败名称（包含 suite 名称）均在原始上游复现；没有新增失败名称。首轮对照有 90 秒进程上限，剩余两项 usage-limits 用例以 2 秒 test timeout 单独对照，同样取消；相关实现与测试和上游完全一致。 |
| 原生平台编译 | Not Run：本机没有 .NET SDK；macOS/Linux 构建需要对应平台 CI。 |

本地功能回归、Dashboard 和静态检查通过，不表示全量跨平台 CI 已通过。

原始本地日志保存在被忽略的 `script/merge-evidence-2026-10-09/`，未混入合并提交；临时上游检出与 dependency junction 已清理。

## 核心复验命令

```powershell
npm ci
npm ci --prefix dashboard
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
node --test --test-reporter=spec test/integration-manager.test.js test/local-api-integrations.test.js test/init-dry-run.test.js test/serve-native-background-sync.test.js test/serve-runtime-repair.test.js test/codex-roots.test.js test/local-api-codex-roots.test.js test/dsh-roots.test.js test/local-api-dsh-roots.test.js test/scan-roots-sync.test.js test/session-analytics.test.js test/session-analytics-codex-subagents.test.js test/session-analytics-scan-roots.test.js test/session-performance.test.js test/deepseek-harness.test.js test/deepseek-harness-migration.test.js test/cursor-store.test.js test/model-breakdown.test.js test/codex-sync-hot-path.test.js test/sync-codex-rescan-repair.test.js test/rollout-parser.test.js test/codex-context-breakdown.test.js test/codex-context-hot-path.test.js test/sync-upload-batching.test.js test/local-api-source-scope.test.js test/edge-pricing-parity.test.js test/account-model-wire.test.js test/account-summary-model-wire.test.js test/architecture-guardrails.test.js
```
