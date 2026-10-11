# origin/main 合并验证记录

- 日期：2026-10-11（Asia/Shanghai）。
- 目标：将 origin/main 合并至 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能要求。
- 当前分支基线：`e44c7cac4d3b72f10bdb378cfc7a7508ce4959e3`。
- origin/main 基线：`2bdabcfacef58245fac57b1ba6fc41a5362c06b9`（98 个新增提交，v1.3.5）。
- 策略：普通双父 merge，解决 17 个内容冲突并审查自动合并的交叉改动。复用现有功能规格，不改变 SEP 批准、验收或归档状态。

## 功能要求保留

| OpenSpec | 合并结果与验证 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 不自动修改第三方 Hook、手动安装/卸载、立即统计、本地授权和 CLI 调度；兼容上游新增工具解析器与集成管理。Node 全量相关回归通过。 |
| 002 Codex root 用量 | 保留稳定 root 身份、扫描边界、跨 root 去重、历史迁移、独立上传桶及 `CODEX ALL` 展示；采用 origin/main 已验证的模型 token 分项与 sidecar v17。 |
| 003 Codex root 会话筛选 | 保留本地实例身份、配置顺序 owner、缓存隔离和动态 root 筛选，兼容上游会话性能、详情与过滤。Node/Dashboard 相关回归通过。 |
| 004 DSH roots | 保留 `dshHomes`、统一 resolver、稳定 `dsh-root:<key>`、确定性 owner、迁移及 `DSH ALL` 展示。Node/Dashboard 相关回归通过。 |
| 005 个人 InsForge | 保留无隐式上游目标、运行时公开 URL/key、按实例/账号/机器保存的 checkpoint、旧目标历史重放及 generation 隔离；与上游本地服务持有设备凭证、owner 校验、实例切换与上传冷却机制兼容。 |
| 006 社区关闭 | 保留默认关闭的独立开关、入口隐藏、路由回退、无默认排行榜 preload/refresh 和 Actions 门禁；显式开启后仅在确认完整上传成功时刷新周榜，不触发 month/total/all 重计算。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 请求前门禁，移除启动/定时/菜单更新入口，忽略旧更新动作并隐藏原生页脚上游链接；移除上游新加入的 macOS 设置桥更新状态字段。静态及组件回归通过，原生编译限制见下。 |

## 冲突与交叉兼容处理

- 合并 AccountSection、独立 CloudSection 与账号设置 hook：保留上游 Cloud 提示/订阅逻辑，社区公开资料仍受独立开关控制。
- 合并 AuthContext、同步 hook 与 cloud-sync：接入上游服务端 owner 证明和本地会话句柄，凭证保留在本地服务；实例/账号变化、登出及迟到桥响应均不能沿用旧会话。
- 上传失败的迟到冷却响应也校验当前 generation，避免修改新账号的同步状态；新增异步回归验证此边界。
- 合并前后端运行时配置：无配置时保持本地可用；显式 URL/key 组合严格验证；本地注入配置优先于构建配置，公开配置接口只返回公开字段；切换目标不能混用旧 key 或设备凭证。
- 旧 b46 目标迁移保留至成功重放提交后，已验证设备凭证绑定到显式个人目标；新账号/目标从独立 checkpoint 重放，切换目标或 owner 时保留旧账号的 destination 进度。
- CLI 设备登录改写已知旧官网授权链接至配置的 Dashboard，拒绝无关授权地址；个人 edge 授权默认 loopback，自托管打包要求显式 Dashboard 并验证 HTTPS/loopback 与 URL 凭证。
- 合并 local-api 的动态实例切换、账号授权及背景同步；只向 CLI 传递服务端证明的账号身份，不信任请求体 accountId；未配置云端的本地 drain 继续扫描。
- 上游测试中的默认公网配置假设改为显式公开配置 fixture。Windows 随机端口会落入 Fetch 禁止列表，相关真实 HTTP fixture 改为重选可用端口；不改变生产端口或网络校验。
- 保留上游新增 Cloud/self-host、WorkBuddy 等变更及 v1.3.5 版本文件；本次没有改写既有 OpenSpec change 文档。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 根目录和 Dashboard `npm ci` | 通过。 |
| Dashboard 全量 | 164 文件、1586 项全部通过；`dashboard-final3.log`。 |
| Node 最终全量 | 4061 项：4009 passed、5 failed、47 skipped、0 cancelled，退出码 1；`node-final2.log`。 |
| 自托管/初始化/遥测兼容复验 | self-host-backend、init-uninstall、Cline、telemetry 回归通过；热路径 guardrail 28/28 通过，真实设备缓存独立回归 26/26 通过，首次初始化复验 3/3 通过。最终 Node 全量覆盖了上述文件。 |
| Dashboard 类型检查 | 通过；`typecheck-final2.log`。 |
| 普通生产构建 | 通过；`build.log`。 |
| 含桌面宠物入口的最终生产构建 | 通过，确认 `dashboard/dist/pet.html`；`pet-build-final.log`。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 六项全部通过；`validators-final.log`。各平台版本一致为 v1.3.5。 |
| macOS / Windows / Linux 原生编译 | 未执行：本机无 macOS 工具链，`dotnet --list-sdks` 无 SDK，未验证 Linux 原生打包。不能据静态回归声称原生构建通过。 |

Node 剩余失败与 [origin/main 上游合并记录](./2026-10-11-upstream-main.md) 的五个已知失败名称一致：

1. `copilot-app-parser`：SQLite sidecar 测试缺少 `sqlite3`。
2. `dual-install-ownership-probe`：缺少 `sqlite3`。
3. `graph-auto-index-import`：缺少 `sqlite3`。
4. `sync-workbuddy-repair`：缺少 `sqlite3`。
5. `skills-manager-windows-copy`：本机 Node v24.13.0 在 Windows Unicode 路径执行 `fs.cpSync` 失败。

最终全量没有新增失败名称，但不将这些失败或 47 项跳过表述为验收全部通过。初次复验的配置 fixture、自托管源适配及随机禁止端口问题已处理，最终运行中不再出现。历史中断/诊断日志也保留，最终结论以上表列出的最终日志为准。

日志位于本地忽略目录 `.tmp/merge-personal-2026-10-11/`，不提交测试临时文件。仅完成本地合并，不执行 push、发布、远端 SQL/edge 部署或 OpenSpec 归档。

## 核心复验命令

```powershell
$env:TOKENTRACKER_AUTO_RETRY_NO_SPAWN = '1'
node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
Remove-Item Env:TOKENTRACKER_AUTO_RETRY_NO_SPAWN
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
$env:TOKENTRACKER_BUILD_PET = '1'
npm run dashboard:build
Remove-Item Env:TOKENTRACKER_BUILD_PET
```
