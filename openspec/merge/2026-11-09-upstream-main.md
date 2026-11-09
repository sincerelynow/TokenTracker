# upstream/main 合并验证记录

- 日期：2026-11-09（Asia/Shanghai）。
- 目标：按 001–004 四项 OpenSpec 功能设计合入最新 `upstream/main`；授权来自用户本次合并请求。
- 基线：当前 `main` 为 `c82c1a2d1635302561eef03acf823efbee510bb0`；上游为 `68c22580e0a62152cc7cfa2c476e36bf216904dc`（版本 1.5.15）。
- 策略：双父合并；沿用既有 merge 记录，不修改四项 change 的设计、批准或 `ready_to_archive` 状态。

## 兼容处理

- 保留 Dashboard 手动管理第三方集成及普通 CLI 五分钟非重叠统计。合入上游先监听 HTTP、后执行运行时维护的启动优化，但不重新引入启动自动修复 Hook/插件。
- 保留 Codex/DSH 多扫描目录、稳定 root identity、独立用量和 synthetic ALL 汇总、Sessions Codex root 筛选及本地路径隐私边界。
- Codex flattened legacy unknown 修复同时覆盖 `codex` 和 `codex-root:*`；保留逐 source 的 observed model policy，避免升级时在已有模型行旁重新写入重复 unknown 用量。
- DSH 继承前缀识别、跨 session message 去重、seq/line watermark、历史修复和事务性 queue 写入继续使用各 root 的统计 source。撤回历史时使用原 source，再向目标 root 写入修正后的贡献；缺失或不可验证的历史继续保留并报告 deferred。
- DSH 跨 root 的同一 session 保持首个 owner；同一 root 内的 artifact alias 采用上游完整候选校验与替换逻辑。
- 保留双方回归测试，补充 root source 下的 Codex legacy 修复、DSH 历史修复与 source 迁移、跨 root fork 去重及连续两次同步断言。启动响应测试同时断言不会调用第三方集成修复。

## 验证

- 解析器定向回归：420/420 通过，0 失败（1.03 秒）。
- Dashboard TypeScript 检查通过；生产构建通过（20.81 秒），保留 chunk size 提示。
- copy、locale、UI hardcode、architecture、versions、bot frames 校验全部通过；统一版本为上游 1.5.15。
- 首轮 Node 全量：4988 项，4967 通过、17 跳过、4 失败（124.40 秒）；失败均为端口/进程识别测试。正常进程权限下该文件单独复验 16/16 通过（1.50 秒），随后按相同权限复跑全量。
- 首轮 Dashboard 全量：1713/1714 通过（65.92 秒），兑换码弹窗焦点断言失败；相关组件及测试本次未改动，上次合并记录中也有同一失败。该文件单独复验 26/26 通过（2.82 秒），随后复跑全量。
- 最终 Node 全量：4988 项，4971 通过、17 跳过、0 失败（58.08 秒）；命令为 `SWIFT_MODULECACHE_PATH=/tmp/tokentracker-merge-swift-cache CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-merge-clang-cache npm test`，使用正常进程权限。
- 最终 Dashboard 全量：176 个测试文件、1714/1714 通过（54.54 秒）；命令为 `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1`。
- 按 `CLAUDE.md` 尝试 `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb`，本机返回 `command not found: xcodegen`（exit 127）；未生成 macOS 工程或执行后续 patch，未安装或修复环境。
- 未运行浏览器人工验收、原生安装包构建或远程 CI；未部署、发布或推送。
