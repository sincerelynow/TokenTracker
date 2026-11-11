# origin/main 合并验证记录

- 日期：2026-11-11（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能设计。
- 合并前的分支提交为 `44d5aa5bd9399e1e80edd7f5e13c8c840690c494`，经远端核对的 `origin/main` 为 `d7a583673ab1a7f0d412301a61174f57a47d164e`（v1.5.17）。Git 自动合并，无冲突。

## 功能核对

- 001–004 保留 Dashboard 手动管理集成、普通 CLI 五分钟非重叠统计、Codex 和 DeepSeek Harness 多目录用量及汇总、Codex 会话按目录筛选和本地路径隐私。会话 sidecar 升至 v30，旧缓存重建后纳入 DeepSeek Harness 请求耗时和首响应统计，失败重试仍保留可计费用量。
- 005 保留个人 InsForge 实例配置、无默认云目标、Dashboard 运行时公开配置和按实例、账户、设备隔离的上传进度。合入页面与后台共用的认证刷新，保留实例变更时的会话检查和刷新结果校验。
- 006 保留默认关闭的社区入口、预加载和同步刷新，以及独立的定时任务开关。007 保留 macOS 和 Windows 的上游更新限制及原生 Dashboard 入口隐藏。
- 合入 Antigravity 定价别名、Qoder 与 Ark 限额缓存重构及 Linux 打包修复。发布工作流继续从仓库变量读取个人 InsForge 配置，托管版本统一为 v1.5.17。

## 验证

| 检查 | 结果 | Duration (s) |
| --- | --- | --- |
| `npm test` | 5022 项，5005 通过、17 跳过、0 失败 | 81.73 |
| `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1` | 178 个文件，1740 项全部通过 | 75.29 |
| `npm --prefix dashboard run typecheck` | 通过 | 4.04 |
| `npm run dashboard:build` | 通过，Vite 仍有模块外置、导入和 chunk 体积提示 | 25.99 |
| copy、locale、UI hardcode、guardrails、versions、bot frames 校验 | 全部通过 | 2.08 |
| `node --test test/architecture-guardrails.test.js` | 4 项全部通过 | 0.08 |
| `git diff --check` 与 `git diff --cached --check` | 通过，无未解决冲突 | N/A |
| `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb` | `xcodegen` 缺失（退出码 127），未生成 macOS 工程 | N/A |

本次完成本地合并。浏览器人工验收、真实个人云端验收、原生安装包构建和远程 CI 未执行。
