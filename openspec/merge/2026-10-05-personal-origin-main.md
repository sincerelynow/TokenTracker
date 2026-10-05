# origin/main 合并验证记录

- 日期：2026-10-05（Asia/Shanghai）。
- 目标：将最新 `origin/main` 合并到 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的既有功能设计。
- 当前分支基线：`27c82b83dbf7f1b9c60ea4b4bbeb80d70682149c`。
- origin/main 基线：`5b3fa82da226f7b593a80ebb95f17800c6cc1fec`（25 个新增提交，v1.1.11）。
- 策略：普通双父 merge；逐项处理 8 个冲突文件，另外修正自动合并后的配置、凭据和测试兼容问题。

## 功能设计保留

| OpenSpec | 合并结果与验证 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 启动零 Hook 写入、Dashboard 单 provider 安装/卸载、本地授权、立即统计及普通 CLI 五分钟非重叠调度。manager、API、调度及 Dashboard 回归通过。 |
| 002 Codex root 用量 | 保留稳定 `codex-root:<key>`、独立统计、跨 root 去重、历史保留、定价和仅展示层的 `CODEX ALL`；接入上游 `scanRoots.codex` 时仍以已保存的 `codexHomes` 为完整扫描边界。roots、parser、context、wire/pricing 与 Dashboard 回归通过。 |
| 003 Codex root 会话筛选 | 保留 local browser-only 的实例 key/label、第一配置 root 归属及缓存身份，insights/CSV 不暴露新增身份。sessions、scan roots、隐私及 Dashboard 筛选回归通过。 |
| 004 DSH roots | 保留 `dshHomes`、确定性 session owner、`dsh-root:<key>`、`DSH ALL`、路径隐私和中文控件。manager/API/parser/migration 与 Dashboard 回归通过。 |
| 005 个人 InsForge | 无隐式上游 URL/key；本地认证、账户读取和上传继续读取运行时个人配置。实例/账号/机器专属 checkpoint 和历史重放继续保留，结合上游凭据复用、并发签发合并、退出/关闭同步时失效及账户响应缓存。 |
| 006 社区关闭 | 保留默认 disabled 的独立开关、路由回退、入口隐藏、无排行榜 preload/refresh 和三个 Actions 开关；个人用量上传仍可显式启用。相关 Node 和 Dashboard 回归通过。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 请求前门禁、无启动/定时/手动更新入口、旧动作忽略和原生页脚隐藏，同时保留同步与版本。静态/组件回归通过；原生构建限制见下文。 |

## 交叉兼容处理

- Dashboard 设备会话同时绑定实例 URL、调用账号、JWT owner 和失效 generation；更换个人实例时重签，旧实例的延迟签发结果不得进入当前会话。新增两个实际异步回归用例覆盖实例切换和延迟响应。
- 仅在明确的 `CLOUD_DEVICE_TOKEN_REJECTED` 错误后重签；保留上游 opt-in、关闭同步时停止活动上传、按账号共享签发及失败 backoff。
- 本地 API 每次请求读取个人 `config.json`，无配置时拒绝认证代理；结合上游账户缓存、旋转 refresh token 持久化和并发会话失效保护。
- 原生上传子进程沿用本地 API 使用的个人 URL/公开 key，并按成功认证的用户 ID 选择 checkpoint，避免误用其他账号的持久 CLI token 或过期环境目标。真实 HTTP 回归检查请求目标、凭据、checkpoint 和配置不被覆盖。
- CLI function route 使用明确的生产地址常量作为显式配置地址的映射，而不再拿个人分支为空的默认地址推导 route；自部署目标保留自己的 `/functions/` 路径，不回退上游。
- 保留上游 TRAE、持久化 scan roots、云响应压缩、趋势与数字单位修复和 v1.1.11。已有 change 生命周期及历史验收状态不变。

## 验证结果

| 检查 | 结果 |
| --- | --- |
| 个人云配置、checkpoint、账号切换、真实 HTTP 设备凭据缓存、账户缓存/API 安全、旧配置迁移、自动上传策略、function route | 160 项：159 passed，1 skipped，0 failed。 |
| OpenSpec 功能及架构回归组 | 207 项：202 passed，5 skipped，0 failed。 |
| 扩展扫描目录、Codex/DSH、TRAE、serve 和嵌入依赖回归组 | 297 项：281 passed，13 skipped，3 failed。两个 GNOME 测试因 CRLF 源码抽取失败，一个 serve 测试因 Windows 无符号链接权限失败；相关测试与实现均与 origin/main 相同。与前两组存在重复文件，不能将测试数直接相加。 |
| Dashboard 全量 Vitest | 120 个文件，879 项全部通过（含新增的两个实例隔离回归）。 |
| Dashboard TypeScript / production build | Pass；仅有 Vite 外部模块、动态 import 和 chunk 大小提示。 |
| `validate:copy` / `validate:locale` / `validate:ui-hardcode` / `validate:guardrails` / `validate:versions` / `validate:bot-frames` | 全部通过；9 个 managed version 位置均为 v1.1.11。 |
| `git diff --check`、冲突标记扫描及冲突 JS 文件语法检查 | Pass。 |
| `npm run ci:local` 全量尝试 | 未通过：3351 passed、80 failed、34 skipped。usage-limits 输出测试结果后遗留句柄不退出，仅终止已核实属于本次 CI 的 usage-limits 子进程后取得汇总。所有失败测试文件与 origin/main 一致；本次未将全量 CI 标记为通过，也未逐项重新证明所有失败的根因。 |
| 原生构建 | Not Run：本机 `dotnet --list-sdks` 无 SDK；macOS/Linux 原生构建需对应平台环境。007 的既有原生构建 blocker 保持原状。 |

本次仅完成本地分支合并与验证；未执行 push、发布、远端迁移、函数部署或 OpenSpec 归档。

## 复验入口

```powershell
npm.cmd ci
npm.cmd ci --prefix dashboard
npm.cmd --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm.cmd --prefix dashboard run typecheck
npm.cmd run dashboard:build
npm.cmd run ci:local
node --test test/personal-insforge-sync.test.js test/runtime-config.test.js test/local-cloud-config.test.js test/cloud-sync-rotation.test.js test/cloud-account.test.js test/cloud-sync-prefs.test.js test/cloud-device-token.test.js test/local-device-token-cache.test.js test/local-api-account-view.test.js test/local-api-security.test.js test/legacy-baseurl-migration.test.js test/sync-auto-upload-policy.test.js test/function-url.test.js
node --test test/codex-roots.test.js test/local-api-codex-roots.test.js test/scan-roots-sync.test.js test/session-analytics-scan-roots.test.js test/dsh-roots.test.js test/local-api-dsh-roots.test.js test/deepseek-harness.test.js test/deepseek-harness-migration.test.js
```

本机原始输出保存在未跟踪的 `.tmp/merge-main/`：`cloud-node-final.log`、`features-node.log`、`compat-node.log`、`dashboard-tests-final.log`、`validators.log` 和 `ci-local.log`。
