# Design: 使用个人 InsForge 实例同步用量

## Context

已验证：`runtime-config.js`、`insforge-config.ts` 内置上游 URL/key；`init.js` 持久化默认 URL；`local-api.js` 和 `cloud-account.js` 有默认目标回退；多个 GitHub Actions 在构建时注入上游地址。`queue.jsonl` 上传由 `queue.state.json` 单一 offset 跟踪，切换目的地会跳过历史。`readQueueBatch` 已保留 `codex-root:*`，DSH root 由 OpenSpec 004 写入队列；云端 model breakdown 识别两类 root，排行榜将其折叠为 provider family。

目标实例已通过 CLI 精确匹配 appkey `8g8s7g8b`，远端 migrations/functions 列表与 `tokentracker_*` 表查询均为空。仓库迁移从已有 schema 起步，首条因 `tokentracker_user_badges` 不存在而失败；不能直接对空库运行 `up --all`。

## Architecture

本地解析与队列保持不变。CLI 运行时配置和 Dashboard 构建配置分别提供同一个人实例 URL/公开 key；两者缺失时云功能停止。认证仍用 InsForge SDK，上传仍用现有 ingest 契约。上传状态绑定规范化的实例 URL，切换实例重新发送本地 queue。云端继续部署现有 edge patches、数据库迁移与 RPC。

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| CLI 配置与初始化 | 确定上传/认证目标 | 移除上游默认值，校验个人实例配置 |
| Dashboard 配置与页面 | 登录、云读取 | 移除上游回退，未配置时禁用云入口 |
| 本地 API 与云账户代理 | 认证代理、跨设备读取 | 仅接受当前配置目标，不回退 |
| queue 上传 | 按偏移上传 | 进度按目标实例隔离并安全重放 |
| InsForge edge functions | ingest 与聚合 | 校验并补齐 root source 家族处理 |
| 基础 schema 与部署流程 | 空实例建库、增量迁移、函数上线 | 补充基础迁移和可核对部署清单 |
| 构建与文档 | 注入实例配置 | 移除上游地址、说明部署前提 |

## Data Flow

1. 用户在未跟踪的本地/构建配置提供个人实例 URL 和公开 key。
2. Dashboard 在个人实例登录、签发该实例的设备 token；CLI 上传本地 queue。
3. uploader 读取目标实例专属进度，成功上传后推进该进度；首次目标从零开始。
4. 个人实例按 `(user, device, hour, source, model)` 保存并聚合 root 行；私有视图保留 root，公共视图折叠为 family。

## Technical Decisions

### Decision: 无默认云目标

- **Choice:** 缺少完整有效配置时明确停用云功能。
- **Reason:** 避免意外连接上游实例，且不会影响本地优先功能。
- **Alternatives:** 直接替换为新的硬编码个人 URL；会使配置和后续合并继续脆弱。

### Decision: 目的地专属上传进度

- **Choice:** 对规范化 URL 单独维护上传 checkpoint，并在后端切换时重放本地 queue；设备 token 也需重新签发。
- **Reason:** 旧单一 offset 只能证明旧目的地已收到数据。
- **Alternatives:** 全局清零旧 offset；会破坏回滚或再次切换的恢复能力。

### Decision: 保留现有 InsForge 数据契约

- **Choice:** 继续使用现有 ingest、账户读 API 和 source 命名；部署时核对 root 支持。
- **Reason:** OpenSpec 002/004 已定义 root identity 与隐私边界，减少对解析器及 upstream 合并的改动。
- **Alternatives:** 新建同步协议；超出本次需求。

### Decision: 基础迁移先于现有增量迁移

- **Choice:** 新增版本早于 `20260714081616` 的基础迁移，建立原项目缺失的基础表、约束、索引、RLS 与最小 RPC 前置条件；随后按现有版本顺序运行增量迁移。复用仓库 `scripts/ops/` 中可审查的 SQL 定义。
- **Reason:** 目标是空库，而仓库现有迁移只覆盖后续变化；完整部署必须有可复现基线。
- **Alternatives:** 用临时 SQL 在远端手工建表；无法复现、审查或安全回滚。

## Data and API Design

- 基础迁移创建现有应用依赖的 `tokentracker_*` 表、访问控制与 RPC 前置对象；本地上传 checkpoint 增加目标实例身份，旧 checkpoint 视为旧目标的历史状态，不代表新实例完成。
- CLI: `TOKENTRACKER_INSFORGE_BASE_URL` / `TOKENTRACKER_INSFORGE_ANON_KEY`；Dashboard build: `VITE_INSFORGE_BASE_URL` / `VITE_INSFORGE_ANON_KEY`。服务端密钥不得进入这四项。
- `codex-root:<key>`、`dsh-root:<key>` 保持原有 queue 与 ingest 字段；不上传 root 路径。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 无上游隐式连接 | 新安装需显式配置 | 符合个人实例目标 |
| 可安全切换实例 | 首次重传可能较慢 | 不遗漏可用历史 |
| 维持同步兼容 | 个人实例需部署对应 schema/RPC/functions | 保留现有产品功能 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 后端缺 schema/RPC 或 edge functions | High | 部署清单、版本核对和真实实例验收 |
| URL/key 不一致或误用管理密钥 | High | 配置验证、公开 key 文档和无默认回退测试 |
| 切换时沿用旧 device token/offset | High | 绑定实例身份、重传和两次同步测试 |
| 上游合并重引入默认 URL | Medium | guardrail 扫描和 CI 测试 |
| 基础 schema 与既有增量迁移不匹配 | High | 按顺序验证，任何迁移失败立即停止并记录远端状态 |
| 服务端管理 key 暴露给浏览器 | High | 仅通过 CLI secret 写入 edge 环境，检查公开构建 |

## Rollout and Rollback

- **Rollout:** 核对 appkey 后，部署基础 schema、既有增量迁移/RPC、必要服务端 secrets 和 23 个 edge functions，再构建 Dashboard/桌面包，最后登录并触发历史同步。
- **Rollback:** 还原代码或配置后可恢复本地功能；各目的地 checkpoint 独立。个人实例中已上传的数据须按该实例的管理流程处理，不自动删除。

## Open Questions

- 个人实例 URL/key 已提供且 CLI 已绑定；个人 Dashboard 使用本机 `http://localhost:7680`，自有托管域名可在以后显式配置。OAuth provider 凭据未提供；真实账号登录和私有用量检查仍须本人完成认证。
