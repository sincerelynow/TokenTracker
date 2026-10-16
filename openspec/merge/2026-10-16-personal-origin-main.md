# origin/main 合并验证记录

- 日期：2026-10-16（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能设计，并将 `main` 与当前分支推送到 `origin`。
- 当前分支基线：`3b7bd1d0fa7d1d37d9b032f9d11e05525f9acb8c`。
- origin/main 基线：`86eb293ef193d0b94583899def11e3d8dbaddd8c`（10 个当前分支未包含的提交，v1.4.2）。
- 本地 `main` 与 fetch 后的 `origin/main` 一致；此次合并只推进个人功能分支。
- 策略：普通双父 merge；86 个文件自动合并，无文本冲突，另修复自动合并后的客户端接口兼容问题和测试夹具。
- 授权依据：用户消息“按功能设计，将origin/main分支合并到当前分支，合并完成后将origin/main和当前分支推送到远程”。
- 沿用现有设计与合并验证记录方式，不改变七项 change/SEP 的设计、生命周期、批准或归档状态。

## 功能保留与兼容处理

| OpenSpec | 合并结果 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 启动零第三方 Hook 写入、单 provider 操作、立即统计、本地授权和 CLI 五分钟非重叠调度；Muse Code 使用被动读取。 |
| 002 Codex root 用量 | 保留稳定身份、独立统计桶、跨 root 去重、历史迁移、路径隐私、CODEX ALL 与 root/ALL 下钻；五条 edge 定价路径同时保留 root 与 Muse reasoning 语义。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only 实例字段、root signature 和组合筛选；纳入 Kimi 会话分析及与 root 身份兼容的 v26 sidecar。 |
| 004 DSH roots | 保留统一 resolver、受保护 API/Settings、fallback/WSL、稳定 source、唯一 owner、contribution ledger、路径隐私、独立卡片和 DSH ALL。 |
| 005 个人 InsForge | 保留无隐式上游云目标、运行时公开配置、实例/账号/机器隔离 checkpoint、历史重放和 generation 隔离；适配新增云重建流程的账户参数，重建与后续上传使用同一 accountId，JWT owner 不匹配时拒绝重建。 |
| 006 社区关闭 | 保留默认 disabled 的独立开关、导航/公共资料隐藏、社区路由回退、preload/refresh 抑制和 Actions 门禁。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 更新器网络门禁、无主动调度/更新控件、旧动作忽略及原生设置页脚仅显示版本。 |

- 纳入上游 Kimi 模型归属修复、Muse Code、云端用量恢复、README badge、status/doctor 设备凭据识别、Qoder limits 和依赖更新。
- `dashboard/src/lib/cloud-sync.ts` 自动合并后，新调用未传入个人分支所需的 accountId，导致 TS2554。补齐会话解析与重传的账户绑定，并增加当前账户会话复用及账户不匹配的两条行为回归。
- `test/device-token-presence.test.js` 不再把已取消的 `DEFAULT_BASE_URL` 当作有效实例；改为显式个人 URL/公开 anon key，并为配置令牌提供实例绑定。新增未绑定令牌不能视为可用的回归。
- `test/diagnostics.test.js` 的脱敏夹具改为有效且显式绑定的个人配置，仍验证令牌和本地路径不泄露。未放宽运行时配置校验。
- 新增的云重建按钮继续只面向官方实例；个人自部署实例不展示该按钮。
- 沿用上游统一版本 v1.4.2，现有已安装依赖与更新后的 manifests 匹配；根目录和 Dashboard 的 `npm ls --depth=0` 均通过。
- 此任务只合并、验证和推送源码，不额外递增版本、不推送标签、不手动触发发布、不应用 SQL migration 或部署 edge functions。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| Node 定向兼容回归 | Pass：凭据存在性、diagnostics、TypeScript guardrails、device token store，24/24 passed。 |
| Node 全量最终复验 | Pass：4332 项，4317 passed、15 条件 skipped、0 failed、0 cancelled，退出码 0。 |
| Dashboard 云同步定向回归 | Pass：cloud-sync、cloud-sync-prefs、cloud-sync-rebuild 三个文件，50/50 passed。 |
| Dashboard 全量最终复验 | Pass：170 个文件，1623/1623 passed，退出码 0。 |
| Dashboard typecheck | Pass：修复 TS2554 后退出码 0。 |
| 普通生产构建 | Pass：修复后的最终构建退出码 0。 |
| 含桌面宠物入口的构建 | Pass：退出码 0，确认 `dashboard/dist/pet.html` 存在。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 全部 Pass，退出码 0；managed versions 一致为 v1.4.2。 |
| 修改的 CommonJS 语法、冲突标记、git diff 检查 | Pass：无 unmerged entries 或残留冲突标记，语法与 whitespace 检查通过。 |
| 原生跨平台构建 | Not Run：本机缺少 xcodegen、完整 Xcode 与 dotnet；macOS/Windows/Linux 完整原生构建仍需对应平台 CI 验证。007 原有原生构建阻塞状态保留。 |

首轮 Node 全量为 4331 项、4308 passed、8 failed、15 skipped：1 项为客户端 TS2554，另 7 项为上述默认云目标/令牌绑定夹具不兼容。修复后定向检查全部通过；最终全量结果以上表和 `node-final.log` 为准。构建保留既有 externalization、混合 import 和大 chunk 提示；Dashboard 测试中的 React act/jsdom 提示未导致测试失败。

原始日志保存在本机 `/tmp/tokentracker-personal-merge-2026-10-16/`，不提交临时日志。Node 全量使用正常进程权限验证真实 loopback 服务和子进程，Swift/Clang module cache 指向 `/tmp`。本地验证不代表远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-swift-cache TOKENTRACKER_AUTO_RETRY_NO_SPAWN=1 node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
node --test test/device-token-presence.test.js test/diagnostics.test.js test/dashboard-typescript-guardrails.test.js test/cloud-device-token.test.js
npm --prefix dashboard test -- --maxWorkers=2 --minWorkers=1 src/lib/cloud-sync-rebuild.test.ts src/lib/cloud-sync.test.ts src/lib/cloud-sync-prefs.test.ts
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
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
