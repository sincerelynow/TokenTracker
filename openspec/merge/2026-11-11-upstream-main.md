# upstream/main 合并验证记录

- 日期：2026-11-11（Asia/Shanghai）。
- 本地基线：`6cdb09d4e4f9faf7070c301d623cd24e08db194c`。上游：`fba54de8e8fc96301ad3607e911181040b86fdb6`（v1.5.17）。
- 依据：OpenSpec 001–004 的功能设计和用户的合并请求。

## 兼容处理

- 保留 Dashboard 手动管理集成和立即统计、启动时不写第三方集成配置、普通 CLI 每五分钟非重叠统计。
- 保留 Codex 和 DeepSeek Harness 多扫描目录的稳定标识、去重、用量汇总和路径隐私，以及 Sessions 的 Codex root 筛选。
- 在 `src/lib/session-analytics.js` 保留 Codex 和 DSH roots 的缓存签名与现有归属逻辑，并采用上游 sidecar v30。旧缓存重新构建后，DSH 性能统计纳入正常请求耗时和首响应，排除 v1 失败重试样本，同时保留其可计费用量。
- 合入上游云账户刷新协调、Antigravity 定价别名、Qoder 与 Ark 限额缓存重构、Linux 打包修复和 v1.5.17 版本同步。

## 验证

- OpenSpec 定向 Node 回归 170/170 通过（22.37 秒），覆盖手动集成、定时统计、Codex/DSH roots、会话缓存和云端定价契约。
- 首轮 Node 全量的 9 项失败均来自本地迁移测试仍预期写回 sidecar v29。将期望更新为 v30，并新增从 v29 重建 Codex root 身份和性能字段的用例。修正后会话性能与 DSH 定向回归 48/48 通过。
- 最终 Node 全量共 5002 项，4985 通过、17 跳过、0 失败（51.25 秒）。使用 `SWIFT_MODULECACHE_PATH=/tmp/tokentracker-merge-swift-cache CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-merge-clang-cache npm test` 和正常的本地端口、进程权限。
- Dashboard 全量 176 个文件、1714/1714 项通过（70.40 秒）。
- Dashboard TypeScript 检查和生产构建通过。Vite 报告 browser crypto、混合静态/动态导入和 chunk 体积提示。
- copy、locale、UI hardcode、architecture、versions 和 bot frames 校验通过。架构校验器测试 4/4 通过，托管版本一致为 v1.5.17。
- macOS 工程生成命令返回 `command not found: xcodegen`（exit 127）。工程生成及后续图标 patch 未执行。
- 本次验证在本地执行，未运行浏览器人工验收、原生安装包构建或远程 CI。
