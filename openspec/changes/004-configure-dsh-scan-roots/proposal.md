# Change: 配置 DeepSeek Harness 多扫描目录

## Why

DeepSeek Harness 当前只能通过 `TOKENTRACKER_DSH_HOME`、`DSH_HOME` 或默认 `~/.dsh` 选择单个显式 home；Windows 下虽能自动联合 native/WSL 安装，但用户无法像 Codex 一样在本地 Dashboard 中持久化和管理多个自定义扫描目录。拥有多个 Harness home、迁移目录或并行配置的用户因此会漏计未被当前单一 override 覆盖的 session。

现有 Codex roots 管理已经验证了本地配置、受保护 API、Settings 编辑、路径校验、诊断集成与 root 用量卡模式；DeepSeek Harness 的 session parser 也已有跨 artifact 迁移与 session contribution ledger，可在保持 `dsh` provider family 的前提下扩展多 root discovery 与私有统计拆分。

## What

- 为 DeepSeek Harness 增加最多 16 个可持久化扫描 roots，并在未配置时保持现有环境变量、默认目录和 Windows/WSL 自动发现行为。
- 在本地 Dashboard Settings 中增加 DeepSeek Harness roots 的读取、编辑、校验和保存能力。
- 让 sync、status 和 diagnostics 使用同一 root 解析结果，并保证跨 root 的同一 session 只计一次。
- 为每个 DSH root 生成稳定、非路径的内部统计 source，并在 Dashboard 展示每 root 卡片及条件式 `DSH ALL` 汇总卡片。
- 保持公开统计归入 `dsh` provider family，不上传 root 路径；Settings 控件完整跟随当前界面语言。

## Scope

### In Scope

- `config.json` 中 `dshHomes` 的兼容读取、原子保存、路径规范化、realpath 去重和数量限制。
- 配置、环境变量、默认目录及 Windows native/WSL discovery 的确定性优先级。
- 本地授权 API、Dashboard hook、Settings 编辑组件、文案与多语言资源。
- 多 root session discovery、稳定顺序、跨 root duplicate ownership、现有 cursor/contribution ledger 兼容。
- `dsh-root:<key>` 内部统计 identity、私有 model breakdown、root 卡片、`DSH ALL` 合成与下钻。
- sync、status、diagnostics、README 与自动化/人工验证。

### Out of Scope

- Sessions 页面按 DSH root 筛选。
- 云端 API、数据库 schema、上传 payload 或公开排行榜变更。
- 修改 DeepSeek Harness 日志格式解析、token 映射、定价或 legacy `deepseek` → `dsh` source migration。
- 自动创建、移动或删除用户的 Harness 目录和 session 文件。
- 发布、版本号递增或平台安装包构建。

## Success Criteria

- SC-001: 用户可在本地 Settings 保存 1–16 个有效 DSH roots，下一次 sync 扫描全部 roots。
- SC-002: 未保存 `dshHomes` 的用户继续获得当前环境变量、默认目录与 Windows/WSL 行为。
- SC-003: 同一物理 root 或同一 Harness session 被多个 root 暴露时只累计一次，连续两次 sync 不增加重复用量。
- SC-004: root 绝对路径只保留在本地配置、状态和本地 Settings API 中，不进入 queue 或上传 payload。
- SC-005: 两个有用量的 roots 显示两个目录卡片和一个不参与二次总计的 `DSH ALL` 卡片，单 root 不显示冗余汇总卡。
- SC-006: 中文等非英文界面中的 DSH roots 控件不回退英文。

## Dependencies and Constraints

- Node CLI 使用 CommonJS；Dashboard 使用 React/Vite，用户可见文案必须进入 `copy.csv` 和 locale 文件。
- 本地 roots API 必须复用现有 local mutation authorization，配置写入必须保持原有字段并使用原子写与 `0600` 权限。
- `tasks.md` 和 `verification.md` 分别是唯一任务状态与验证证据账本。
- 修改 `src/` 或 `dashboard/` 后，实际发布须遵循仓库统一 npm/macOS/Windows/Linux release 流程，但不属于本 change。

## Open Questions

- None。revision 2 已纳入用户明确要求的 root 用量拆分与汇总卡；Sessions root 筛选仍留待独立 change。
