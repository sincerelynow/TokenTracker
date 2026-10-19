# upstream/main 合并验证记录

- 日期：2026-10-19（Asia/Shanghai）
- 目标：将 `upstream/main` 合入 `origin/main`，保留四项现有 OpenSpec 功能及其验收契约。
- origin 基线：`86eb293ef193d0b94583899def11e3d8dbaddd8c`
- upstream 基线：`32596d23aa361302063a2fab52445f45c55d092b`（v1.4.5，14 个新增提交）
- 策略：普通双父 merge；27 个上游变更文件，其中 `src/lib/session-analytics.js` 一处内容冲突；另修复自动合并后的统计来源传递问题。
- 授权依据：用户消息“[openspec](openspec/) 按功能设计，将分支 upstream/main 合并到 origin/main 分支”。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 不自动写入第三方 Hook、单 provider 安装/卸载、立即统计、本地授权、普通 CLI 五分钟非重叠调度及显式 Codex 扫描边界。相关实现和 Dashboard 源码本轮没有变更，全量回归通过。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 root source、独立小时桶和 project 桶、跨 root 去重、历史迁移、family 定价及 root/ALL 下钻。上游提取 `parseRolloutRecords()` 后，显式向普通和压缩解析路径传递 `statsSource`，避免作用域丢失。新增三种存储格式、混合格式跨 root 副本、连续两次解析和路径隐私回归。 |
| 003 Codex root 会话筛选 | 合并压缩归档 session ID 识别与现有 root metadata group，保持 first-root owner 和 browser-only key/label。sidecar 升级至 v27，避免旧 v26 缓存跳过压缩文件扫描。覆盖 `.zst`/`.zstd`、首 root 归档与次 root 活跃副本、v26 新鲜空缓存重建、browser 身份与 insights/CSV 隐私。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、授权 API/Settings、fallback/WSL、稳定 root source、唯一 owner、contribution ledger、路径隐私、root 卡与 DSH ALL。DSH 专有代码和 Dashboard 源码本轮没有变更，全量回归通过。 |

## 上游改动与冲突处理

- 纳入 Codex `.jsonl.zst`/`.jsonl.zstd` 归档扫描、WorkBuddy 项目归属、ZCode prune-window 历史修复、Linux OAuth desktop database 刷新、独立 tray ID、Tauri CLI 更新及社区文档。
- `src/lib/session-analytics.js`：保留按 root 记录遍历、文件路径去重和首 root owner，同时扩展 session ID 正则以合并压缩/普通副本；sidecar 从 v26 升至 v27。
- `src/lib/rollout.js`：上游将公共逻辑提取到 `parseRolloutRecords()`，自动合并却把 `bucketSource` 留在调用者作用域。先用现有 root 桶测试复现 `ReferenceError: bucketSource is not defined`，再向两条解析路径传递 `statsSource` 并在新函数内计算 bucket source，保留 parser source 的 Codex 语义。
- `test/rollout-parser.test.js`：root 桶测试覆盖普通 JSONL、`.zst`、`.zstd`，包含跨 root 混合格式副本、project 桶、两次解析幂等和绝对路径负向断言。
- `test/session-analytics-codex-zst-group.test.js`：适配本分支 `{ filePaths, instance }` group 接口，并增加压缩文件与 root owner、缓存、隐私交叉回归。
- `test/session-performance.test.js`：当前版本断言更新为 v27，将 v26 纳入旧缓存重建矩阵。

沿用上游统一版本 v1.4.5；四项 change/SEP 的设计、生命周期和历史验证账本保持不变。本轮仅合并源码并推送 main，不额外递增版本、不推送版本标签、不手动触发发布或安装包构建、不修改云端基础设施。推送触发的自动 CI/发布行为由已有工作流控制。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 自动合并缺陷复现 | 预期失败：原有同小时 root 桶测试报 `ReferenceError: bucketSource is not defined`，日志 `parser-before-fix.log`。修复后同测试通过。 |
| 普通/压缩 root 桶交叉回归 | Pass：三种格式 3/3 passed，包含跨 root 去重、project 桶、连续两次解析幂等和路径隐私。 |
| 会话归档与旧缓存回归 | Pass：压缩归档/root 身份与 session performance 共 29/29 passed，日志 `cross-regression.log`。 |
| Node 全量 | Pass：4342 项，4327 passed、15 skipped、0 failed、0 cancelled，退出码 0。包含集成管理、root 配置/聚合、会话筛选、DSH、连续同步及新增上游回归。 |
| Dashboard 全量 | Pass：168 个文件，1597/1597 passed，退出码 0。 |
| Dashboard typecheck | Pass：`npm --prefix dashboard run typecheck`，退出码 0。 |
| Dashboard production build | Pass：`npm run dashboard:build`，退出码 0；已有 externalization、混合 import 及大 chunk 提示保留。 |
| copy、locale、UI hardcode、architecture、versions、bot frames | Pass：六项 validator 全部退出码 0；managed versions 一致为 v1.4.5。 |
| 修改的 CommonJS 语法 | Pass：12 个文件 `node --check` 全部通过。 |
| 冲突标记及 whitespace | Pass：无残留冲突标记；`git diff --check` / `git diff --cached --check` 退出码 0。 |
| 原生跨平台构建 | Not Run：本机缺少 xcodegen、dotnet、cargo；macOS 工程重生成与三端完整原生构建需 CI 验证。 |

环境：Node v24.18.0、npm 11.16.0。使用现有根目录与 Dashboard 依赖；上游未改变这两处依赖条目。Node 全量以正常进程权限验证真实 loopback 服务生命周期，Swift/Clang module cache 指向 `/tmp`。15 项测试跳过包括其他平台专用场景，不能作为这些平台已验证的证据。

原始日志保存在本机 `/tmp/tokentracker-merge-2026-10-19/`。本地结果不代表远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
node --test --test-name-pattern='keeps same-hour Codex root usage' test/rollout-parser.test.js
node --test test/session-analytics-codex-zst-group.test.js test/session-performance.test.js
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
