# Design: 按 Codex 配置目录拆分并汇总用量

## Context

已验证事实：`src/lib/codex-roots.js` 已统一解析最多 16 个 roots；`src/commands/sync.js` 为每个 root 枚举 `sessions/` 和 `archived_sessions/`，但传给 parser 的 source 均为 `codex`。`src/lib/rollout.js`、local queue reader、上传 batch 和云端表均以 `(source, model, hour_start)` 为累计身份。Dashboard 的 model breakdown 与 Usage Overview 已按 source 生成可点击卡片。Codex 定价、reasoning 和上下文逻辑存在多处 `source === "codex"` 判断。

## Architecture

```text
codexHomes config
  -> root resolver: path + stable root key + display label
  -> sync discovery: parserSource=codex, statsSource=codex-root:<key>
  -> parser/event dedup: 保持 Codex family 规则
  -> local/project buckets + upload: statsSource 作为现有 source 唯一键
  -> local/cloud private model breakdown: 识别 codex-root family
  -> Dashboard: root cards + synthetic CODEX ALL card
  -> public leaderboard: fold codex-root:* back to codex
```

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| Codex root resolver | 配置、校验、探测 | 为每个 root 返回稳定 key 与显示 label，兼容旧 `string[]` |
| Codex source helper | provider family 语义 | 集中识别 `codex` 与保留前缀的 root source，提供 canonical source/label |
| Sync and rollout parser | 发现、去重、累计 | 分离 parser semantic source 与 bucket stats source |
| Queue readers/uploader | latest-row 去重与上传 | 将 stats source 纳入现有 source 键，无需数据库 schema 变化 |
| Local/cloud breakdown | 私有 source/model 聚合 | 保留 root sources 并提供 Codex family 元数据 |
| Dashboard model builder | 卡片数据模型 | 生成 root 卡片和不参与二次总计的 synthetic aggregate card |
| Context breakdown | Codex 上下文明细 | 支持 all-roots 和单 root filter |
| Public aggregation | 排行榜 provider 汇总 | 将内部 root source canonicalize 为 `codex` |

## Data Flow

1. resolver 将旧字符串或新对象配置规范化为 `{ path, key, label }`；key 持久化且不含绝对路径，label 默认由 basename 生成，冲突时追加短标识。
2. sync 为 rollout entry 同时携带 `source: codex` 和 `statsSource: codex-root:<key>`；前者控制 Codex parser/dedup，后者只控制小时桶和 project 桶归属。
3. queue 继续使用现有 `source` 字段承载内部 stats source，因此现有云端唯一键自然区分 roots；绝对路径永不进入 queue 或 HTTP payload。
4. 私有 model-breakdown 标记这些 sources 属于 Codex family；Dashboard 以底层 root rows 计算总量和分布，再额外构造 `CODEX ALL` 展示数据，synthetic row 不进入总量计算。
5. 公共 leaderboard/provider breakdown 在聚合前把 `codex-root:*` 折叠为 `codex`。
6. 一次性迁移撤回可重建范围内的 legacy `codex` buckets，清理相应 cursor/event state 后从 byte zero 按 root 重扫；缺失文件对应的 legacy 差额保留为 `codex`，汇总时与 root rows 相加一次。

## Technical Decisions

### Decision: 使用内部 source namespace 而非数据库新增维度

- **Choice:** root bucket 使用 `codex-root:<opaque-key>`，Codex family 由统一 helper 解析。
- **Reason:** 现有本地和云端唯一键已经包含 source，可无破坏地保存实例；避免修改 `tokentracker_hourly` 唯一约束及所有 account RPC hot paths。
- **Alternatives:** 新增 `source_instance` 数据库列；语义更显式，但需要数据库约束迁移、RPC/cache/rollup 全链路升级及旧客户端双写，风险与目标不成比例。把 basename 直接当 provider source；会泄露命名、产生冲突并破坏 Codex 专属规则。

### Decision: parser source 与 stats source 分离

- **Choice:** parser 仍接收逻辑 `codex`，只有 bucket/project attribution 使用 root stats source。
- **Reason:** fork replay、event dedup 和 Codex normalization 必须保持现有语义；将整个 parser source 改为实例值会漏掉大量严格相等分支。
- **Alternatives:** 全局把所有 `source === codex` 改成前缀判断；影响面更大且容易遗漏。

### Decision: 汇总卡只在展示模型中合成

- **Choice:** 不写入 aggregate bucket；Dashboard 从 root rows 与 legacy Codex row合成 `CODEX ALL`。
- **Reason:** 同时持久化实例和汇总会让 headline、All Tools、日报及排行榜重复计数。
- **Alternatives:** 服务端返回重复 aggregate source；所有消费者都必须理解并排除，兼容性差。

### Decision: root key 持久化且路径私有

- **Choice:** 新配置项保存 `{ path, key, label }`，API 继续接受旧 `string[]`；key 由 resolver 创建并持久化，上传只携带带 key 的内部 source。
- **Reason:** 数组位置和 label 都可变化，不能作为历史身份；绝对路径属于本机隐私。
- **Alternatives:** 路径 hash；路径移动会改身份且可被字典猜测。数组 index；重排会串换历史。

### Decision: 确定性处理重复 session 归属

- **Choice:** 保持全局 Codex event dedup，按配置顺序扫描，重复 session 归属第一个 root。
- **Reason:** 同一 session 的复制或 archive 移动不能双计；配置顺序已有稳定含义。
- **Alternatives:** 每 root 独立 dedup；会重复计数。按最新 mtime 归属；重写文件会造成历史跳转。

## Data and API Design

- Configuration: `codexHomes` 从兼容输入 `string[]` 扩展为规范化对象数组 `{ path, key, label }[]`；GET roots 状态增加 `key`、`label`。
- Internal queue source: `codex-root:<key>`；legacy `codex` 仍合法并代表无法进一步归属的 Codex 聚合数据。
- Private model-breakdown source entry增加 `provider_family: "codex"`、`instance_key`、`instance_label`；非 Codex entry 保持现状。
- Context breakdown query 增加可选 `source_instance=<key>`；缺失时继续聚合全部 Codex roots。
- 不新增数据库字段，不上传 root path，不改变 ingest endpoint 的请求结构。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 无数据库 schema/RPC 唯一键迁移 | 内部 source 不再总是等于 provider family | 通过单一 helper 限制语义分叉 |
| 每 root 和汇总都可查看且不重复 | UI 需区分计量 rows 与 synthetic card | 数据模型显式标记 aggregate，易测试 |
| 保持路径隐私和稳定身份 | 配置由字符串升级为对象 | API 兼容旧输入，用户无需手动迁移 |
| 可拆分现有磁盘历史 | 首次全量同步开销较高 | 只执行一次、可重试，后台轻量 sync 不强制深扫 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 新内部 source 漏过 Codex 定价/reasoning 分支 | High | 集中 family helper；本地与五个 edge 定价/汇总 parity 测试 |
| 历史撤回后重建中断 | High | migration marker 分阶段提交；旧桶撤回与 cursor 清理可幂等重试 |
| legacy 差额与新 root rows 重复 | High | 重建算法记录可证明范围，只保留不可恢复差额；连续两次 sync 集成测试 |
| synthetic aggregate 被加入 headline/distribution | High | aggregate 标记 `isSyntheticAggregate`，总量只从底层 API rows计算 |
| root label 泄露敏感路径 | Medium | 只生成 basename 风格 label，payload 不含 path；安全测试扫描绝对路径 |
| 旧 Dashboard 显示内部 source 名 | Low | ingest 保持成功且总量正确；当前版本格式化实例卡，版本同步随统一 release 发布 |

## Rollout and Rollback

- **Rollout:** 先兼容读取旧配置/数据，再启用新 root sources；首次显式全量 sync 运行历史重建，轻量后台同步可先统计新增事件并保留待迁移标记。发布需按 `CLAUDE.md` 同步 npm 与三端版本。
- **Rollback:** 旧版本仍能读取 queue 中的新 source 并计入总量，但会按普通 provider 展示；删除新 migration marker 不会自动删除数据。若回滚业务代码，保留实例 rows，禁止重新写入 legacy aggregate 以免重复；恢复新版后可继续迁移。

## Open Questions

- None.
