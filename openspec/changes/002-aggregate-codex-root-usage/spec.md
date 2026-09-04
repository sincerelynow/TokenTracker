# Codex Root Usage Aggregation Specification

## Requirements

### Requirement: REQ-001 稳定识别配置目录

系统 SHALL 为每个有效 Codex root 分配稳定且唯一的统计标识，并且统计载荷不得包含 root 绝对路径。

#### Scenario: 多个不同目录

- **Given** 用户配置 `.codex` 与 `.codex-ipc` 两个有效 root
- **When** 系统保存配置并执行同步
- **Then** 两个 root 的用量进入不同统计标识
- **And** 统计标识和上传数据不包含两个 root 的绝对路径

#### Scenario: 显示名称冲突

- **Given** 两个 root 的目录 basename 相同
- **When** 系统规范化配置
- **Then** 两者获得不同的持久化统计标识和可区分显示名称

### Requirement: REQ-002 分别统计每个 Codex root

系统 SHALL 在相同 model 和 hour 内保留不同 Codex root 的独立累计桶，且跨 root 的同一会话副本不得重复计数。

#### Scenario: 同小时不同 root

- **Given** 两个配置 root 在同一半小时内使用相同模型并各自产生用量
- **When** 同步完成
- **Then** 本地 queue、project queue 与上传批次均保留两个独立累计桶
- **And** 两个桶的 token 合计等于两边真实增量之和

#### Scenario: 跨 root 重复会话

- **Given** 同一个 Codex session 文件同时存在于两个配置 root
- **When** 执行全量同步
- **Then** 事件身份去重只计一次
- **And** 归属由配置顺序确定并保持可重复

### Requirement: REQ-003 展示目录卡片和汇总卡片

系统 SHALL 为有用量的 Codex root 展示独立卡片，并在至少两个 root 有用量时额外展示一个 `CODEX ALL` 汇总卡片。

#### Scenario: 多 root 卡片

- **Given** `.codex` 和 `.codex-ipc` 在选定范围内均有用量
- **When** 用户打开 Usage Overview
- **Then** 用户可见 `CODEX`、`CODEX_IPC` 和 `CODEX ALL` 三张卡片
- **And** provider 分布、All Tools 与总 token 只计算每个底层 root 一次

#### Scenario: 卡片下钻

- **Given** 多 root 卡片已显示
- **When** 用户点击 `CODEX_IPC`
- **Then** 展开区域只显示 `.codex-ipc` 的模型、tokens、cost 和可用的上下文明细
- **When** 用户点击 `CODEX ALL`
- **Then** 展开区域显示全部 Codex root 合并后的模型、tokens、cost 和上下文明细

#### Scenario: 单 root

- **Given** 选定范围内只有一个 Codex root 有用量
- **When** 用户打开 Usage Overview
- **Then** 仅显示该 root 的 Codex 卡片
- **And** 不显示数值完全重复的 `CODEX ALL` 卡片

### Requirement: REQ-004 保持 Codex family 语义

系统 SHALL 将所有 Codex root 统计标识视为 Codex provider family，同时只在私有用量明细中区分 root。

#### Scenario: 定价与公共统计

- **Given** 任意 Codex root 产生带 reasoning 和 cache tokens 的用量
- **When** 本地及云端计算费用、账户汇总和排行榜 provider breakdown
- **Then** 使用与 `source: codex` 相同的定价和 reasoning 规则
- **And** 排行榜只呈现聚合 Codex，不公开 root 名称

### Requirement: REQ-005 兼容并迁移既有数据

系统 SHALL 继续读取旧配置与旧 Codex 行，并通过一次可重试重建避免新旧桶重复计算。

#### Scenario: 旧字符串配置

- **Given** `config.json.codexHomes` 为 `string[]`
- **When** 新版本解析或保存配置
- **Then** 原目录集合与顺序保持不变
- **And** 保存后生成稳定实例元数据且保留其他 config 字段

#### Scenario: 可恢复历史

- **Given** 旧 `source: codex` 历史已合并且对应 rollout 文件仍存在
- **When** 首次符合条件的全量同步执行迁移
- **Then** 旧累计桶被零值撤回并按 root 重建
- **And** 中断后再次同步可安全重试且不重复计数

#### Scenario: 不可恢复历史

- **Given** 部分旧历史对应的 rollout 文件已不存在
- **When** 执行迁移
- **Then** 不把无法证明归属的数据任意分配给某个 root
- **And** 该部分以 legacy Codex 聚合数据保留并在汇总卡中计入一次

## Behavior

### Inputs

- Codex roots 数量为 1 至 16；每项包含有效目录路径，旧版 `string[]` 仍是合法输入。
- Usage Overview 使用现有 period、from、to 和 device scope。

### Outputs

- 私有 model-breakdown 数据可表达 Codex family totals、每个 root totals 和各自 models。
- UI 输出每 root 卡片及条件式 `CODEX ALL` 汇总卡片。
- 公共排行榜输出仍只有 `codex` provider。

### Errors and Edge Cases

- 空、重复、文件系统根或超限配置继续使用现有错误语义拒绝。
- 统计标识冲突必须确定性消解，不能合并两个不同 root。
- root 被移除后停止新扫描，既有历史保留。
- 旧客户端读取内部实例 source 时不得导致 ingest 失败或总量丢失。

### Compatibility

- `codexHomes: string[]`、`CODEX_HOME` 与默认 `~/.codex` fallback 保持兼容。
- 不修改云端表结构或 ingest endpoint 形状；未携带实例信息的旧行按 legacy Codex 处理。
- 现有非 Codex provider 的 API 和卡片行为不变。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 多个不同目录；显示名称冲突 | AC-001 |
| REQ-002 | 同小时不同 root；跨 root 重复会话 | AC-002 |
| REQ-003 | 多 root 卡片；卡片下钻；单 root | AC-003, AC-004 |
| REQ-004 | 定价与公共统计 | AC-005 |
| REQ-005 | 旧字符串配置；可恢复历史；不可恢复历史 | AC-006 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 root 身份稳定且不泄露路径

- **Covers** REQ-001 / 多个不同目录、显示名称冲突
- **Preconditions** 临时 HOME 下存在两个 basename 相同及两个 basename 不同的有效 Codex roots
- **Action** 通过 roots API 保存、重新加载并检查生成的配置与待上传 bucket
- **Expected Result** 每个 root 的统计标识在重载后不变且互不相同，任何 queue/HTTP payload 均不包含绝对路径
- **Verification** VER-001, VER-003, VER-007

### Acceptance Criterion: AC-002 同粒度 root 桶独立且副本去重

- **Covers** REQ-002 / 同小时不同 root、跨 root 重复会话
- **Preconditions** 两个 root 含同模型同半小时的不同 session，并另有一个跨 root 重复 session fixture
- **Action** 连续执行两次 sync 并读取 latest queue rows
- **Expected Result** 不同 session 分别归属两个 root；重复 session 只计一次；第二次 sync 不改变合计
- **Verification** VER-002, VER-003

### Acceptance Criterion: AC-003 多 root 与汇总卡正确展示

- **Covers** REQ-003 / 多 root 卡片、单 root
- **Preconditions** model-breakdown fixture 含两个有用量 Codex roots 及一个非 Codex provider
- **Action** 渲染 Usage Overview 并读取卡片、分布和总量
- **Expected Result** 多 root 时出现 `CODEX`、`CODEX_IPC`、`CODEX ALL`，单 root 时不出现 `CODEX ALL`；总量和分布不重复计算
- **Verification** VER-004, VER-007

### Acceptance Criterion: AC-004 每张卡片下钻范围正确

- **Covers** REQ-003 / 卡片下钻
- **Preconditions** 两个 Codex roots 分别包含不同模型和上下文明细
- **Action** 依次点击 `CODEX_IPC` 与 `CODEX ALL`
- **Expected Result** 实例卡仅显示自身模型和上下文，汇总卡显示去重合并后的全部模型和上下文
- **Verification** VER-004, VER-005, VER-007

### Acceptance Criterion: AC-005 Codex family 语义一致

- **Covers** REQ-004 / 定价与公共统计
- **Preconditions** 本地和 cloud fixtures 含两个 Codex root source keys、reasoning tokens 和 cache tokens
- **Action** 运行本地/edge 聚合、费用与排行榜测试
- **Expected Result** 各 root 费用规则与 Codex 一致，账户总量包含两者一次，公共 provider breakdown 仅产生一个 `codex`
- **Verification** VER-003, VER-006

### Acceptance Criterion: AC-006 旧数据迁移可重试且不重复

- **Covers** REQ-005 / 旧字符串配置、可恢复历史、不可恢复历史
- **Preconditions** fixture 含旧 `codexHomes: string[]`、旧合并 buckets、部分存在和部分缺失的 rollout 历史
- **Action** 执行迁移 sync，中断点恢复后再次执行，并读取本地及上传 latest rows
- **Expected Result** 可恢复数据按 root 重建且旧桶被撤回，不可恢复数据只在 legacy 汇总中保留一次，重复执行结果相同
- **Verification** VER-001, VER-002, VER-003
