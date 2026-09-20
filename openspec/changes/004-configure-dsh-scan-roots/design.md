# Design: 配置 DeepSeek Harness 多扫描目录

## Context

已验证事实：

- `src/lib/rollout.js` 中 `resolveDshHome()` 只解析一个显式 home；`resolveDshHomes()` 仅在 Windows 无 override 时通过现有 WSL contract 返回 native/WSL union。
- `resolveDshSessionFiles()` 遍历每个 resolved home 的 `sessions` 树，选择每个 session 目录中活动的 `session[.vN].jsonl[.zstd]` artifact，当前仅以绝对文件路径去重。
- `parseDshIncremental()` 以 `cursors.dsh.files` 和 `cursors.dsh.sessions` 保存 watermark 与 contribution ledger，所有 bucket 均写为 `source: dsh`。
- sync 与 status 直接调用 rollout exports；当前没有 DSH roots 配置 manager、本地 API 或 Dashboard Settings 控件。
- Codex 已有 `codex-roots.js`、授权 local API、Dashboard hook/component 和相关测试，可作为交互与安全契约参考。
- 规划前基线命令 `node --test test/deepseek-harness.test.js test/deepseek-harness-migration.test.js test/local-api-codex-roots.test.js test/codex-roots.test.js` 通过 43/43。

Revision 2 决策：用户明确要求 Codex 风格的 root 用量拆分与汇总卡，因此 DSH root identity 进入私有统计 source；公开 provider family 和路径隐私保持不变。

## Architecture

```text
config.json.dshHomes ─┐
DSH env/default/WSL ──┴─> dsh-roots manager ─> ordered root records + stable key/label
                                             ├─> local roots API ─> Settings UI
                                             ├─> sync ─> discovery ─> DSH parser ─> dsh-root:<key>
                                             ├─> status
                                             └─> diagnostics
private model breakdown ─> root cards + synthetic DSH ALL
public aggregation ─> canonical dsh family
```

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| DSH roots manager | 配置读取、校验、规范化、稳定 key/label、去重、fallback 和原子保存 | Add |
| DSH discovery/parser | 跨 roots 枚举 artifacts、确定 duplicate owner、保持 ledger 兼容 | Modify |
| Sync/status/diagnostics | 统一消费 root state 并报告错误/检测状态 | Modify |
| Local API | 受保护地读取和保存 roots | Modify |
| Dashboard API/hook/component | 本地 Settings 管理多个 roots | Add/Modify |
| DSH source helper / model breakdown | family canonicalization、root 卡片与 `DSH ALL` | Add/Modify |
| Copy/locales/docs | 用户可见说明与兼容契约 | Modify |
| Tests | manager、API、parser、消费者、UI、隐私和兼容回归 | Add/Modify |

## Data Flow

1. Resolver 读取 `config.json`；存在非空 `dshHomes` 时将其作为完整显式集合，否则进入原有 env/default/Windows-WSL fallback。
2. Manager 展开 `~/`、拒绝不安全路径、通过 realpath/平台大小写规则去重，并产生有序 root records 与 sessions 探测状态。
3. sync 将 records 传给 DSH discovery；discovery 保留 root 顺序和 artifact identity，parser 按 session header identity 建立唯一 owner。
4. parser 复用现有 file/session contribution ledger 更新 `dsh-root:<key>` buckets；仅稳定 key 进入 source，root path 不进入 queue row。
5. local API 复用 local authorization，在读取/保存后返回 root state；Dashboard hook 将状态交给 Settings component。
6. status 与 diagnostics 使用同一 resolver，确保用户看到的目录与 sync 实际扫描目录一致。
7. 私有 model breakdown 保留 root sources；Dashboard 从底层 root rows 合成 `DSH ALL`，合成卡不参与 headline/provider distribution；公共聚合将 root sources 折叠为 `dsh`。

## Technical Decisions

### Decision: 使用独立 `dsh-roots` manager，而不泛化 Codex manager

- **Choice:** 新增 DSH 专用 manager，复用 Codex 的契约和底层原子写/权限工具，但不把两个 provider 强行抽象为通用 roots 框架。
- **Reason:** DSH 的 env 优先级、Windows override 语义、session 子目录和 duplicate identity 与 Codex 不同；局部实现能降低 Codex 回归面。
- **Alternatives:** 参数化重构 `codex-roots.js`；直接让 `TOKENTRACKER_DSH_HOME` 接受路径分隔列表。前者扩大既有功能风险，后者缺乏可靠跨平台转义、UI 和持久化契约。

### Decision: 持久化配置是完整集合，fallback 只在未配置时启用

- **Choice:** `dshHomes` 非空时优先且不额外附加 env/default/WSL roots；无配置时保持当前行为。
- **Reason:** 用户保存多个 roots 后应得到可预测、可审计的扫描边界，同时避免 Windows 自动 root 在用户明确集合外重新出现。
- **Alternatives:** 配置集合后仍自动附加 WSL。该方案更“自动”，但会削弱显式配置的控制性并增加重复扫描。

### Decision: 使用内部 root namespace，同时保持 provider family 聚合

- **Choice:** root bucket 写入 `dsh-root:<stable-key>`，解析时依据 session header identity 和有序 root priority 选择 owner；公开聚合 canonicalize 为 `dsh`。
- **Reason:** 用户需要单 root 卡片和 `DSH ALL` 下钻；内部 source 复用现有唯一键，无需数据库 schema 变更，且稳定 key 不泄露绝对路径。
- **Alternatives:** 继续只写 `dsh` 无法拆分；新增数据库 instance 列会扩大 schema/RPC 迁移面。

### Decision: `DSH ALL` 仅在展示层合成

- **Choice:** 至少两个有用量 root 时，由 Dashboard 合成 `DSH ALL`；不持久化 aggregate row。
- **Reason:** 防止 headline、All Tools、上传及排行榜重复计数，与 Codex 已验证模式一致。

### Decision: API 与 UI 镜像 Codex roots 交互，但组件保持 provider-specific

- **Choice:** 增加 `/functions/tokentracker-dsh-roots`、独立 API client/hook/component，并在 Integrations settings 并列展示。
- **Reason:** 保持代码边界和文案清晰，避免为两个组件提前引入复杂的通用表单抽象。
- **Alternatives:** 立即抽象统一 `ScanRootsSettings`。可在两套行为稳定后单独重构。

## Data and API Design

- Configuration: `config.json` 新增 `dshHomes`，规范形式为 `{ "path": "<absolute-path>", "key": "<stable-key>", "label": "<display-label>" }[]`；读取兼容 `string[]` 和仅含 path 的对象。
- Local API: `GET|POST /functions/tokentracker-dsh-roots`；GET/POST 均要求现有 local authorization。POST body 为 `{ roots: [...] }`。
- Response: `{ ok, roots, configured, source, max_roots }`；每个 root 可包含 `path`、`origin`、`exists`、`has_sessions` 等仅本地字段。
- Queue: root rows 使用 `dsh-root:<key>`；cloud/database schema 不变。私有 breakdown 保留 root source，公共 breakdown 折叠为 `dsh`；root path 不序列化。
- Cursor: 尽量保持 `cursors.dsh.files` / `sessions` schema 向后兼容；如需 owner metadata，只添加可选字段并由旧状态惰性补全。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 多个自定义 Harness homes 不再漏计 | 增加配置、API 与 UI 代码 | 与已有 Codex 操作模型一致，用户可见收益明确 |
| 显式集合使扫描边界可预测 | 配置后不再自动附加新 WSL install | UI 可显示当前 roots，用户可主动加入目录 |
| 使用内部 root source 且保持 `dsh` family | 需审计私有/公共聚合与定价分支 | 复用 Codex 已验证模式并补齐 family parity 测试 |
| session identity 去重避免双计 | discovery/parser 需要更严格的 owner 规则 | token 正确性优先于最小改动 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 同一 session 在多个 roots 中出现导致重复或 owner 抖动 | High | root 顺序稳定、session identity owner、两次 sync 与替换恢复测试 |
| 新配置破坏 DSH_HOME 或 Windows/WSL 用户 | High | 仅在 `dshHomes` 存在时切换；覆盖完整 fallback matrix |
| 配置写入覆盖 machineId/proxy/telemetry 等字段 | High | fresh read + merge、atomic write、配置保留断言 |
| 本地 API 泄露绝对路径 | Medium | GET/POST 都复用 local authorization，非授权测试 |
| 路径进入 queue/upload | Medium | serializer fixture 对绝对路径做负向断言 |
| Dashboard roots 控件在非本地主机误显示 | Low | hook 复用 `isLocalDashboardHost()` gate |

## Rollout and Rollback

- **Rollout:** 先加入 manager 与消费者，再加入 local API/UI；默认没有 `dshHomes` 时行为不变。实施后依次运行定向 Node/Vitest、validators、完整 Node suite、Dashboard build 与本地人工验收。
- **Rollback:** 回退代码即可恢复原 resolver；若需要数据层回滚，可从 `config.json` 删除 `dshHomes` 以恢复 env/default/WSL fallback。该字段不改变 queue/cloud schema，已计数 rows 无需迁移。

## Open Questions

- None。
