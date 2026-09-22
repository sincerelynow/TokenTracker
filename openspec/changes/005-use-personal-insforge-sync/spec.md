# Personal InsForge Sync Specification

## Requirements

### Requirement: REQ-001 云连接仅使用个人实例

系统 SHALL 仅在有效个人实例配置存在时提供云登录、上传和读取；未配置时 SHALL 保持本地统计可用且不得请求上游默认实例。

#### Scenario: 未配置个人实例

- **Given** CLI、Dashboard 和桌面构建未提供个人实例 URL 与 anon key
- **When** 用户打开仪表盘或执行本地同步
- **Then** 本地用量仍可读取，云登录和上传显示未配置状态
- **And** 网络请求不指向上游默认 InsForge 实例

#### Scenario: 配置个人实例

- **Given** 用户提供有效的个人实例 URL 与公开 anon key，后端功能已部署
- **When** 用户登录并启用云同步
- **Then** 认证、上传及账户读取只使用该实例

### Requirement: REQ-002 切换实例后重传历史

系统 SHALL 按实例隔离上传进度；首次使用新实例时，SHALL 从本地可用 queue 开始上传，并在成功响应后推进该实例进度。

#### Scenario: 旧实例已有上传偏移

- **Given** 本地 queue 在旧实例已上传，且新实例尚无上传记录
- **When** 新实例首次同步及紧接着再次同步
- **Then** 首次同步发送本地可用历史，第二次不重复增加云端用量
- **And** 旧实例的进度与数据保持独立

### Requirement: REQ-003 同步多 Codex 与 DSH roots

系统 SHALL 将各 root 的独立用量上传到个人实例，并在私有统计保留 root 维度；公共统计 SHALL 按 provider family 汇总且不得泄露本地绝对路径。

#### Scenario: 同小时多 root 用量

- **Given** 两个 Codex roots 和两个 DSH roots 在相同小时、模型下分别有用量
- **When** 完成上传并读取个人统计与公共汇总
- **Then** 私有结果保留四个独立 root 的准确用量
- **And** 公共结果分别归为 `codex` 与 `dsh`，每条底层用量只计一次
- **And** 上传载荷不含任何 root 绝对路径

### Requirement: REQ-004 空个人实例可重复部署

系统 SHALL 能在空个人 InsForge 实例建立应用基础 schema、运行仓库增量迁移、部署同步所需 RPC 与 edge functions，并保留用户数据与访问控制。

#### Scenario: 首次部署与重复核对

- **Given** 指定个人实例没有 `tokentracker_*` 表、已应用迁移或 edge functions
- **When** 按仓库部署流程完成首次部署并重新检查迁移与函数清单
- **Then** 同步所需表、RPC、函数可用，重复执行检查不会重复创建用量数据
- **And** 未认证用户无法直接读取或修改他人的私有用量

## Behavior

### Inputs

- 显式配置的 InsForge HTTPS URL、公开 anon key、可选个人 Dashboard URL，以及本地 queue 中的 usage rows。

### Outputs

- 云配置状态、个人实例上的用量和设备记录，以及不含绝对路径的 root 统计。

### Errors and Edge Cases

- 空值、无效 URL、URL/key 不一致或后端未部署时不得静默回退到默认实例。
- 切换实例不得复用旧设备令牌；上传失败不得推进新实例偏移。
- 本地 queue 已删除的历史不承诺恢复。

### Compatibility

- 本地 queue、现有 InsForge 函数路径和数据格式保持兼容；未配置个人实例的安装仅保留本地功能。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 未配置个人实例、配置个人实例 | AC-001 |
| REQ-002 | 旧实例已有上传偏移 | AC-002 |
| REQ-003 | 同小时多 root 用量 | AC-003 |
| REQ-004 | 首次部署与重复核对 | AC-004 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 个人实例隔离

- **Covers** REQ-001 / 未配置个人实例、配置个人实例
- **Preconditions** 使用临时用户目录和可记录请求目标的测试服务；分别准备无配置与个人实例配置。
- **Action** 启动本地服务、运行 sync、打开 Dashboard 并尝试云登录。
- **Expected Result** 无配置时本地用量可读且上游域名请求数为零；配置时认证/云请求目标均为个人实例。
- **Verification** VER-001, VER-004

### Acceptance Criterion: AC-002 独立上传进度

- **Covers** REQ-002 / 旧实例已有上传偏移
- **Preconditions** 临时 queue 有历史行且旧实例进度已达队列末尾，新实例可接收上传。
- **Action** 对新实例连续运行两次同步。
- **Expected Result** 首次收到完整可用历史，第二次总量不变；失败响应不推进新实例进度。
- **Verification** VER-002, VER-004

### Acceptance Criterion: AC-003 root 用量云端一致

- **Covers** REQ-003 / 同小时多 root 用量
- **Preconditions** 队列包含两个 Codex 和两个 DSH roots 的同小时用量，个人实例具备对应 edge functions 与 RPC。
- **Action** 上传后读取私有 model breakdown、账户汇总及公共汇总。
- **Expected Result** 私有结果含四个独立 root，账户与公共总量各只计一次，上传载荷不含绝对路径。
- **Verification** VER-003, VER-004

### Acceptance Criterion: AC-004 空实例部署和权限

- **Covers** REQ-004 / 首次部署与重复核对
- **Preconditions** CLI 已绑定 appkey `8g8s7g8b` 的空个人实例，具备项目管理授权。
- **Action** 应用基础和既有 migrations，部署函数，列出远端对象并执行匿名/用户身份的私有用量访问检查。
- **Expected Result** 所有必需 migrations 与函数在目标实例可见，核心登录/设备令牌/ingest/账户读取可调用；匿名私有读写被拒绝，重复核对不修改用户数据。
- **Verification** VER-007
