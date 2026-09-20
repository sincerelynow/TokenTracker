# DeepSeek Harness Multi-root Scanning Specification

## Requirements

### Requirement: REQ-001 可配置多个扫描目录

系统 SHALL 允许本地用户保存 1–16 个 DeepSeek Harness home，并在后续同步中扫描每个 home 的 `sessions` 树。

#### Scenario: 保存并重载多个 roots

- **Given** 本地 Dashboard 已通过 local authorization，且两个输入目录满足路径安全约束
- **When** 用户保存两个 DeepSeek Harness roots 并重新读取配置
- **Then** API 按确定性顺序返回两个规范化 roots
- **And** 下一次 sync 可发现两个 roots 中的合法 session artifacts

#### Scenario: 拒绝无效 roots

- **Given** 当前已有一份有效配置
- **When** 用户提交空数组、相对路径、文件系统根、不可接受的父目录或超过 16 个 roots
- **Then** API 返回可判定的 4xx 错误与稳定错误码
- **And** 原配置保持不变

### Requirement: REQ-002 保持 fallback 与平台兼容

系统 SHALL 在没有持久化 `dshHomes` 时保持现有 `TOKENTRACKER_DSH_HOME`、`DSH_HOME`、`~/.dsh` 及 Windows native/WSL 解析语义；持久化配置存在时 SHALL 作为完整、显式的 root 集合优先于环境 fallback。

#### Scenario: 未配置时沿用旧优先级

- **Given** `config.json` 不含有效 `dshHomes`
- **When** 系统解析 DeepSeek Harness homes
- **Then** `TOKENTRACKER_DSH_HOME` 优先于 `DSH_HOME`，二者均缺失时使用默认 home
- **And** Windows 下继续遵守 `TOKENTRACKER_WSL_MODE` 的 native/WSL matrix

#### Scenario: 持久化配置覆盖 fallback

- **Given** `config.json` 保存了多个 `dshHomes`，环境中同时存在 DSH home override
- **When** sync、status、diagnostics 或 roots API 解析 roots
- **Then** 四条路径使用同一份持久化 root 集合
- **And** 不额外混入环境变量或自动发现的 root

### Requirement: REQ-003 跨 root 去重且同步幂等

系统 SHALL 对规范化后指向同一物理目录的 roots 去重，并对多个 roots 中具有同一 Harness session identity 的 artifacts 确定唯一 owner，使同一 usage contribution 只累计一次。

#### Scenario: 重叠 roots 与复制 session

- **Given** 两个已配置 roots 通过 symlink/realpath 指向同一目录，或分别包含同一 session identity 的副本
- **When** 连续执行两次 sync
- **Then** 第一次只生成一份该 session 的贡献
- **And** 第二次不增加 token、conversation 或 queue duplicate

#### Scenario: owner artifact 暂时不可读

- **Given** 已计数 session 的 owner artifact 在后续同步中暂时缺失、损坏或处于不完整替换状态
- **When** 其他 root 暴露同一 session 的候选 artifact
- **Then** 系统遵循现有 contribution ledger 安全门禁，不在无法验证替换时重复增加贡献
- **And** 状态保持可重试并产生可诊断信息

### Requirement: REQ-004 提供受保护的本地管理界面

系统 SHALL 仅在本地 Dashboard 暴露 DeepSeek Harness roots 的读取与修改，并提供添加、删除、保存、重复校验、检测状态和错误反馈。

#### Scenario: 本地 Settings 管理 roots

- **Given** 用户打开本地 Dashboard 的 Integrations settings
- **When** roots API 可用
- **Then** 页面显示 DeepSeek Harness scan roots 控件及当前 roots 的 sessions 检测状态
- **And** 用户可添加、删除和保存 roots，保存中与成功/失败状态可被辅助技术识别

#### Scenario: 非授权请求

- **Given** 请求缺少有效 local authorization 或不满足 loopback origin 约束
- **When** 客户端读取或写入 DeepSeek Harness roots API
- **Then** API 返回 401
- **And** 不泄露已配置路径、不修改配置

### Requirement: REQ-005 保持统计与隐私契约

系统 SHALL 为各 root 使用稳定且不含路径的内部统计 identity，保持公开 provider family 为 `dsh`，且 SHALL NOT 将 root 绝对路径写入 queue、project queue 或网络上传 payload。

#### Scenario: 多 root 同步输出

- **Given** 多个 roots 分别包含不同 DeepSeek Harness sessions
- **When** sync 完成并形成 queue/upload rows
- **Then** 每条 usage row 使用对应的 `dsh-root:<key>`，公共聚合仍规范化为 `dsh`
- **And** serialized queue 与 upload payload 不包含任一 root 绝对路径

### Requirement: REQ-006 展示 root 用量卡与本地化界面

系统 SHALL 为有用量的 DSH roots 展示独立卡片，并在至少两个 roots 有用量时展示不参与总量二次计算的 `DSH ALL` 汇总卡；Settings 控件 SHALL 使用当前 locale 的文案。

#### Scenario: 两个 root 的用量卡

- **Given** 两个配置 roots 在选定时间范围内均产生用量
- **When** 用户打开 Usage Overview
- **Then** 显示两个可区分的 root 卡片和 `DSH ALL` 卡片
- **And** headline、All Tools 与 provider 分布只累计底层 root rows 一次

#### Scenario: root 与汇总下钻

- **Given** DSH root 卡片已显示
- **When** 用户点击单 root 卡片或 `DSH ALL`
- **Then** 分别显示该 root 或全部 DSH roots 的模型、tokens 与 cost

#### Scenario: 中文 Settings

- **Given** Dashboard locale 为简体中文
- **When** 用户打开 Integrations 中的 DSH roots 控件
- **Then** 标题、说明、按钮、检测状态、保存与错误反馈均为中文

## Behavior

### Inputs

- `roots`: 1–16 个字符串路径或兼容的 `{ path }` 记录；支持绝对路径和 `~/` 展开。
- fallback inputs: `TOKENTRACKER_DSH_HOME`、`DSH_HOME`、用户 home、`TOKENTRACKER_WSL_MODE`。
- session artifacts: 每个 root 下 `sessions/<project-key>/<session-id>/session[.vN].jsonl[.zstd]`。

### Outputs

- 本地 roots API 返回 `roots`、`configured`、`source`、`max_roots` 以及本地检测状态。
- sync/status/diagnostics 共享一致的 roots 解析结果；usage rows 使用 `dsh-root:<key>`，公共统计规范化为 `dsh`。
- `config.json` 保留其他字段并持久化规范化的 `dshHomes`。

### Errors and Edge Cases

- 空输入、相对路径、文件系统根、重复 realpath、数量超限、配置 JSON 损坏和不可读目录必须有确定性处理。
- 重复 root 被折叠；同 session 的跨 root 副本按 root 顺序确定 owner。
- 保存失败不得产生部分配置；单个 root 扫描失败不得阻止其他健康 roots 被处理。
- legacy cursor 缺少 root metadata 时仍可读取，不要求一次性破坏性迁移。

### Compatibility

- 没有 `dshHomes` 的现有用户保持当前行为。
- `TOKENTRACKER_DSH_HOME` 和 `DSH_HOME` 继续有效，但在存在已保存配置时不参与解析。
- queue source、cloud schema、legacy source migration 和现有 Dashboard provider display 不变。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 保存并重载多个 roots；拒绝无效 roots | AC-001 |
| REQ-002 | 未配置时沿用旧优先级；持久化配置覆盖 fallback | AC-002 |
| REQ-003 | 重叠 roots 与复制 session；owner artifact 暂时不可读 | AC-003 |
| REQ-004 | 本地 Settings 管理 roots；非授权请求 | AC-004 |
| REQ-005 | 多 root 同步输出 | AC-005 |
| REQ-006 | 两个 root 的用量卡；root 与汇总下钻；中文 Settings | AC-006 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 roots 可保存、重载和校验

- **Covers** REQ-001 / 保存并重载多个 roots、拒绝无效 roots
- **Preconditions** 临时 home/tracker 目录可写，本地 API 使用有效 authorization；准备两个有效 root 与一组无效输入
- **Action** 通过 roots manager 和本地 API 保存两个 roots、重新读取，再依次提交无效输入
- **Expected Result** 有效 roots 以规范化顺序持久化并保留 `config.json` 其他字段；无效输入返回 4xx/稳定错误码且文件内容不变
- **Verification** VER-001, VER-003

### Acceptance Criterion: AC-002 fallback 行为兼容

- **Covers** REQ-002 / 未配置时沿用旧优先级、持久化配置覆盖 fallback
- **Preconditions** 分别构造无配置、有环境 override、有持久化配置及 Windows native/WSL matrix fixture
- **Action** 调用统一 roots resolver，并通过 sync/status/diagnostics 消费解析结果
- **Expected Result** 无配置场景与变更前解析结果一致；有配置时只返回持久化 roots，所有消费者结果一致
- **Verification** VER-001, VER-002, VER-006

### Acceptance Criterion: AC-003 跨 root 只计一次且可恢复

- **Covers** REQ-003 / 重叠 roots 与复制 session、owner artifact 暂时不可读
- **Preconditions** 两个 roots 含相同 session identity 或同一物理目录，并准备可读、缺失、损坏和修复后的 artifacts
- **Action** 连续执行两次 incremental sync，再模拟 owner artifact 失败与恢复
- **Expected Result** usage contribution 始终只有一份，第二次同步为幂等；失败时不双计且 ledger 保持可重试，恢复后收敛到正确总量
- **Verification** VER-002, VER-006

### Acceptance Criterion: AC-004 本地 UI 与权限边界完整

- **Covers** REQ-004 / 本地 Settings 管理 roots、非授权请求
- **Preconditions** 本地 Dashboard 测试环境可 mock roots API，并准备授权与非授权 HTTP 请求
- **Action** 渲染 Settings、添加/删除/保存 roots并触发成功和错误响应，同时请求受保护 API
- **Expected Result** UI 正确展示和更新 roots、检测状态及可访问反馈；非授权 GET/POST 均为 401 且配置不变
- **Verification** VER-003, VER-004, VER-007

### Acceptance Criterion: AC-005 统计与路径隐私不变

- **Covers** REQ-005 / 多 root 同步输出
- **Preconditions** 两个临时 root 的绝对路径各含不同有效 sessions，并启用 queue/upload serialization 检查
- **Action** 执行 sync，读取 queue/project queue/upload payload 与 provider breakdown
- **Expected Result** rows 使用稳定 `dsh-root:<key>` 且公共 provider family 为 `dsh`，合计等于两个唯一 sessions 之和，所有序列化产物均不含 root 绝对路径
- **Verification** VER-002, VER-005, VER-006

### Acceptance Criterion: AC-006 root 卡片、汇总与本地化正确

- **Covers** REQ-006 / 两个 root 的用量卡、root 与汇总下钻、中文 Settings
- **Preconditions** 两个 roots 各含不同模型用量；Dashboard locale 为简体中文
- **Action** 渲染 Usage Overview 与 Settings，依次点击单 root 和 `DSH ALL`
- **Expected Result** 两个 root 卡与 `DSH ALL` 正确展示和下钻，总量不重复；DSH roots 控件全部使用中文
- **Verification** VER-003, VER-007, VER-008
