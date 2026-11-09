# origin/main 合并验证记录

- 日期：2026-11-09（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 功能设计。
- 基线：当前分支 `af6e1e6a24409e8555fa457cd1b7edddfd60e33c`；fetch 后 `origin/main` 为 `6cdb09d4e4f9faf7070c301d623cd24e08db194c`（v1.5.15）。
- 授权：用户要求“按功能设计，将分支 origin/main 合并到当前分支”；普通双父合并，沿用既有合并记录，不改变各 change 的设计、批准或生命周期。

## 合并与功能保留

- Git 自动合并成功，无文本冲突，无需额外修改实现。
- 保留 001–004：启动不自动安装/修复第三方集成、Dashboard 手动管理、CLI 五分钟非重叠统计、Codex/DSH 多目录与独立用量及 synthetic ALL 汇总、Sessions Codex root 筛选与本地路径隐私。
- 纳入 origin/main 已验证的 Codex legacy unknown 修复及 DSH fork 去重、历史修复和跨 root 归属逻辑；相关实现与 origin/main 一致。
- 保留 005：无默认云目标、本地 Dashboard 运行时公开云配置、个人实例认证与按目的地/账户/设备隔离的上传进度。自动合并的 init、sync、local API 仍保留个人分支的配置校验、账户身份和 checkpoint 隔离逻辑。
- 保留 006：社区功能默认关闭，路由、预加载、同步刷新及三个后台 workflow 仍受独立开关控制；同时纳入社区统计弹窗按需挂载等上游优化。
- 保留 007：macOS/Windows 更新器门禁、启动/菜单/桥接禁用，以及原生 Dashboard 更新控件和页脚外链隐藏。
- 纳入 v1.5.15、启动先监听后维护、长时间 local-sync 后台继续运行、Cursor 显式浏览器连接、共享用量限制缓存、解析与定价修正；所有托管版本保持一致。

## 验证

| 检查 | 结果 | Duration (s) | 证据 |
| --- | --- | --- | --- |
| Node 全量 | Pass：5008 项，4991 passed、17 skipped、0 failed、0 cancelled | 71.47 | `SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-merge-swift-cache CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-merge-clang-cache npm test`；正常进程权限；`/tmp/tt-20261109-personal-node.log` |
| Dashboard 全量 | Pass：178 文件，1740/1740 passed | 61.98 | `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1`；`/tmp/tt-20261109-personal-dashboard.log` |
| Dashboard 类型检查 | Pass | N/A | `npm --prefix dashboard run typecheck` |
| Dashboard 生产构建 | Pass；保留 chunk size、模块导入和 SDK crypto externalization 提示 | 13.06 | `npm run dashboard:build`；`/tmp/tt-20261109-personal-build.log` |
| 仓库校验 | Pass | N/A | copy、locale、UI hardcode、architecture、versions、bot frames；版本均为 v1.5.15；`/tmp/tt-20261109-personal-validation.log` |
| 合并与空白检查 | Pass | N/A | 无未解决冲突；`git diff --cached --check`、`git diff --check` |
| macOS 工程生成 | Not Run：命令在生成前失败 | N/A | 按 `CLAUDE.md` 尝试 `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb`，返回 `zsh:1: command not found: xcodegen`（exit 127）；后续 patch 未执行 |

未运行浏览器人工验收、原生安装包构建或远程 CI；未部署新增 migrations/edge functions、发布或推送。007 原有原生构建验收阻塞状态保持不变；本次本地回归不替代真实安装包或个人云端验收。

本次仅生成本地 merge commit。
