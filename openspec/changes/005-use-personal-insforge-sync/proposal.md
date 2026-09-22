# Change: 使用个人 InsForge 实例同步用量

## Why

当前 Dashboard、CLI、桌面构建和部分工作流内置上游 InsForge URL 与 anon key。未配置个人实例时仍可能登录、上传或读取上游服务。现有多 Codex 与 DSH roots 产生独立用量行，但个人实例切换还需要历史重传和云端聚合验证。

## What

- 云功能只连接显式配置的个人 InsForge 实例；缺少配置时本地功能可用，云功能给出可识别的未配置状态。
- 切换实例时独立记录上传进度，完整重传本地可用队列，避免沿用上游实例的偏移。
- 验证 `codex-root:<key>` 和 `dsh-root:<key>` 在上传、个人统计与公开汇总中的用量归属、去重及路径隐私。
- 提供个人实例部署与构建配置说明，移除构建和仓库文档中的默认服务连接。

## Scope

### In Scope

- 本地 CLI、Dashboard、桌面包和本 fork 的 GitHub Actions 对云地址与 anon key 的配置。
- 个人实例的数据上传进度、设备登录及根目录用量上传/聚合验证。
- 保留本地统计、解析、queue 格式与现有 InsForge 接口契约。
- 为已核实为空的个人实例提供基础 schema、依赖的 RPC、edge functions 与服务端密钥部署路径。

### Out of Scope

- 自研同步后端或更换 InsForge SDK。
- 将上游账号、令牌或数据库数据直接迁往个人实例；历史仅以本机仍保留的 queue 为准。
- 将本 fork 的公开站点和 GitHub Release 实际上线。

## Success Criteria

- SC-001: 无个人实例配置时，任何登录、同步、读取路径都不请求上游 InsForge 域名。
- SC-002: 配置个人实例后，本地既有历史可上传至该实例，重复同步幂等。
- SC-003: 多 Codex 与 DSH roots 的独立数据到达个人实例，私有视图可区分，公共汇总各计一次。

## Dependencies and Constraints

- 个人实例 `8g8s7g8b.ap-southeast.insforge.app` 已绑定 CLI。2026-09-22 检查确认 `tokentracker_*` 表、已应用 migrations 与 edge functions 均为空；现有首条迁移因缺少 `tokentracker_user_badges` 失败，因此必须补建基础 schema。
- 真实登录仍需 OAuth redirect 或启用邮件认证；管理员密钥只能留在服务端或本机未跟踪配置。
- 按 `CLAUDE.md`，`src/` 或 `dashboard/` 修改的正式发布涉及 npm 和三端桌面包；本 change 不自动发布。
- `002` 与 `004` 已实现本地 root 行，并处于 `ready_to_archive`；本 change 不归档它们。

## Open Questions

- OAuth provider 凭据和个人 Dashboard 域名尚未提供；此 change 先完成数据库、函数与邮件认证可验证链路，OAuth provider 后续需单独配置。
