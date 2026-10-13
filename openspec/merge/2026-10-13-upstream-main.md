# upstream/main 合并验证记录

- 日期：2026-10-13（Asia/Shanghai）
- 目标：将 `upstream/main` 合入 `origin/main`，保持四项现有 OpenSpec 功能与验收契约。
- origin 基线：`2bdabcfacef58245fac57b1ba6fc41a5362c06b9`
- upstream 基线：`10f0a23310bb090f9993fd244db3639b9980f2a1`（v1.3.13，30 个新增提交）
- 策略：普通双父 merge；解决 6 个文件的内容冲突。

## 功能保留与兼容处理

| OpenSpec 功能 | 合并结果与验证 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 不自动安装或修复第三方 Hook、单项操作、立即统计、本地授权和 CLI 五分钟非重叠调度。中文 README 保留 Dashboard 管理说明并加入上游 DuMate 被动读取支持。 |
| 002 Codex root 用量拆分与汇总 | 保留显式扫描边界、稳定 root source、独立桶、去重、迁移、reasoning/定价和 CODEX ALL。异步 model breakdown 保留 root labels 与上游 pricing revision 重试；上下文 queue fallback 在 await 后按 root 筛选；新增 family/root/legacy 回归。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only key/label、root signature 和筛选组合，同时接入上游 ZCode/OpenCode 多行扫描及数据库锁失败重试。sidecar 升至 25，旧 v14/v15/v16/v17/v24 缓存均重建身份、存储与性能指标。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、受保护 API/Settings、fallback、稳定 root source、唯一 owner、ledger、隐私和 DSH ALL。公共 profile canonicalization 同时保留 DSH 与新增 DuMate；新增队列压缩后 root/legacy 独立计量与幂等回归。 |

- 保留上游同步积压修复、异步队列读取、上传时间/批次预算、DuMate、OmO 镜像去重、ZCode/OpenCode 会话、Windows 响应性及更新检查、Cloud 与 Settings 改进。
- 独立只读审查覆盖自动合并的 init/sync/status/rollout/Settings/Sessions，以及冲突解决后的 local-api/session-analytics；主执行者直接读取并核对关键差异。
- 沿用上游统一版本 v1.3.13；四个 change/SEP 的行为文档、生命周期和历史验证账本保持不变。
- 此任务只合并源码；未递增版本、触发发布工作流、执行云端迁移或 edge 部署。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| 合并相关 Node 定向测试（下方命令） | 180 项：176 passed、4 项平台条件 skipped、0 failed，退出码 0。 |
| 独立审查的 roots/manager/upload 测试 | 32/32 passed。 |
| Dashboard 全量：`npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1` | 165 个文件，1576/1576 passed，退出码 0。 |
| `npm --prefix dashboard run typecheck` | Pass，退出码 0。 |
| `npm run dashboard:build` | Pass，退出码 0；保留已有 externalization、混合 import 与大 chunk 提示。 |
| validate:copy、validate:locale、validate:ui-hardcode、validate:guardrails、validate:versions、validate:bot-frames | 全部 Pass；managed versions 匹配 v1.3.13。 |
| 最终 Node 全量（包含新增上传压缩与 root fallback 回归） | 4159 项：4144 passed、15 skipped、0 failed、0 cancelled，退出码 0。 |
| JS 语法、冲突标记、`git diff --check` | Pass。 |
| 原生安装包编译 | Not Run；Windows/Linux 原生编译和 macOS 完整 App 构建由对应平台 CI 验证。Node 全量包含本机 Swift 字符串编译测试。 |

初次 Node 全量有 7 个环境相关失败：原生 zstd 尚未安装、Swift 默认模块缓存不在可写目录，以及沙箱限制真实服务进程探测。执行 `npm rebuild`、将 Swift/Clang 缓存指向 `/tmp` 并在正常进程权限下复验后，18 项原生/parser 测试与 15 项端口生命周期测试全部通过；最终完整运行再次通过。未为测试环境问题修改业务实现。

原始日志保存在本机 `/tmp/tokentracker-merge-2026-10-13/`，未纳入提交。上述本地验证不表示远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
npm ci
npm ci --prefix dashboard
node --test --test-reporter=spec test/session-performance.test.js test/session-analytics.test.js test/session-analytics-codex-subagents.test.js test/session-analytics-scan-roots.test.js test/session-analytics-zcode.test.js test/session-analytics-opencode.test.js test/local-api-source-scope.test.js test/local-api-queue-cache.test.js test/sync-upload-batching.test.js test/upload-queue.test.js test/edge-pricing-parity.test.js
npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1
npm --prefix dashboard run typecheck
npm run dashboard:build
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-swift-cache node --test --test-timeout=60000 --test-reporter=spec test/*.test.js
```
