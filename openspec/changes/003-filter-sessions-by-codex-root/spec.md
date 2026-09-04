# Codex Session Root Filtering Specification

## Requirements

### Requirement: REQ-001 保留 Codex 会话的 root 身份

系统 SHALL 在本地 session browser 的 Codex 会话行中保留该会话所属 root 的稳定实例 key 与显示 label，同时保持 `source` 为 `codex`。

#### Scenario: 多 root 会话获得独立身份

- **Given** 已配置两个具有不同稳定 key 与 label 的 Codex roots，且每个 root 都包含一个有效会话
- **When** 本地 session browser 完成扫描并返回会话列表
- **Then** 两个会话的 `source` 都为 `codex`
- **And** 两个会话分别带有对应的 `source_instance` 与 `instance_label`

#### Scenario: 跨 root 重复 session 确定性归属

- **Given** 同一 session ID 的文件出现在多个已配置 Codex roots
- **When** 本地 session browser 扫描并合并这些文件
- **Then** 该逻辑会话只返回一次
- **And** 其实例身份归属配置顺序中的第一个 root

### Requirement: REQ-002 按 Codex root 筛选会话

系统 SHALL 在用户选择 Codex provider 且当前数据包含至少两个不同 Codex 实例时，显示一个动态二级筛选，并按所选实例过滤会话。

#### Scenario: CODEX ALL 显示全部 Codex 会话

- **Given** 当前列表包含至少两个带不同 `source_instance` 的 Codex 会话
- **When** 用户选择 Codex provider 和 `CODEX ALL`
- **Then** 列表显示所有符合其他活动条件的 Codex 会话
- **And** 不显示 Claude 或 Grok 会话

#### Scenario: 选择单个 Codex root

- **Given** 当前列表包含 `CODEX` 与 `CODEX_IPC` 两个实例的会话
- **When** 用户选择 Codex provider 下的 `CODEX_IPC`
- **Then** 列表只显示 `source_instance` 对应 `CODEX_IPC` 的 Codex 会话
- **And** 日期、项目和搜索条件继续与该实例条件组合生效

#### Scenario: 单 root 隐藏冗余筛选

- **Given** 当前列表只有一个可识别的 Codex 实例
- **When** 用户选择 Codex provider
- **Then** 页面不显示 Codex root 二级筛选
- **And** Codex provider 筛选继续显示该实例的全部会话

### Requirement: REQ-003 保持兼容性与本地隐私边界

系统 SHALL 兼容缺少实例字段的旧 Codex 会话，重建旧 sidecar 缓存，并且不得把新增 root 元数据扩展到非本地浏览器输出。

#### Scenario: 旧 Codex 行缺少实例字段

- **Given** session browser 数据中存在 `source: codex` 但没有 `source_instance` 的会话
- **When** 用户选择 Codex provider
- **Then** 该会话仍显示在 Codex 结果中和 `CODEX ALL` 结果中
- **And** 页面不会为缺失身份构造虚假的实例选项

#### Scenario: sidecar 与 root 配置变化保持一致

- **Given** sidecar 来自旧版本，或 Codex root 的稳定 key、label、配置顺序发生变化
- **When** session analytics 再次构建会话数据
- **Then** 缓存身份被重新计算且返回当前 root 元数据
- **And** 不复用会造成旧实例归属或旧 label 的缓存行

#### Scenario: root 元数据不越过浏览器边界

- **Given** Codex 会话来自自定义绝对路径
- **When** 分别生成本地 session browser 响应、session insights 响应与 CSV
- **Then** browser 行只新增 opaque `source_instance` 和 `instance_label`，不新增 root path 字段
- **And** session insights 与 CSV 不包含新增 root 实例字段或 Codex root 绝对路径

## Behavior

### Inputs

- 已配置 Codex root records：`{ path, key, label }[]`，顺序具有重复 session 归属优先级。
- 本地 session browser 行的可选字段：`source_instance` 与 `instance_label`。
- Sessions 页面现有 provider、日期、项目和搜索筛选状态。

### Outputs

- Codex browser rows 保持 `source: codex`，并在身份可用时输出 `source_instance: <root-key>` 与 `instance_label: <root-label>`。
- 多实例 Codex 数据显示 `CODEX ALL` 和按实例 label 命名的二级筛选。
- 选择具体实例后，只改变 Sessions 列表及其结果计数，不改变原始数据或服务端查询。

### Errors and Edge Cases

- root 身份缺失的旧行归入 Codex provider 与 `CODEX ALL`，但不生成具体实例选项。
- 选中的实例在刷新后消失时，筛选回退到 `CODEX ALL`，避免产生不可解释的空结果。
- label 冲突沿用 Codex root resolver 的冲突消解结果，UI 不自行根据路径推导名称。
- 跨 `sessions/` 与 `archived_sessions/` 或跨 roots 的同 ID 文件继续只形成一个逻辑会话。

### Compatibility

- `SessionRow.source`、local endpoint URL、请求参数、token/cost 统计、thread lineage 与 resume command 保持兼容。
- 新字段为可选字段，旧 local server 响应仍可由新 Dashboard 展示。
- 非 Codex provider 的筛选和行渲染行为不变。
- 不产生数据库、云端 API、上传格式、配置格式或环境变量变更。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 多 root 会话获得独立身份；跨 root 重复 session 确定性归属 | AC-001, AC-002 |
| REQ-002 | CODEX ALL 显示全部 Codex 会话；选择单个 Codex root；单 root 隐藏冗余筛选 | AC-003, AC-004 |
| REQ-003 | 旧 Codex 行缺少实例字段；sidecar 与 root 配置变化保持一致；root 元数据不越过浏览器边界 | AC-005, AC-006 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 多 root 身份传播

- **Covers** REQ-001 / 多 root 会话获得独立身份
- **Preconditions** 临时 home 配置两个带不同 key/label 的 Codex roots，两个 roots 各有一个可计费会话
- **Action** 强制构建 session analytics 并调用 `listSessionsForBrowser`
- **Expected Result** 返回两个 `source: codex` 行，且各自的 `source_instance`、`instance_label` 与所属 root record 一致
- **Verification** VER-001

### Acceptance Criterion: AC-002 重复 session 只归属第一个 root

- **Covers** REQ-001 / 跨 root 重复 session 确定性归属
- **Preconditions** 两个有序 Codex roots 包含同一 session ID 的相同或可合并 rollout
- **Action** 强制构建 session analytics 并读取 browser rows
- **Expected Result** 只返回一个逻辑会话，实例字段等于配置顺序中的第一个 root，token 不重复累计
- **Verification** VER-001

### Acceptance Criterion: AC-003 多实例筛选正确组合

- **Covers** REQ-002 / CODEX ALL 显示全部 Codex 会话；选择单个 Codex root
- **Preconditions** Sessions 页面加载 Claude、Grok、`CODEX` 和 `CODEX_IPC` 会话，Codex 行带不同实例 key
- **Action** 依次选择 Codex、`CODEX ALL`、`CODEX_IPC`，并叠加项目或搜索条件
- **Expected Result** `CODEX ALL` 显示全部且仅 Codex 会话；`CODEX_IPC` 只显示对应实例，叠加条件继续缩小结果且计数一致
- **Verification** VER-002, VER-006

### Acceptance Criterion: AC-004 单实例和失效选择行为

- **Covers** REQ-002 / 单 root 隐藏冗余筛选；REQ-003 / 旧 Codex 行缺少实例字段
- **Preconditions** 分别提供单实例数据、缺少实例字段的旧 Codex 数据，以及刷新后移除当前所选实例的数据
- **Action** 渲染 Sessions 页面、选择 Codex，并触发对应数据刷新
- **Expected Result** 单实例和仅旧数据均不显示二级筛选；旧 Codex 行仍可见；所选实例消失时回退 `CODEX ALL`
- **Verification** VER-002

### Acceptance Criterion: AC-005 sidecar 元数据与配置同步

- **Covers** REQ-003 / sidecar 与 root 配置变化保持一致
- **Preconditions** 存在旧 sidecar，或已有缓存后改变 root key、label 或配置顺序
- **Action** 以非 force 模式再次构建 session analytics
- **Expected Result** 旧版本缓存被重建，root 元数据变化参与缓存身份判断，browser rows 不保留旧归属或旧 label
- **Verification** VER-001

### Acceptance Criterion: AC-006 隐私和兼容输出

- **Covers** REQ-003 / root 元数据不越过浏览器边界
- **Preconditions** 自定义 Codex root 的绝对路径、key、label 和有效会话均已配置
- **Action** 生成 browser rows、`summarizeSessions` 结果与 `sessionsToCsv` 输出，并执行 Dashboard 类型检查/构建与文案校验
- **Expected Result** browser rows 仅新增可选 key/label 且无 root path 字段；insights/CSV 不包含新增实例字段或 root 绝对路径；构建和文案校验退出码为 0
- **Verification** VER-001, VER-003, VER-004, VER-005
