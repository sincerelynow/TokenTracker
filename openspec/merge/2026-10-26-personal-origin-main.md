# origin/main 合并验证记录

- 日期：2026-10-26（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能要求。
- 当前分支基线：`ad51cc42cd53841f2b1ae1fffdf7af8c66010ad9`。
- origin/main 基线：`9a2160365e2f9abeb3dd28dd8dbc01825c9d50c3`；fetch 后有 8 个待合入提交，统一版本 v1.4.7。
- 授权依据：用户消息“[openspec](openspec/) 按功能要求，将分支 origin/main 合并到当前分支”。
- 策略：普通双父 merge，沿用既有 merge 验证记录；不改写七项 change/SEP 的设计、批准、生命周期或归档状态。

## 冲突处理与功能保留

5 个文件发生内容冲突：`.github/workflows/{ci,npm-publish,release-dmg,release-windows}.yml` 和 `dashboard/src/main.jsx`。

- 四个工作流保留个人 InsForge URL/key repository variables，并保留上游新增的可选 `VITE_SENTRY_DSN` secret。
- 一并将 CI 的 Windows Dashboard 构建中原有的上游实例硬编码改为同一组个人变量，保证三端 CI 构建配置一致且无隐式上游目标。
- Dashboard 保留 `await loadRuntimeInsforgeConfig()` 的启动顺序，随后初始化 Sentry/analytics、创建 router 并渲染 providers；同时保留上游新增的 `DashboardRouteError`。
- `src/lib/local-api.js` 自动合入 provider key endpoint，与个人云配置、鉴权、账号/实例隔离和同步 generation 逻辑并存。
- Windows 托盘自动合入 `ActivateDashboard()`，保留无更新调度、无更新控件及旧 `checkForUpdates` 动作忽略逻辑。

| OpenSpec | 合并结果 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 零第三方集成自动写入、逐 provider 操作、立即统计、本地授权、五分钟非重叠调度和多 Codex roots。核心实现与合并前一致。 |
| 002 Codex root 用量 | 保留稳定身份、独立桶、跨 root 去重、历史迁移、路径隐私、family 定价、root 卡片和 CODEX ALL 下钻。queue reader 与五份 edge 定价补丁纳入上游修复，相关回归覆盖兼容性。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only 实例字段、sidecar v27、root signature 和组合筛选；session analytics、Sessions 核心实现与合并前一致。 |
| 004 DSH roots | 保留统一 resolver、fallback/WSL、稳定 source、唯一 owner、contribution ledger、授权 API/Settings、路径隐私、独立卡片和 DSH ALL；核心实现与合并前一致。 |
| 005 个人 InsForge | 保留无隐式上游云目标、运行时公开配置、实例/账号/机器隔离 checkpoint、历史重放与 generation 隔离；启动入口冲突按运行时配置先于渲染的要求解决。 |
| 006 社区关闭 | 保留默认关闭的独立开关、入口/公共资料隐藏、路由回退、preload/refresh 抑制和 Actions 门禁；核心实现与合并前一致。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 更新器网络入口门禁、无主动调度/更新控件、旧动作忽略和原生设置页脚仅显示版本；macOS 原生构建的既有验收限制保持原状态。 |

纳入上游 v1.4.6/v1.4.7、provider API Key 本地受限文件存储、可选 Sentry 上报、OpenCode `-free` 零费用、Grok 产品共享额度占比、Windows 手动启动激活窗口及 queue reader 内部改写检测。本轮未配置或启用 Sentry DSN。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 根目录 / Dashboard 锁文件安装与依赖检查 | Pass：两处 `npm ci` 和 `npm ls --depth=0` 均退出码 0。 |
| Node 全量 | Pass：4404 项，4388 passed、16 skipped、0 failed、0 cancelled，退出码 0。包含 roots、连续同步/迁移、个人云、社区门禁、原生更新门禁及新增上游回归。 |
| Dashboard 焦点用例定向复查 | Pass：`RedeemProCode.test.jsx` 26/26 passed，退出码 0。 |
| Dashboard 全量最终复跑 | Pass：171 个文件，1624/1624 passed，退出码 0；`dashboard-final.log`。 |
| Dashboard typecheck | Pass，退出码 0。 |
| 普通生产构建 / pet 与 quota 构建 | Pass：两次构建均退出码 0，确认 `dashboard/dist/pet.html` 与 `quota.html` 存在。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 全部 Pass，退出码 0；managed versions 一致为 v1.4.7。 |
| Dashboard 启动交叉验证 | Pass：使用 esbuild 转译实际入口并在 VM 注入延迟配置 Promise；配置完成前无 telemetry/router/render，完成后依次启动，App 与路由错误组件均保留。 |
| 工作流配置 / YAML / CommonJS 语法 | Pass：四个工作流 YAML 解析通过，全部 InsForge build env 使用个人变量并保留可选 Sentry；24 个变更 CommonJS 文件通过 `node --check`。 |
| 冲突标记与 whitespace | Pass：无未解决 merge entries 或残留冲突标记；`git diff --check`、`git diff --cached --check` 均通过。 |
| macOS 工程生成与三端完整原生构建 | Not Run：`xcodegen generate` 返回 command not found，未执行后续工程 patch；`xcodebuild -version` 确认只有 Command Line Tools，无完整 Xcode；本机也缺少 dotnet、cargo。原生源码契约和可用 Swift harness 由 Node suite 覆盖，不代表真实安装包通过验证。 |

Dashboard 首轮单 worker 运行有 1623 passed、1 failed，失败为本轮未修改的 `RedeemProCode.test.jsx` 兑换码弹窗输入焦点断言。该问题也见于历史合并记录；单文件复查 26/26 passed，随后完整单 worker 复跑 171 个文件、1624/1624 passed。保留首轮失败日志，不修改产品代码或放宽断言。构建保留既有 externalization、混合 import 与 chunk-size 提示，测试保留既有 React act/jsdom 提示。

环境：Node v24.22.1、npm 11.19.1。日志保存在本机 `/tmp/tokentracker-merge-2026-10-26-*.log`；Node suite 使用正常进程权限运行隔离 fixtures 与 loopback 服务，Swift/Clang module cache 指向 `/tmp`。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-merge-2026-10-26-clang SWIFT_MODULECACHE_PATH=/tmp/tokentracker-merge-2026-10-26-swift TOKENTRACKER_AUTO_RETRY_NO_SPAWN=1 node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
npm --prefix dashboard test -- --maxWorkers=1 --minWorkers=1 src/components/cloud/RedeemProCode.test.jsx
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

本轮交付为当前分支的本地 merge commit，沿用上游 v1.4.7；不额外递增版本、不推送远端或标签、不触发发布，不应用云端 migration 或部署 edge functions。本地验证不代表远程跨平台 CI 或云端部署已完成。
