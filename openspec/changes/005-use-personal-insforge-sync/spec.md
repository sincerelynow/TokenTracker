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

### Requirement: REQ-005 本地 Dashboard 使用运行时云配置登录

系统 SHALL 在本地 Dashboard 启动时读取 CLI 配置中的有效 HTTPS `baseUrl` 与公开 `anonKey`，并允许用户从“设置 → 账户”登录，无需 `VITE_INSFORGE_*` 构建配置；缺失任一配置时 SHALL 禁用云登录。远程托管 Dashboard SHALL 继续使用显式构建配置。

#### Scenario: 仅配置本地 config.json

- **Given** Dashboard 构建未注入 `VITE_INSFORGE_*`，CLI `config.json` 包含有效 `baseUrl` 与 `anonKey`
- **When** 用户打开本地 Dashboard 的“设置 → 账户”
- **Then** 登录入口可用，认证请求使用该个人实例
- **And** 修改本地配置后刷新页面即可读取新配置，无需重建 Dashboard

#### Scenario: 本地配置不完整

- **Given** CLI `config.json` 缺少有效 HTTPS URL 或公开 anon key
- **When** 用户打开本地 Dashboard
- **Then** 云登录保持禁用，且不得使用旧构建配置连接其他实例

#### Scenario: 远程托管 Dashboard

- **Given** Dashboard 在非本地地址托管
- **When** 用户打开账户页面
- **Then** 登录能力由显式 `VITE_INSFORGE_BASE_URL` 与 `VITE_INSFORGE_ANON_KEY` 决定

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
- 本地 Dashboard 的运行时配置仅包含公开 URL/key；远程托管 Dashboard 的构建配置机制保持兼容。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | 未配置个人实例、配置个人实例 | AC-001 |
| REQ-002 | 旧实例已有上传偏移 | AC-002 |
| REQ-003 | 同小时多 root 用量 | AC-003 |
| REQ-004 | 首次部署与重复核对 | AC-004 |
| REQ-005 | 仅配置本地 config.json、本地配置不完整、远程托管 Dashboard | AC-005 |

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

### Acceptance Criterion: AC-005 本地配置即可登录

- **Covers** REQ-005 / 仅配置本地 config.json、本地配置不完整、远程托管 Dashboard
- **Preconditions** 无 `VITE_INSFORGE_*` 的 Dashboard 构建；临时 CLI 配置分别提供完整和不完整的 URL/key；远程托管场景提供显式构建配置。
- **Action** 启动本地服务并打开“设置 → 账户”，修改配置后刷新页面；分别检查不完整配置和远程托管场景。
- **Expected Result** 完整配置时登录入口启用且目标为配置的个人实例；刷新后读取更新值；不完整配置时登录禁用且公开配置接口不返回私密字段；远程托管仍按构建配置工作。
- **Verification** VER-008, VER-009
