# Change: 按 Codex 配置目录拆分并汇总用量

## Why

当前最多可配置 16 个 Codex 扫描目录，但同步阶段把所有目录统一写为 `source: codex`，导致 `.codex`、`.codex-ipc` 等目录在进入小时桶后不可区分。用户需要在现有 Usage Overview 中分别查看每个配置目录，并通过额外卡片查看所有 Codex 目录的汇总。

## What

- 为每个 Codex root 建立稳定、非路径泄露的统计来源标识，并按 root 生成独立用量。
- Dashboard 为每个有用量的配置 root 展示独立卡片；配置多个 root 时额外展示 `CODEX ALL` 汇总卡片。
- 汇总卡片合并所有 Codex root 的 tokens、cost 和 models，目录卡片只下钻自身数据。
- 兼容现有 `codexHomes: string[]` 配置、单 root 行为和云端现有表结构。
- 对升级前已合并的 Codex 历史执行一次可重试的撤回与全量重建；无法从磁盘恢复的历史明确保留为 legacy Codex 用量。

## Scope

### In Scope

- 本地和 account view 的 Codex root 独立统计与汇总展示。
- root 统计标识、显示名称、冲突消解和路径隐私规则。
- Codex parser、queue、project queue、上传批次和读取去重键的 root 归属传播。
- Codex 专属定价、reasoning、上下文拆分、图标及排行榜归类继续按 Codex family 处理。
- 旧配置、旧 queue 行和旧云端行兼容，以及可重试历史重建。

### Out of Scope

- 对 Claude、Cursor 或其他 provider 增加同类实例维度。
- 上传完整或部分 root 绝对路径。
- 在排行榜公开每个私人 Codex root 的名称或用量。
- 删除已从配置移除 root 的历史用量。
- 改变 Usage Overview 的总 token、总费用或时间范围语义。

## Success Criteria

- SC-001: `.codex` 与 `.codex-ipc` 同时产生用量时，Dashboard 显示两个目录卡片及一个不重复计数的 `CODEX ALL` 卡片。
- SC-002: 每个目录卡片的模型合计等于该目录用量，汇总卡片合计等于所有 Codex 目录之和。
- SC-003: 旧单 root 配置和旧 `source: codex` 数据仍可读取，且不会因升级重复计数。
- SC-004: 云端、排行榜和费用计算仍把所有目录归入 Codex provider family，且不上传绝对路径。

## Dependencies and Constraints

- queue 与云端 `tokentracker_hourly` 的既有唯一粒度是 `(source, model, hour_start)`；实现使用保留前缀的内部 source key 表达 root 实例，避免数据库 schema 迁移。
- append-only queue 的历史拆分只能依赖仍存在的 rollout 文件；缺失文件无法可靠反推 root 归属。
- 新增用户可见文案必须进入 `dashboard/src/content/copy.csv` 及全部现有 locale。

## Open Questions

- None. 规划默认汇总卡名称为 `CODEX ALL`，单 root 时不显示冗余汇总卡。
