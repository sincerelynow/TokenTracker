# Account Usage Freshness Specification

## Requirements

### Requirement: REQ-001 持续自动发布

系统 已登录、云同步开启且存在新增本地用量时，账户视图 SHALL 自动发布并重读；页面持续停留无需导航或重启。

#### Scenario: S-001

- **Given** 已完成首次上传，保持本地 Dashboard 可见，随后队列新增记录
- **When** 等待自动检查，另测 focus、online 和本地统计完成事件
- **Then** 在无退避且服务可用时，60 秒内启动发布；无待上传数据时不发送 ingest；同一身份最多一个上传

### Requirement: REQ-002 一次手动刷新完成发布

系统 账户视图手动刷新 SHALL 先完成本地采集，再确认本次目标用量已上传，最后读取账户数据。

#### Scenario: S-002

- **Given** 已登录并开启云同步，工具日志新增已可解析用量
- **When** 点击一次 Dashboard 刷新或设置中的立即统计
- **Then** 在本次请求超时边界内，发布达到本次采集后的目标后显示新值，或明确显示未完成；不得要求再次点击；期间新产生的数据不得无限延长本次任务

### Requirement: REQ-003 准确区分上传结果

系统 系统 SHALL 区分本地采集成功、发布完成、发布部分完成和发布失败。

#### Scenario: S-003

- **Given** 模拟云端拒绝、超时、批次数上限、锁竞争和排队后账号变化
- **When** 执行手动和自动同步
- **Then** 仅确认目标上传完成才更新云成功时间并发送成功事件；失败/部分完成保留旧统计且标记未完成；到期后允许重试

### Requirement: REQ-004 上传后读取新数据

系统 已确认上传后的账户刷新 SHALL 读取不早于该上传完成的数据，并拒绝用旧缓存冒充成功。

#### Scenario: S-004

- **Given** 预热浏览器、代理、edge、数据库缓存并挂起一条旧请求，然后发布新增用量
- **When** 执行一次账户刷新并释放旧请求；另测新数据读取失败
- **Then** 六类账户聚合反映已确认发布；旧请求不得覆盖；新数据读取失败不以 stale-if-error 伪装刷新成功；普通浏览仍使用缓存

### Requirement: REQ-005 本地与身份隔离

系统 未登录或关闭云同步时 SHALL 保持本地统计独立；同步和读取结果 SHALL 绑定当前实例、账号和设备。

#### Scenario: S-005

- **Given** 分别使用退出登录、云开关关闭、不同账号、不同实例及两台设备
- **When** 产生用量并刷新；在请求进行时切换账号或关闭同步
- **Then** 本地可显示新值且不发起新云上传；旧身份结果不可发布到新视图；不会把本地值直接加到云总量造成重复计数

### Requirement: REQ-006 独立于页面的兜底发布

系统 运行中的本地服务 SHALL 在云同步已启用且凭据可用时提供不依赖页面导航的兜底发布。

#### Scenario: S-006

- **Given** CLI serve 无 native 同步所有者且关闭浏览器；另测 native 同步所有者存在
- **When** 新增本地日志并等待后台扫描周期
- **Then** CLI 每五分钟至多一次兜底采集/发布；native 已拥有调度时不得再启动第二套发布定时器；凭据缺失明确记录跳过

### Requirement: REQ-007 可诊断与兼容升级

系统 系统 SHALL 提供可核对的同步阶段、结果和耗时，并在后端不支持新鲜读取时明确报告能力不足。

#### Scenario: S-007

- **Given** 运行新客户端配旧 edge，或模拟上传/读取失败
- **When** 触发刷新，检查用户提示与诊断记录，随后升级测试后端重试
- **Then** 记录 runId、阶段耗时、目标/确认进度和错误分类且不记录凭据/内容；旧后端不被宣称刷新成功；新旧客户端普通请求兼容

## Behavior

### Inputs

- 已登录身份、云开关、用户刷新、已完成本地统计、可见性/焦点/网络恢复、服务兜底周期。
- 六类账户视图沿用现有时间、时区、source、model、device过滤。

### Outputs

- 本地采集/云发布/账户读取的独立状态与最后成功时间。
- 只有当前身份的已确认结果可更新视图；成功读取允许包含目标完成后新增的用量，不承诺六请求全局原子快照。

### Errors and Edge Cases

- 离线、401/403、429/5xx、锁超时、队列变换、批次耗尽、读取失败和旧服务能力不足均有明确结果。
- 新采集目标有边界；上传期间持续产生数据不会让一次刷新无限等待。
- 上传完成但读取失败应显示“已上传，账户读取失败”，不得将上传回滚或伪造新总量。

### Compatibility

- 本地使用不依赖账号或InsForge；默认统计口径不变。
- 旧客户端未发送新字段继续可用；新客户端遇到不支持新语义的服务应提示升级。
- 关闭同步/退出登录停止后续云调度；已经提交的请求无法撤回，但其结果不得污染后续身份。
- 7681正常端口回退不受影响。

## Traceability

| Requirement | Scenarios | Acceptance Criteria |
| --- | --- | --- |
| REQ-001 | S-001 | AC-001 |
| REQ-002 | S-002 | AC-002 |
| REQ-003 | S-003 | AC-003 |
| REQ-004 | S-004 | AC-004 |
| REQ-005 | S-005 | AC-005 |
| REQ-006 | S-006 | AC-006 |
| REQ-007 | S-007 | AC-007 |

## Acceptance Criteria

### Acceptance Criterion: AC-001 持续自动发布

- **Covers** REQ-001 / S-001
- **Preconditions** 已完成首次上传，保持本地 Dashboard 可见，随后队列新增记录
- **Action** 等待自动检查，另测 focus、online 和本地统计完成事件
- **Expected Result** 在无退避且服务可用时，60 秒内启动发布；无待上传数据时不发送 ingest；同一身份最多一个上传
- **Verification** VER-001, VER-008

### Acceptance Criterion: AC-002 一次手动刷新完成发布

- **Covers** REQ-002 / S-002
- **Preconditions** 已登录并开启云同步，工具日志新增已可解析用量
- **Action** 点击一次 Dashboard 刷新或设置中的立即统计
- **Expected Result** 在本次请求超时边界内，发布达到本次采集后的目标后显示新值，或明确显示未完成；不得要求再次点击；期间新产生的数据不得无限延长本次任务
- **Verification** VER-002, VER-008

### Acceptance Criterion: AC-003 准确区分上传结果

- **Covers** REQ-003 / S-003
- **Preconditions** 模拟云端拒绝、超时、批次数上限、锁竞争和排队后账号变化
- **Action** 执行手动和自动同步
- **Expected Result** 仅确认目标上传完成才更新云成功时间并发送成功事件；失败/部分完成保留旧统计且标记未完成；到期后允许重试
- **Verification** VER-003, VER-008

### Acceptance Criterion: AC-004 上传后读取新数据

- **Covers** REQ-004 / S-004
- **Preconditions** 预热浏览器、代理、edge、数据库缓存并挂起一条旧请求，然后发布新增用量
- **Action** 执行一次账户刷新并释放旧请求；另测新数据读取失败
- **Expected Result** 六类账户聚合反映已确认发布；旧请求不得覆盖；新数据读取失败不以 stale-if-error 伪装刷新成功；普通浏览仍使用缓存
- **Verification** VER-004, VER-008

### Acceptance Criterion: AC-005 本地与身份隔离

- **Covers** REQ-005 / S-005
- **Preconditions** 分别使用退出登录、云开关关闭、不同账号、不同实例及两台设备
- **Action** 产生用量并刷新；在请求进行时切换账号或关闭同步
- **Expected Result** 本地可显示新值且不发起新云上传；旧身份结果不可发布到新视图；不会把本地值直接加到云总量造成重复计数
- **Verification** VER-005, VER-008

### Acceptance Criterion: AC-006 独立于页面的兜底发布

- **Covers** REQ-006 / S-006
- **Preconditions** CLI serve 无 native 同步所有者且关闭浏览器；另测 native 同步所有者存在
- **Action** 新增本地日志并等待后台扫描周期
- **Expected Result** CLI 每五分钟至多一次兜底采集/发布；native 已拥有调度时不得再启动第二套发布定时器；凭据缺失明确记录跳过
- **Verification** VER-006, VER-008

### Acceptance Criterion: AC-007 可诊断与兼容升级

- **Covers** REQ-007 / S-007
- **Preconditions** 运行新客户端配旧 edge，或模拟上传/读取失败
- **Action** 触发刷新，检查用户提示与诊断记录，随后升级测试后端重试
- **Expected Result** 记录 runId、阶段耗时、目标/确认进度和错误分类且不记录凭据/内容；旧后端不被宣称刷新成功；新旧客户端普通请求兼容
- **Verification** VER-007, VER-008
