# origin/main 合并验证记录

- 日期：2026-10-13（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能设计。
- 当前分支基线：`79689b3b875a2e3c430dda77206679808b3f71b6`。
- origin/main 基线：`5010b121ba7a6a54b1dfcdaf8bdd9c700af8dcca`（31 个新增提交，v1.3.13）。
- 策略：普通双父 merge，解决 5 个文件的内容冲突，并独立复审自动合并和关键兼容实现。沿用已批准的功能规格，不改变 SEP 生命周期、批准或归档状态。

## 功能保留

| OpenSpec | 合并结果 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 不自动安装或修复第三方 Hook、手动集成操作、立即统计、本地授权及 CLI 五分钟非重叠调度；接入上游 DuMate 被动读取。 |
| 002 Codex root 用量 | 保留稳定身份、独立统计桶、跨 root 去重、历史迁移、路径隐私及 CODEX ALL；兼容异步队列读取和上传积压处理。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only 实例字段、root signature 与组合筛选；采用 origin/main 的 sidecar v25、ZCode/OpenCode 会话与性能指标。 |
| 004 DSH roots | 保留 dshHomes、统一 resolver、受保护的本地 API/Settings、fallback、独立 source、唯一 owner、ledger 与 DSH ALL。 |
| 005 个人 InsForge | 保留无隐式上游云目标、运行时公开 URL/key、实例/账号/机器隔离的 checkpoint、历史重放及会话 generation 隔离；上传预算、部分成功和完整 ignored tail 仍保存当前 scoped checkpoint。 |
| 006 社区关闭 | 保留独立开关默认 disabled、导航/公共资料隐藏、路由回退、无默认排行榜 preload/refresh 和 Actions 门禁；采用上游 Settings 通用按钮与布局。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 检查与安装入口前门禁、无自动调度/可见更新入口、旧更新动作忽略及原生页脚仅展示版本；保留上游 Windows ReleaseClient 实现，但个人 updater 不调用网络。 |

## 冲突与兼容处理

- Windows TrayApplicationContext：采用上游 WebView/货币读取响应性改进，移除冲突中的更新定时器和手动更新处理代码，保留同步及版本桥接。
- Windows UpdateChecker：保留个人检查/安装门禁，接入上游 ReleaseClient 与可注入 HTTP client；保留 ReleaseClient 纯客户端回归，将 checker 回归改为 silent/manual 重复检查均 Skipped、零 HTTP 请求、Idle、不触发安装/退出。
- AccountSection：同时保留社区开关和上游通用 Button/SettingsRow。
- MenuBarSection：采用上游按钮改进，继续隐藏原生更新控件和页脚上游外链。
- sync：融合上游 90 秒上传时间预算、最多 100 批窗口、community 10 批限制和部分失败处理，成功批次与完整 ignored tail 同时更新 scoped/legacy checkpoint。
- 上传前压缩：以 legacy、旧 URL-only 及全部 URL/account/machine checkpoint 的最大 byte offset 为边界。所有已有 checkpoint 位于字节不变的前缀内，仅压缩其后的 pending snapshots，避免目标切换导致 offset 错位或漏传。新增回归覆盖不同进度的目标、账号、机器，新目标完整重放及各目标连续两次幂等。
- 直接核对自动合并的 local-api 异步聚合、context fallback 的 root 筛选、session-analytics root identity、个人云配置、构建配置与社区 gate。
- 采用上游统一版本 v1.3.13，无额外版本递增；未执行远端迁移、edge 部署或发布。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 根目录与 Dashboard npm ci | Pass。 |
| 合并定向 Node 回归 | 57/57 passed、0 skipped、0 failed；`targeted.log`。 |
| Dashboard 全量 | 167 文件、1600/1600 passed；`dashboard.log`。 |
| Dashboard typecheck | Pass；`typecheck.log`。 |
| 普通生产构建 | Pass；`build.log`。 |
| 含桌面宠物入口的构建 | Pass，确认 `dashboard/dist/pet.html` 存在；`pet-build.log`。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 全部 Pass；`validators.log`。所有 managed versions 为 v1.3.13。 |
| 最终 Node 全量 | 4178 项：4163 passed、15 skipped、0 failed、0 cancelled，退出码 0；`node-full.log`。 |
| JS 语法、冲突标记、git diff --check | Pass。 |
| macOS / Windows / Linux 原生编译与运行验收 | Not Run：本机只有 macOS Command Line Tools，缺完整 Xcode/xcodegen 和 .NET SDK；Linux 原生包未编译。不将静态回归视为原生构建通过。 |

原始日志保存在本机 `/tmp/tokentracker-personal-merge-2026-10-13/`，不提交临时日志。只完成本地合并，不执行 push 或 OpenSpec 归档。

## 核心复验命令

```bash
npm ci --cache /tmp/tokentracker-npm-cache
npm ci --prefix dashboard --cache /tmp/tokentracker-npm-cache-dashboard
node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/personal-insforge-sync.test.js test/upload-queue.test.js test/sync-upload-batching.test.js test/sync-auto-upload-policy.test.js test/local-cloud-config.test.js test/runtime-config.test.js test/macos-update-check-scheduling.test.js test/windows-update-check-scheduling.test.js test/community-features-workflow.test.js test/local-api-codex-roots.test.js test/local-api-dsh-roots.test.js test/session-analytics-scan-roots.test.js
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
TOKENTRACKER_BUILD_PET=1 npm run dashboard:build
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-swift-cache TOKENTRACKER_AUTO_RETRY_NO_SPAWN=1 node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
```
