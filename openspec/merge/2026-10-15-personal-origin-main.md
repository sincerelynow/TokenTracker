# origin/main 合并验证记录

- 日期：2026-10-15（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 的功能设计，并将 `main` 与当前分支推送到 `origin`。
- 当前分支基线：`567963ab`。
- origin/main 基线：`b94782aaafe14fc5f2a91ff12f1c326b4b2ff250`（9 个当前分支未包含的提交，v1.3.16）。
- 本地 `main` 与已 fetch 的 `origin/main` 一致，无需额外合并或改写 main 历史。
- 策略：普通双父 merge，解决 1 个测试文件的内容冲突，复审自动合并及关键定制功能。沿用现有功能设计，不改变 change/SEP 生命周期、批准或归档状态。
- 授权依据：用户消息“按功能设计，将origin/main分支合并到当前分支，合并完成后将origin/main和当前分支推送到远程”。

## 功能保留与兼容处理

| OpenSpec | 合并结果 |
| --- | --- |
| 001 手动管理集成 | 保留 init/serve 零第三方 Hook 自动写入、单 provider 操作、立即统计、本地授权及 CLI 五分钟非重叠调度。 |
| 002 Codex root 用量 | 保留稳定身份、独立统计桶、跨 root 去重、历史迁移、路径隐私、CODEX ALL 与 root/ALL 下钻；UsageOverview 同时接入上游日期范围和模型展开箭头改进。 |
| 003 Codex root 会话筛选 | 保留 first-root owner、browser-only 实例字段、root signature、sidecar 兼容及组合筛选；本轮未修改后端会话实现与 Sessions 页面。 |
| 004 DSH roots | 保留统一 resolver、受保护 API/Settings、fallback/WSL、稳定 source、唯一 owner、ledger、路径隐私、独立卡片与 DSH ALL。 |
| 005 个人 InsForge | 保留无隐式上游云目标、运行时公开配置、实例/账号/机器隔离 checkpoint、历史重放和会话 generation 隔离；新增 Cloud 设备数与期限提示仍使用当前实例命名空间，self-hosted 提示抑制继续有效。 |
| 006 社区关闭 | 保留默认 disabled 的独立开关、导航与公共资料隐藏、社区路由回退、preload/refresh 抑制和 Actions 门禁。 |
| 007 桌面更新禁用 | 保留 macOS/Windows 检查和安装入口前的禁用门禁、无主动调度/更新控件、旧动作忽略及原生页脚仅展示版本。 |

- 唯一冲突为 `dashboard/src/components/settings/AccountSection.cloud-prompt.test.jsx`：同时保留个人分支显式开启社区的测试环境设置/清理，以及上游单设备账户仅显示了解入口的新增回归。
- 纳入上游 OMP/OmO 超大 JSONL 安全跳过及尾部游标修复、Cursor 新模型定价与五条 edge 定价路径、Cloud 文案和条件提示、UsageOverview 交互改进。
- 直接核对 rollout 的变更仅涉及 OMP/OmO 通用解析，未覆盖 Codex/DSH root attribution；核对 UsageOverview 的合成卡不参与二次计量；个人云配置、同步与社区/更新门禁未被本轮自动合并修改。
- 沿用上游统一版本 v1.3.16，依赖锁文件仅更新版本号，复用已安装依赖。
- 本次只合并、验证并推送源码，不额外递增版本或推送标签，不手动触发发布、云端迁移或 edge 部署。

## 验证证据

| 检查 | 结果 |
| --- | --- |
| Node 全量 | Pass：4199 项，4184 passed、15 条件 skipped、0 failed、0 cancelled，退出码 0；`node-full.log`。 |
| Dashboard 全量 | Pass：167 文件，1608/1608 passed，退出码 0；`dashboard.log`。 |
| Dashboard typecheck | Pass，退出码 0。 |
| 普通生产构建 | Pass，退出码 0；`build.log`。保留已有 externalization、混合 import 与大 chunk 提示。 |
| 含桌面宠物入口的构建 | Pass，退出码 0，确认 `dashboard/dist/pet.html` 存在；`pet-build.log`。 |
| copy / locale / UI hardcode / architecture / versions / bot frames | 全部 Pass，退出码 0；所有 managed versions 为 v1.3.16。 |
| 修改的 CommonJS 语法、冲突标记、git diff 检查 | Pass。 |
| 原生工程生成与安装包编译 | Not Run：尝试 `xcodegen generate` 返回 127，本机缺少 xcodegen、完整 Xcode 与 .NET SDK；依赖生成结果的 icon patch 未执行，三端原生安装包未编译。不将静态或 Node 回归视为完整原生构建通过。 |

原始测试/构建日志保存在本机 `/tmp/tokentracker-personal-merge-2026-10-15/`，不提交临时日志。本地验证不表示远程跨平台 CI 或发布已完成。

## 核心复验命令

```bash
CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-personal-clang-cache SWIFT_MODULECACHE_PATH=/tmp/tokentracker-personal-swift-cache TOKENTRACKER_AUTO_RETRY_NO_SPAWN=1 node --test --test-concurrency=4 --test-timeout=60000 --test-reporter=tap test/*.test.js
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
```
