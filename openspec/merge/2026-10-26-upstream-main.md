# upstream/main 合并验证记录

- 日期：2026-10-26（Asia/Shanghai）。
- 目标：将最新 `upstream/main` 合入当前 `main`，保留四项现有 OpenSpec 功能及其验收契约。
- 当前分支基线：`9a2160365e2f9abeb3dd28dd8dbc01825c9d50c3`。
- upstream 基线：`905a54e89b8bf42b0dd19bcd0bfb40d3fca92e3d`，47 个新增提交（包含 merge commits）、132 个变更文件，统一版本 v1.4.11。
- 策略：普通双父 merge；解决 6 个文件的内容冲突，并补充多 root 与新增上游行为的兼容修正和回归。
- 授权依据：用户消息“[openspec](openspec/) 按功能要求，将分支 upstream/main 合并到当前分支”。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 启动不修改第三方集成、单 provider 安装/卸载、本地授权、立即统计与普通 CLI 五分钟非重叠调度；Settings 同时保留 Integrations 与上游 Local data 分区。相关启动、manager、API、调度与组件回归通过。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 root sources、独立 hourly/project 桶、事件去重、历史重建、family 定价、root 卡与 synthetic CODEX ALL；上下文明细同时携带 root request source 与 device，缓存包含两个维度。Ultrafast root 用量和连续两次解析回归通过。 |
| 003 Codex root 会话筛选 | 保留有序 root metadata、first-root owner、压缩归档、browser-only key/label、insights/CSV 隐私边界，以及 CODEX ALL/具体 root/组合筛选。sidecar 递增到 v28，合并 OMP 与 Ultrafast 数据并保留 root signature、逐文件缓存身份和失败重试门禁。旧 v27 缓存重建回归通过。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、fallback/WSL、受保护 API、稳定 root source、唯一 owner、contribution ledger、路径隐私、root 卡与 DSH ALL。相关配置、parser、连续同步、隐私和组件回归通过。 |

本轮沿用已有 merge 验证记录，不新建功能 change，不改写四项 change/SEP 的设计、批准或生命周期。

## 冲突与兼容修正

- `SettingsPage.jsx`：同时保留 Integrations 和 Local data 的导航、内容与可用性判断。
- `UsageOverview.jsx` / `ContextBreakdownPanel.jsx`：同时传递 root request source 与 selected device；缓存键及 effect 依赖覆盖二者；保留 imported history 提示。组件测试同时断言 root 与 device 参数。
- `rollout.js`：保留 root bucket identity 并纳入 Ultrafast subset；发现 compaction 独立调用仍使用 legacy source，新增回归复现后将 hourly/project attribution 统一改为 `bucketSource`。连续两次解析验证幂等。
- `session-analytics.js`：使用包含 root identity 的 discovery group，加入 OMP discovery/dependencies、incomplete markers 与重试；sidecar v28 避免命中 fork 原有 v27 缓存。更新两个缓存升级测试文件。
- `ContextBreakdownPanel.test.jsx`：保留双方测试，并覆盖 root/device 的组合请求。
- `local-usage-transfer.js`：上游 source 校验原本拒绝带冒号的内部 root sources，修正为显式接受合法 Codex/DSH namespace，仍拒绝空 key、路径、未知 namespace 和非规范来源；往返导入保留四个独立 root，重复导入不重复计数，导出不包含本机路径。

- 既有礼品会员测试在同一时钟刻度内兑换和撤销时可能形成零长度有效期，导致“已实际生效”场景随机返回 free；单文件复查复现后，在测试中等待时钟超过 starts_at 再撤销。仅明确测试前置条件，未修改业务代码或数据库规则。
- 清理两个上游测试文件的文件末尾多余空行，使 staged whitespace 校验通过。

## 纳入的上游行为

- 离线设备用量导出、预览、导入、移除与本地设备筛选，导入历史不进入上传队列。
- OMP Sessions browser、nested/fork 去重、resume 与 metadata-only 输出。
- Codex Ultrafast 6x 费用子集；Haiku 5.5、Kimi K3.1、qwen3.8-max 等定价更新；跨 source 的 `-free` 零费用匹配和 K2.8 Preview 未定价规则。
- WorkBuddy 认证 IPC 额度与 credit 明细；Grok 折叠分段池、键盘 focus 与剩余占比修正。
- TokenGalaxy WebGL fallback、Safari Sentry 噪声过滤、static FileHandle 释放、Cloud catalog loading 与本地化修正。
- 纳入上游依赖、安全更新及 v1.4.8–v1.4.11 版本同步。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 根目录 / Dashboard 锁文件安装 | Pass：两处 `npm ci` 退出码 0，未修改锁文件。 |
| Node 全量首轮 | Pass：4451 项，4435 passed、16 skipped、0 failed、0 cancelled；之后补充了 compaction root 回归与最终修正。 |
| Node 全量最终 | Pass：4452 项，4436 passed、16 skipped、0 failed、0 cancelled，退出码 0。覆盖四项 OpenSpec 以及上游新增行为，包含最终 compaction root 修正和时间前置条件修正。 |
| Node 中间全量及礼品测试复查 | 中间全量 4452 项：4435 passed、1 failed、16 skipped；失败为上述同刻度礼品撤销 fixture。单文件先复现，补齐时间前置条件后 13/13 passed。 |
| 兼容定向回归 | Pass：70/70，覆盖 compaction hourly/project root 归属、Ultrafast root 6x 定价及幂等、离线 root transfer、sidecar v27→v28 与 OMP。 |
| Dashboard 全量 | Pass：173 个文件，1637/1637 passed，退出码 0；2 workers。 |
| Dashboard typecheck / production build | Pass：均退出码 0；build 保留既有 externalization、混合 import 与 chunk-size 提示。 |
| copy、locale、UI hardcode、architecture、versions、bot frames | Pass：六项 validator 均退出码 0；managed versions 一致为 v1.4.11。 |
| CommonJS 语法 / 冲突标记 | Pass：36 个变更的 `.js` / `.cjs` 文件通过 `node --check`；变更文件无残留冲突标记。 |
| Git index / whitespace | Pass：无未解决的 merge entries，无工作区未暂存改动，staged whitespace 校验退出码 0。 |
| 原生完整构建 / macOS 工程重生成 | Not Run：本机缺少 xcodegen、dotnet、cargo，不能执行工程重生成和三端完整构建。Node suite 包含原生源码契约与本机 Swift harness；平台跳过项不代表原生安装包已验证。 |
| 本地浏览器人工验收 | Not Run：本轮使用现有 Settings、Usage Overview、Sessions 和新增 Local data 组件回归及生产构建验证；不把历史截图作为本轮证据。 |

首次新增 compaction root 回归先出现预期的 root attribution 断言失败；修正后测试暴露新 fixture 未创建 Git project，补齐隔离 project fixture 后定向 70/70 通过。上述初始失败不作为最终通过证据。

环境：Node v24.22.1、npm 11.19.1；完整 Node suite 以正常进程权限运行隔离 fixtures、loopback 服务与 Swift harness，Swift/Clang module cache 指向 `/tmp`。

原始日志位于本机 `/tmp/tokentracker-merge-2026-10-26-*.log`：`npm-root`、`npm-dashboard`、`node`、`node-final`（中间失败）、`node-verified`（最终）、`cloud-gifts-recheck`、`cloud-gifts-final`、`validators`、`compatibility`、`dashboard`、`typecheck`、`build`。这些是本地验证证据，不代表远程 CI 或原生安装包验收。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-swift-cache node --test --test-timeout=300000 --test-reporter=spec test/*.test.js
node --test test/codex-token-usage-record.test.js test/codex-ultrafast-pricing.test.js test/local-usage-transfer.test.js test/session-performance.test.js test/session-analytics-omp.test.js
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

本轮交付为当前分支的本地 merge commit，沿用上游版本 v1.4.11；未推送远端、未推送版本标签、未触发发布或部署。
