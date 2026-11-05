# origin/main 合并验证记录

- 日期：2026-11-05（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 功能设计。
- 基线：当前分支 `7840a24481e4a04d6e9d2be8644a2119a13d9ead`；fetch 后 `origin/main` 为 `c82c1a2d1635302561eef03acf823efbee510bb0`（v1.5.6）。
- 授权：用户要求“按功能设计，将分支 origin/main 合并到当前分支”；普通双父 merge，不改变既有 change 生命周期。

## 合并与功能保留

- Git 自动合并成功，没有文本冲突，无需额外修改实现。
- 保留 001–004：启动不自动安装/修复第三方集成、Dashboard 手动管理、CLI 五分钟统计、Codex/DSH 多目录与独立用量及 ALL 汇总、Codex 会话 root 筛选；同时纳入 origin/main 对会话响应缓存、模型归属和速度档位的兼容更新。
- 保留 005：无默认云目标、本地 Dashboard 运行时公开云配置、个人实例认证与按目的地/账户/设备隔离的上传进度。
- 保留 006：社区功能默认关闭，路由、预加载、同步刷新与三个后台 workflow 仍受独立开关控制。
- 保留 007：macOS/Windows 更新器门禁、启动/菜单/桥接禁用及原生 Dashboard 更新控件和页脚外链隐藏；自动合并的 macOS 启动与菜单改进未恢复更新入口。
- 纳入 origin/main 的 v1.5.6、用量限制缓存、解析和定价修正等更新；各托管版本保持一致。

## 验证

| 检查 | 结果 | Duration (s) | 证据 |
| --- | --- | --- | --- |
| Node 全量 | Pass：4912 项，4895 passed、17 skipped、0 failed、0 cancelled | 71.29 | `SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-merge-swift-cache CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-merge-clang-cache npm test`；`/tmp/tt-20261105-personal-node.log` |
| Dashboard 全量 | Pass：176 文件，1729/1729 passed | 61.83 | `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1`；`/tmp/tt-20261105-personal-dashboard.log` |
| Dashboard 类型检查 | Pass | N/A | `npm --prefix dashboard run typecheck` |
| Dashboard 生产构建 | Pass；保留 chunk size、模块导入和 SDK crypto externalization 提示 | 21.19 | `npm run dashboard:build`；`/tmp/tt-20261105-personal-build.log` |
| 仓库校验 | Pass | N/A | copy、locale、UI hardcode、architecture、versions、bot frames；版本均为 v1.5.6，copy 有未使用 key 提示 |
| 合并与空白检查 | Pass | N/A | 无未解决冲突；`git diff --cached --check`、`git diff --check` |
| macOS 工程生成 | Not Run：命令在生成前失败 | N/A | 按 `CLAUDE.md` 尝试 `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb`，返回 `zsh:1: command not found: xcodegen`（exit 127）；后续 patch 未执行 |

未进行原生安装包构建、浏览器人工验收或远程 CI；未部署新增 migrations/edge functions、发布或推送。007 原有原生构建验收阻塞状态保持不变；本次本地回归不替代真实安装包或个人云端验收。

本次仅生成本地 merge commit。
