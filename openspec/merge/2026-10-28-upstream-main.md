# upstream/main 合并验证记录

- 日期：2026-10-28（Asia/Shanghai）。
- 目标：将 `upstream/main` 合入当前 `main`，保留四项 OpenSpec 功能及验收契约。
- 当前分支基线：`aa5673945d7d716578170cde80bfa3d89115f907`。
- upstream 基线：`9dc925d89e7c526c9d5831b689a8bac427e7d8ea`；12 个新增提交、67 个变更文件，版本 v1.4.14。
- 授权依据：用户消息“[openspec](openspec/) 按功能设计，将分支 upstream/main 合并到当前分支”。
- 策略：普通双父 merge；沿用已有 merge 验证记录，不新增功能 change，不改写四项 change/SEP 的设计、批准或生命周期。

## 功能保留与兼容核对

| OpenSpec 功能 | 合并结果与验证范围 |
| --- | --- |
| 001 Dashboard 手动管理集成 | 保留 init/serve 启动零第三方集成写入、单 provider 管理、立即统计、本地授权和普通 CLI 五分钟非重叠调度；新增 OpenSquilla 仅为被动读取源。 |
| 002 Codex root 用量拆分与汇总 | 保留稳定 root sources、独立 hourly/project 桶、全局事件去重、历史重建、family 定价与 synthetic CODEX ALL；保留单 root context 与 device 的组合请求。 |
| 003 Codex root 会话筛选 | 保留 browser-only key/label、first-root owner、sidecar root signature、隐私边界和组合筛选；上游 skeleton、效率列布局及 Ultrafast session subset 纳入现有页面。 |
| 004 DSH 多扫描目录与汇总 | 保留 dshHomes、fallback/WSL、受保护 API、稳定 root source、唯一 owner、contribution ledger、路径隐私、root 卡与 DSH ALL。 |

## 冲突与兼容修正

- 五份 README 的 provider 表保留 Gemini/OpenCode/OpenClaw/Every Code 的手动管理说明，同时加入上游 OpenSquilla 被动读取条目。
- 中文 README 同时保留 Dashboard 管理 OMP notify 的说明及 OpenSquilla passive reader；不恢复上游 init 自动安装行为。
- 其余代码自动合并。审阅 sync/init/status、rollout、pricing、Sessions 页面及离线传输交集；新增解析器未改写 Codex/DSH root bucket attribution。
- 扩展已有 root 离线传输回归，验证 Ultrafast / Ultrafast long-context 子集与 root identity 同时导出、导入及重复导入后完整保留。
- 清理两个上游测试文件的末尾多余空行，使 whitespace 校验通过。

## 纳入的上游行为

- OpenSquilla Desktop/CLI 用量跟踪与去重。
- Qoder/Qoder CN usage-shape drift 修正及 TRAE CN classic 目录发现。
- Ultrafast 子集在 session filter 和 device transfer 中保留；GPT-6.1 Terra 定价。
- Sessions 加载骨架、效率列可达性、Limits 页面布局。
- Windows 独立 OAuth 登录窗口；macOS ZCode reset credits 与 Start Plan 展示。
- 纳入 v1.4.12–v1.4.14 版本同步。

## 验证证据

| 检查 | 结果 | Duration (s) |
| --- | --- | --- |
| Node 全量首轮（受限权限） | 4486 项：4464 passed、4 failed、18 skipped；失败全部为 serve-port-hint 的 fixture 进程复用/替换场景。 | 112.45 |
| 进程测试正常权限复验 | Pass：15/15，四项首轮失败均通过。 | 1.51 |
| Node 全量最终（正常权限） | Pass：4486 项，4468 passed、18 skipped、0 failed、0 cancelled，退出码 0；覆盖补充断言后的最终代码。 | 48.00 |
| root 离线传输兼容回归 | Pass：13/13，包含 root identity 与 Ultrafast 子集的完整往返断言。 | 1.45 |
| Dashboard 全量 | Pass：173 个文件，1641/1641。 | 75.92 |
| TypeScript strict check | Pass：退出码 0。 | 5.1 |
| Dashboard production build | Pass：退出码 0；保留 crypto externalization、混合 import 与 chunk-size 提示。 | 16.4 |
| copy / locale / UI hardcode / architecture / versions / bot frames | Pass：六项均退出码 0，版本一致为 v1.4.14。 | 1.9 |
| CommonJS 语法 / 冲突标记 | Pass：14 个变更的 CommonJS 文件通过 node --check；变更文件无冲突标记。 | 0.3 |
| Git index / whitespace | Pass：无未解决 merge entries、无未暂存实现改动，staged whitespace 校验退出码 0。 | <1 |
| 三端完整构建 / macOS 工程重生成 | Not Run：本机未找到 xcodegen、dotnet、cargo；未将 Node 源码契约和 Swift harness 等同于安装包验收。 | N/A |
| 本地浏览器人工验收 | Not Run：本轮以组件回归、类型检查与 production build 验证 Dashboard，不复用历史截图作为本轮证据。 | N/A |

环境：Node v24.22.1；沿用已安装依赖，本次上游没有依赖项或 Dashboard 锁文件变化；根锁文件仅同步版本。Swift/Clang module cache 指向 `/tmp`。

原始日志位于本机 `/tmp/tokentracker-merge-2026-10-28-*.log`：`node`、`port-recheck`、`node-final`、`root-transfer`、`dashboard`、`checks`。仅代表本地验证，不代表远程 CI、云端部署或原生安装包验收。

本轮交付为当前分支的本地 merge commit，沿用上游版本 v1.4.14；未推送远端或版本标签，未触发发布或部署。
