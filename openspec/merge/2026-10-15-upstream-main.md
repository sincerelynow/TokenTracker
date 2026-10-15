# upstream/main 合并验证记录

- 日期：2026-10-15（Asia/Shanghai）
- 目标：将 `upstream/main` 合入 `origin/main`，保持四项现有 OpenSpec 功能与验收契约。
- origin 基线：`5010b121ba7a6a54b1dfcdaf8bdd9c700af8dcca`
- upstream 基线：`dcba97fa871ef1e01d5dee528905ce2ae7c5231e`（v1.3.16，8 个新增提交）
- 策略：普通双父 merge；43 个上游变更文件自动合并，无内容冲突。
- 授权依据：用户消息“按照功能设计，将分支 upstream/main合并到origin/main分支”。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 启动零第三方 Hook 写入、单 provider 安装/卸载、立即统计、本地授权及 CLI 五分钟非重叠调度；集成管理、API、Settings、调度器与初始化回归通过。 |
| 002 Codex root 用量拆分与汇总 | 保留显式扫描边界、稳定 root source、独立桶、去重、迁移、定价/reasoning、root/ALL 下钻及无重复计量的合成卡。UsageOverview 自动合并同时保留上游模型行展开箭头与日期范围调整；五条 edge 定价路径保留 Codex root 语义并纳入上游新增定价，parity 回归通过。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only key/label、root signature、sidecar 兼容与组合筛选；本轮未更改 session analytics 和 Sessions 页面，后端及页面回归通过。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、受保护 API/Settings、fallback/WSL、稳定 root source、唯一 owner、ledger、路径隐私、root 卡与 DSH ALL；DSH/parser/roots/API/界面回归通过。 |

- 直接审阅自动合并后的 rollout、UsageOverview、组件测试与 edge pricing diff；上游改动完整保留，此轮没有额外业务代码修改。
- 纳入上游超大 OMP/OmO JSONL 记录安全跳过及可重试尾部游标、Cursor 新模型定价、Cloud 文案和条件提示、模型行展开交互改进。
- 沿用上游统一版本 v1.3.16；四个 change/SEP 的设计、生命周期与历史验证账本保持不变。
- 此任务仅合并源码；未额外递增版本、推送版本标签、手动触发发布工作流或执行云端部署。main 推送触发的自动 CI/发布行为由已有工作流控制。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| Node 全量（下方命令） | 4180 项：4165 passed、15 skipped、0 failed、0 cancelled，退出码 0。包含四项 OpenSpec 功能和新增 parser/pricing 回归。 |
| Dashboard 全量 | 165 个文件，1584/1584 passed，退出码 0。包含集成管理、Codex/DSH roots、Sessions、UsageOverview、context 与 Cloud 提示回归。 |
| `npm --prefix dashboard run typecheck` | Pass，退出码 0。 |
| `npm run dashboard:build` | Pass，退出码 0；已有 externalization、混合 import 与大 chunk 提示保留。 |
| validate:copy、validate:locale、validate:ui-hardcode、validate:guardrails、validate:versions、validate:bot-frames | 全部 Pass，退出码 0；managed versions 一致为 v1.3.16。 |
| 修改的 CommonJS 语法、冲突标记与 `git diff --check` / `git diff --cached --check` | Pass。 |
| macOS 工程生成 / 原生安装包编译 | Not Run：已尝试 `xcodegen generate`，本机缺少 xcodegen（退出码 127）；依赖生成结果的 icon patch 未执行。Windows/Linux 和完整 macOS 原生构建仍需对应平台 CI 验证。Node 全量中的本机 Swift 编译测试通过。 |

测试运行环境为 Node v24.18.0、npm 11.16.0。依赖锁文件仅版本号发生变化，沿用现有已安装依赖；原生 zstd 模块和 sqlite3 可用。Node 全量使用正常进程权限验证真实本地服务生命周期，并将 Swift/Clang module cache 指向 `/tmp`。本轮未为环境差异修改业务代码。

原始日志保存在本机 `/tmp/tokentracker-merge-2026-10-15/`，未纳入提交。上述本地结果不表示远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-swift-cache node --test --test-timeout=60000 --test-reporter=spec test/*.test.js
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
npm run validate:copy
npm run validate:locale
npm run validate:ui-hardcode
npm run validate:guardrails
npm run validate:versions
npm run validate:bot-frames
```
