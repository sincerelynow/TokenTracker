# upstream/main 合并验证记录

- 日期：2026-10-16（Asia/Shanghai）
- 目标：将 `upstream/main` 合入 `origin/main`，保留四项现有 OpenSpec 功能及其验收契约。
- origin 基线：`b94782aaafe14fc5f2a91ff12f1c326b4b2ff250`
- upstream 基线：`5916cd466daea0922a3381c6372e8d954e3a576f`（v1.4.2，9 个新增提交）
- 策略：普通双父 merge；83 个上游变更文件，其中 8 个文件需要手动解决内容冲突。
- 授权依据：用户消息“按照功能设计，将分支 upstream/main合并到origin/main分支”。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 不自动写入第三方 Hook、单 provider 安装/卸载、立即统计、本地授权、普通 CLI 五分钟非重叠调度及显式 Codex 扫描边界。Muse Code 沿用上游被动扫描，不引入启动写入。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 root source、独立桶、跨 root 去重、历史迁移、Codex reasoning 定价及 root/ALL 下钻；汇总卡不参与总量二次计量。五条 edge 定价路径同时保留 `codex-root:*` 和新增 Muse reasoning 规则；补充运行实际定价函数的本地/云端一致性回归。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only key/label、root signature 和组合筛选，同时接入 Kimi discovery、metadata dependencies 与失败重试。sidecar 升级到 v26，避免 fork 旧 v25 缓存通过 TTL 返回不含 Kimi 的结果；新增混合 Codex/Kimi、旧缓存重建、root 重命名及导出隐私回归。Sessions 页面保留全部 root 筛选测试并纳入 Kimi 测试。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、受保护 API/Settings、fallback/WSL、稳定 root source、唯一 owner、contribution ledger、路径隐私、root 卡与 DSH ALL。 |

## 冲突处理

- `README.zh-CN.md`：保留 Dashboard 手动安装 OMP notify 的说明，并加入 Muse Code 被动读取条目。
- 五条 edge 定价路径：合并 Muse 与 Codex root 的 reasoning-in-output 条件，避免任一来源重复计费。
- `src/lib/session-analytics.js`：合并 roots owner/signature/cache key 与 Kimi discovery/dependencies/incomplete scan 逻辑，并升级 sidecar 版本。
- `dashboard/src/pages/SessionsPage.test.jsx`：保留两边新增测试，分别结束 test case。
- `test/session-performance.test.js`：更新当前缓存版本断言为 v26，并增加旧 v25 缓存的 root 身份、storage 与 performance 重建检查。
- 清理上游 `test/cloud-device-token.test.js` 文件末尾多余空行，使 staged diff whitespace 检查通过。

本轮纳入上游 Kimi 分析与模型归属修复、Muse Code、云端用量安全恢复、README badge 更新、status/doctor 设备凭据识别修复及依赖升级。沿用统一版本 v1.4.2；四项 change/SEP 的设计、生命周期与历史验证账本保持不变。

此任务仅合并源码并推送 main；不额外递增版本、不推送版本标签、不手动触发发布工作流、不应用云端 SQL migration 或部署 edge functions。推送触发的自动 CI/发布行为由已有工作流控制。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 冲突交叉回归 | Pass：`edge-pricing-parity`、`session-analytics-kimi`、`session-analytics` 共 66/66 passed。 |
| 缓存迁移回归 | Pass：`node --test test/session-performance.test.js`，25/25 passed，包含旧 v25 缓存重建。 |
| Node 全量 | Pass：4312 项，4297 passed、15 skipped、0 failed、0 cancelled，退出码 0；包含四项 OpenSpec 功能与新增上游回归。 |
| Dashboard 全量 | Pass：168 个文件，1597/1597 passed，退出码 0。 |
| Dashboard typecheck | Pass：`npm --prefix dashboard run typecheck`，退出码 0。 |
| Dashboard production build | Pass：`npm run dashboard:build`，退出码 0；已有 externalization、混合 import 及大 chunk 提示保留。 |
| copy、locale、UI hardcode、architecture、versions、bot frames | Pass：六项 validator 全部退出码 0；managed versions 一致为 v1.4.2。 |
| 修改的 CommonJS 语法 | Pass：34 个文件 `node --check` 全部通过。 |
| 冲突标记及 staged whitespace | Pass：无残留冲突标记、无 unmerged entries，`git diff --check` / `git diff --cached --check` 退出码 0。 |
| 原生跨平台构建 | Not Run：本机缺少 xcodegen 和 dotnet；Windows/Linux 完整原生构建需对应平台 CI 验证。 |

环境：Node v24.18.0、npm 11.16.0。根目录与 Dashboard 均通过 `npm ci` 安装锁文件中的依赖；原生 zstd 可加载。Node 全量在正常进程权限下验证真实 loopback 服务生命周期，Swift/Clang module cache 指向 `/tmp`，未修改业务代码适配沙箱。

首轮 Node 全量有 5 项旧缓存迁移测试失败，原因均为仍断言 v25。更新为 v26 并加入 v25 输入场景后，定向 25/25 与第二轮完整测试均通过。首轮日志保留在 `node-tests-first.log`；最终结果以 `node-tests.log` 为准。

原始测试日志保存在本机 `/tmp/tokentracker-merge-2026-10-16/`，依赖安装日志为 `/tmp/tokentracker-merge-root-install.log` 与 `/tmp/tokentracker-merge-dashboard-install.log`。本地结果不代表远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
node --test test/edge-pricing-parity.test.js test/session-analytics-kimi.test.js test/session-analytics.test.js
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
git diff --cached --check
```
