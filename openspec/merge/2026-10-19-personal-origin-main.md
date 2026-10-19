# origin/main 合并验证记录

- 日期：2026-10-19（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能设计，并将所有本地分支推送到 `origin`。
- 当前分支基线：`e31dd5c6a2e905eaf86ec904e2fca7c299d83bf5`。
- origin/main 基线：`1bb67a9f47688496b1a0847dc949f3e41caea1ad`（15 个当前分支未包含的提交，含 upstream 合并提交，v1.4.5）。
- 本地 `main` 与 fetch 后的 `origin/main` 一致；此次合并只推进个人功能分支。
- 策略：普通双父 merge；29 个文件自动合并，无文本冲突，无需额外修改实现。
- 授权依据：用户消息“[openspec](openspec/) 按功能设计，将 origin/main 分支合并到当前分支，合并完成后推送所有分支”。
- 沿用现有设计与合并验证记录方式，不改变七项 change/SEP 的设计、生命周期、批准或归档状态。

## 功能保留与兼容核对

| OpenSpec | 合并结果 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 零第三方 Hook 自动写入、单 provider 操作、立即统计、本地授权和 CLI 五分钟非重叠调度。 |
| 002 Codex root 用量 | 保留稳定身份、独立桶、跨 root 去重、历史迁移、路径隐私、CODEX ALL 与 root/ALL 下钻；纳入普通与压缩归档解析路径显式传递 statsSource 的修复及交叉回归。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only 实例字段、root signature 和组合筛选；压缩副本按 session ID 合并，sidecar 升至 v27，旧 v26 缓存自动重建。 |
| 004 DSH roots | 保留统一 resolver、授权 API/Settings、fallback/WSL、稳定 source、唯一 owner、contribution ledger、路径隐私、独立卡片和 DSH ALL。 |
| 005 个人 InsForge | 保留无隐式上游云目标、运行时公开配置、实例/账号/机器隔离 checkpoint、历史重放与 generation 隔离；ZCode 新修复继续调用已包含 destinations 清零逻辑的上传状态重置 helper。 |
| 006 社区关闭 | 保留默认 disabled 的独立开关、导航/公共资料隐藏、社区路由回退、preload/refresh 抑制和 Actions 门禁。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 网络入口门禁、无主动调度/更新控件、旧动作忽略及原生设置页脚仅显示版本。 |

- 纳入上游 Codex `.jsonl.zst`/`.jsonl.zstd` 扫描、WorkBuddy 项目归属、ZCode prune-window 历史修复、Linux OAuth desktop database 刷新、独立 tray ID、Tauri CLI 更新及社区文档。
- 唯一同时被两侧修改的实现文件是 `src/commands/sync.js`；直接核对与 `origin/main` 的差异，确认个人云上传身份、checkpoint、队列 compaction 和历史修复重放规则完整保留。
- Dashboard 源码、个人云运行时配置、社区与桌面更新门禁均未被本轮合并改写。
- 沿用上游统一版本 v1.4.5；根目录和 Dashboard 的依赖条目未变，现有依赖均通过 `npm ls --depth=0`。
- 本次只合并、验证和推送源码，不额外递增版本、不推送标签、不手动触发发布、不应用云端 SQL migration 或部署 edge functions。已有工作流自行处理推送触发的 CI。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| Node 全量 | Pass：4362 项，4347 passed、15 条件 skipped、0 failed、0 cancelled，退出码 0。包含连续同步、roots、压缩归档、个人云、社区及更新门禁回归。 |
| Dashboard 焦点定向复验 | Pass：兑换码弹窗测试文件 26/26 passed，退出码 0。 |
| Dashboard 全量串行复验 | Pass：170 个文件，1623/1623 passed，退出码 0；`dashboard-serial.log`。 |
| Dashboard typecheck | Pass，退出码 0。 |
| 普通生产构建 | Pass，退出码 0。 |
| 含桌面宠物入口的构建 | Pass，退出码 0，确认 `dashboard/dist/pet.html` 存在。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 全部 Pass，退出码 0；managed versions 一致为 v1.4.5。 |
| 修改的 CommonJS 语法、冲突标记与 whitespace | Pass：12 个 JS 文件 `node --check` 通过，无 unmerged entries 或残留冲突标记，diff 检查通过。 |
| 原生工程生成与三端安装包构建 | Not Run：`xcodegen generate` 返回 127；本机缺少 xcodegen、完整 Xcode、dotnet 和 cargo。icon patch 因生成失败未运行，完整原生构建仍需 CI 验证，007 原有原生验收状态保留。 |

Dashboard 两轮四 worker 全量均为 1622 passed、1 failed，失败发生于本轮未修改的 `RedeemProCode.test.jsx` 的弹窗输入焦点断言；该文件单独运行 26/26 passed，随后完整单 worker 运行 1623/1623 passed。Dashboard 文件与合并前完全一致，未因此放宽断言或修改产品代码；并行焦点测试不稳定仍是已知验证限制。两轮并行日志分别为 `dashboard-full.log`、`dashboard-final.log`，全量串行通过证据为 `dashboard-serial.log`。构建保留既有 externalization、混合 import 和大 chunk 提示；测试保留既有 React act/jsdom 提示。

原始日志保存在本机 `/tmp/tokentracker-personal-merge-2026-10-19/`，不提交临时日志。Node 全量使用正常进程权限验证真实 loopback 服务与子进程，Swift/Clang module cache 指向 `/tmp`。本地结果不代表远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-swift-cache TOKENTRACKER_AUTO_RETRY_NO_SPAWN=1 node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
npm --prefix dashboard test -- --maxWorkers=2 --minWorkers=1 src/components/cloud/RedeemProCode.test.jsx
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard test -- --maxWorkers=1 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
TOKENTRACKER_BUILD_PET=1 npm run dashboard:build
npm run validate:copy
npm run validate:locale
npm run validate:ui-hardcode
npm run validate:guardrails
npm run validate:versions
npm run validate:bot-frames
git diff --check
git diff --cached --check
```
