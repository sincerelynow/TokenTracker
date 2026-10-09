# origin/main 合并验证记录

- 日期：2026-10-09（Asia/Shanghai）。
- 目标：将最新 `origin/main` 合并至 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的既有功能设计。
- 当前分支基线：`ab940c1393b70c22ef9b0084787a85b89e017fed`。
- origin/main 基线：`d7aaf5b5d309da17adbafcef1440713a0bc55ddd`（74 个新增提交，v1.2.2）。
- 策略：普通双父 merge；逐项解决两处内容冲突，审查自动合并的交叉改动，再提交验证后的结果。

## 功能设计保留

| OpenSpec | 合并结果与验证 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 不自动写入第三方 Hook、Dashboard 手动安装/卸载、立即统计、本地授权和普通 CLI 五分钟非重叠调度；manager/API/启动与调度回归通过。 |
| 002 Codex root 用量 | 保留稳定 root 身份、完整配置扫描边界、跨 root 去重、历史迁移、定价/reasoning、独立上传桶及仅展示层 `CODEX ALL`；兼容上游模型 token 分项。 |
| 003 Codex root 会话筛选 | 保留 local browser-only 实例身份、配置顺序 owner、缓存隔离及动态 root 筛选；兼容上游会话详情、性能估计、模型与日期筛选。 |
| 004 DSH roots | 保留 `dshHomes`、统一 resolver、稳定 `dsh-root:<key>`、确定性 owner、旧数据迁移、路径隐私与 `DSH ALL`；Node 与 Dashboard 回归通过。 |
| 005 个人 InsForge | 保留无默认上游目标、本地运行时 URL/key、实例/账号 checkpoint、历史重放、按实例/账号/generation 绑定的设备会话；个人配置、真实 HTTP 缓存和账户隔离回归通过。 |
| 006 社区关闭 | 保留默认 disabled 的独立开关、入口隐藏、路由回退、无排行榜 preload/refresh 及三个 Actions 门禁；个人认证与上传仍可独立启用。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 请求前门禁，无启动/定时/菜单更新入口，忽略旧更新动作并隐藏原生页脚上游链接；保留版本与同步。静态/组件回归通过，原生编译限制见下。 |

## 冲突与交叉兼容处理

- `.github/workflows/release-dmg.yml`：Linux Dashboard 构建保留上游 `TOKENTRACKER_BUILD_PET=1`，同时使用 repository variables 中的个人 InsForge URL/key，不引入上游硬编码目标。实际启用该标志完成构建并确认 `dashboard/dist/pet.html` 存在。
- `dashboard/src/contexts/InsforgeAuthContext.jsx`：退出登录保留显式同步偏好；复用本分支 account reset 清除设备凭据、同步时间、设备 ID 和云数据就绪状态，清空当前账号绑定，发出同页失效事件。同步偏好与变更时间不重写，旧签发 generation 无法重新写入凭据。
- 加强上游退出回归：在认证完成后设置真实账户会话状态，断言退出确实清理账号数据；覆盖开启/关闭/未设置同步偏好、同账号重新登录、另一账号登录、旧 generation 写入拒绝，以及云视图退出后切回即时本地视图。
- 自动合并的 App、Vite、sync、local API、本地化测试继续保留个人分支约束，同时接入上游法律页、Linux 宠物、OpenCode cursor 分片及定价状态。
- 保留统一版本 v1.2.2。现有 change/SEP 生命周期与历史验证账本不变；本记录只描述合并验证。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| OpenSpec 001–004 与解析/迁移/去重 Node 回归（32 个文件） | 677 项：674 passed、3 skipped、0 failed、0 cancelled，退出码 0。 |
| 个人云配置、实例账号隔离、HTTP 缓存/API 安全、社区门禁与桌面更新 Node 回归（19 个文件） | 186 项：185 passed、1 skipped、0 failed、0 cancelled，退出码 0。 |
| Dashboard 全量 Vitest | 130 个文件、961 项全部通过，退出码 0。 |
| Dashboard TypeScript | Pass，退出码 0。 |
| Dashboard 普通生产构建 | Pass，退出码 0；保留已有模块 externalization、动态 import 和大 chunk 提示。 |
| Dashboard 宠物页面生产构建 | Pass，退出码 0，确认 `pet.html` 存在。 |
| `validate:copy` / `validate:locale` / `validate:ui-hardcode` / `validate:guardrails` / `validate:versions` / `validate:bot-frames` | 全部 Pass；managed versions 均匹配 v1.2.2。 |
| `git diff --check` / `git diff --cached --check` / 冲突标记扫描 / 自动合并 JS 文件语法检查 | Pass，无未解决的冲突。 |
| 全量 Node / `ci:local` | 本次未运行。origin/main 的同日合并记录已记录完整 Node suite 的 Windows 平台失败和超时，并与原始上游对照；本次仅对上述相关回归取得新证据，不能将历史结果视为本次全量通过。 |
| 原生平台编译 | Not Run：`dotnet --list-sdks` 无 SDK；macOS/Linux 构建需对应平台环境。007 的既有原生构建 blocker 保持原状。 |

两组 Node 文件互不重复，共 863 项，859 passed、4 skipped。定向功能回归、Dashboard 与静态检查通过，不表示完整跨平台 CI 已通过。

原始输出保存在被忽略的 `.tmp/merge-personal-2026-10-09/`：`npm-ci.log`、`dashboard-ci.log`、`features-node.log`、`personal-node.log`、`dashboard-tests.log`、`typecheck.log`、`build.log`、`build-pet.log`、`validators.log`。

本次仅完成本地合并；未执行 push、发布、远端迁移、edge 部署或 OpenSpec 归档。

## 核心复验命令

```powershell
npm.cmd ci
npm.cmd ci --prefix dashboard
npm.cmd --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm.cmd --prefix dashboard run typecheck
npm.cmd run dashboard:build
$env:TOKENTRACKER_BUILD_PET = '1'
npm.cmd run dashboard:build
Remove-Item Env:TOKENTRACKER_BUILD_PET
node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=spec test/integration-manager.test.js test/local-api-integrations.test.js test/init-dry-run.test.js test/serve-native-background-sync.test.js test/serve-runtime-repair.test.js test/codex-roots.test.js test/local-api-codex-roots.test.js test/dsh-roots.test.js test/local-api-dsh-roots.test.js test/scan-roots-sync.test.js test/session-analytics.test.js test/session-analytics-codex-subagents.test.js test/session-analytics-scan-roots.test.js test/session-performance.test.js test/deepseek-harness.test.js test/deepseek-harness-migration.test.js test/cursor-store.test.js test/model-breakdown.test.js test/codex-sync-hot-path.test.js test/sync-codex-rescan-repair.test.js test/rollout-parser.test.js test/codex-context-breakdown.test.js test/codex-context-hot-path.test.js test/sync-upload-batching.test.js test/local-api-source-scope.test.js test/edge-pricing-parity.test.js test/account-model-wire.test.js test/account-summary-model-wire.test.js test/architecture-guardrails.test.js test/opencode-fork-dedup.test.js test/multi-install-parser.test.js test/claude-fork-conversations.test.js
node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=spec test/personal-insforge-sync.test.js test/runtime-config.test.js test/local-cloud-config.test.js test/cloud-sync-rotation.test.js test/cloud-account.test.js test/cloud-sync-prefs.test.js test/cloud-device-token.test.js test/local-device-token-cache.test.js test/local-api-account-view.test.js test/local-api-security.test.js test/legacy-baseurl-migration.test.js test/sync-auto-upload-policy.test.js test/function-url.test.js test/community-features-workflow.test.js test/personal-desktop-build-workflow.test.js test/windows-update-check-scheduling.test.js test/macos-update-check-scheduling.test.js test/native-bridge-sync-feedback.test.js test/localization-regressions.test.js
```
