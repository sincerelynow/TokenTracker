# upstream/main 合并验证记录

- 日期：2026-10-22（Asia/Shanghai）。
- 目标：将最新 `upstream/main` 合入当前 `main`，保留四项现有 OpenSpec 功能及其验收契约。
- 当前分支基线：`1bb67a9f47688496b1a0847dc949f3e41caea1ad`。
- upstream 基线：`4cb82c7066480377add6c197d8b6fd14b15cadb0`，7 个新增提交、82 个变更文件，统一版本 v1.4.7。
- 策略：普通双父 merge；自动合并无内容冲突。仅清理上游 `.env.example` 的文件末尾多余空行。
- 授权依据：用户消息“[openspec](openspec/) 按功能设计，将 upstream/main 分支合并到当前分支”。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 不自动写入第三方集成、单 provider 安装/卸载、立即统计、本地鉴权和普通 CLI 五分钟非重叠调度；Codex roots GET/POST 继续要求本地授权。启动、调度、manager、API 和 roots 回归通过。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 root source、独立 hourly/project 桶、全局事件去重、历史重建、family 定价、root 卡与 synthetic CODEX ALL。上游异步 queue reader 的完整内容校验保留既有 source/model/hour 去重键，五份 edge 定价补丁保留 root family 处理。相关 Node 回归通过。 |
| 003 Codex root 会话筛选 | root metadata、first-root owner、压缩归档、sidecar v27、browser-only key/label 和 insights/CSV 隐私边界均保留；session analytics、Sessions UI 核心文件与合并前一致。backend/cache/privacy 回归通过。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、fallback/WSL、授权 API、稳定 root source、唯一 owner、contribution ledger、路径隐私、root 卡与 DSH ALL；DSH 核心文件与合并前一致，相关 Node 回归通过。 |

本轮沿用已有 merge 验证记录，不新建功能 change，不改写四项 change/SEP 的设计、批准或生命周期。

## 纳入的上游行为

- 用量限制面板的 OpenCode Go / Command Code API Key 改存本地受限权限文件，保留环境变量优先级，并在保存后清除旧 limits 缓存。
- Dashboard 与 CLI 增加可选 Sentry 错误上报；未配置 DSN 时关闭，遵循既有 telemetry 偏好。合并过程未配置或启用 DSN。
- 本地与五条云端费用路径统一将 OpenCode `-free` 模型按零费用计算。
- Grok 各产品显示其占共享周额度的比例；Windows 手动启动激活 Dashboard，深链接继续使用独立处理路径。
- queue reader 校验完整文件/已提交前缀，以识别相同长度覆盖及文件增长伴随的内部重写。
- 纳入上游 v1.4.6 / v1.4.7 的版本同步、隐私说明、文案和 CI 配置。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 根目录 / Dashboard 锁文件安装 | Pass：两处 `npm ci` 退出码 0。 |
| Node 全量 | Pass：4384 项，4368 passed、16 skipped、0 failed、0 cancelled，退出码 0。覆盖四项 OpenSpec 的 backend/集成/迁移/连续同步/隐私，以及新增 provider key、Sentry、queue cache、pricing 回归。 |
| Dashboard 全量 | Pass：最终使用 2 workers 复跑，169 个文件、1598/1598 passed，退出码 0；覆盖四项 OpenSpec 的设置、卡片、下钻和会话筛选，以及新增 limits/Sentry 回归。 |
| Dashboard 首轮与单文件复查 | 首轮 1597 passed、1 failed：`RedeemProCode.test.jsx` 的另兑一份代码操作未在超时前获得焦点。该组件与测试本轮未修改；单独复跑该文件 26/26 passed。保留初次失败证据，最终结果以全量低并发复跑为准。 |
| Dashboard typecheck | Pass：`npm --prefix dashboard run typecheck`，退出码 0。 |
| Dashboard production build | Pass：`npm run dashboard:build`，退出码 0；保留已有 externalization、混合 import 与 chunk-size 提示。 |
| copy、locale、UI hardcode、architecture、versions、bot frames | Pass：六项 validator 均退出码 0；managed versions 一致为 v1.4.7。 |
| CommonJS 语法 | Pass：24 个变更的 `.js` / `.cjs` 文件通过 `node --check`。 |
| 冲突标记及 whitespace | Pass：无未解决的 merge entries，无残留冲突标记；`git diff --check` / `git diff --cached --check` 退出码 0。 |
| 原生完整构建 / macOS 工程重生成 | Not Run：本机缺少 xcodegen、dotnet、cargo，不能执行 `xcodegen generate`、工程 patch 和三端完整构建；相关原生源码契约及本机 Swift harness 已包含于 Node suite。Windows/Linux 专属跳过项不能视为这些平台已验证。 |
| 本地浏览器人工验收 | Not Run：四项定制功能的 Settings、Usage Overview、Sessions UI 核心代码本轮未改变；以现有组件回归和生产构建验证保留行为，不把历史截图作为本轮证据。 |

环境：Node v24.18.0、npm 11.16.0；Node suite 使用正常进程权限运行隔离 fixtures 和 loopback 服务，Swift/Clang module cache 指向 `/tmp`。依赖安装的 npm allow-scripts 提示未影响本轮测试和构建。

原始日志位于本机 `/tmp/tokentracker-merge-2026-10-22-*.log`，包含 Node、Dashboard 首轮/单文件复查/最终复跑、typecheck、build、npm install 和各 validator。日志是本地验证证据，不代表远程 CI 或原生安装包验证完成。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-swift-cache node --test --test-timeout=60000 --test-reporter=spec test/*.test.js
npm --prefix dashboard test -- --maxWorkers=2 --minWorkers=1
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

本轮交付为当前分支的本地 merge commit，沿用上游版本 v1.4.7；未推送远端、未推送版本标签、未触发发布或部署。
