# Design: 修复账户用量发布与刷新延迟

## Context

基线证据与推断边界见proposal.md。现场7680归DoSvc PID4144，7681是正常回退；仅HTTP无法响应不能推出端口无人监听。upload.throttle.json中的nextAllowedAt不是当前路径固定阻塞30分钟的证据，publishAccount路径已忽略成功节流，仅尊重失败退避。本方案不靠缩短该数值解决问题。

## Architecture

本地日志 → 现有解析器 → queue → 发布协调器（身份/开关/锁/有限目标） → 现有ingest → 明确fresh账户读 → 当前代次UI。
调度分两层：可见页面每60秒查询轻量本地状态、按需发布；服务在没有native同步所有者时沿用五分钟兜底。二者共享服务端排他，native已有所有者保持现状。

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| sync + sync-result | 采集与目标发布结果 | 添加结构化协议，不把退出码0等同上传完成 |
| usage-publication + local-api | 身份/开关/凭据/锁/状态/诊断 | 统一HTTP与serve内部入口 |
| serve | 无native所有者的五分钟兜底 | 本地采集后按云开关尝试发布 |
| Dashboard协调器 | 页面唤醒、单次用户操作及反馈 | 合并同身份请求并隔离代次 |
| 账户API、proxy、edge、SQL | 新鲜读取 | 显式fresh语义与能力标识；普通缓存保留 |

## Data Flow

1. 解析前检查请求身份和开关；获取sync.lock后再次检查，排队期间切换身份不得继续旧发布。
2. 按现有轻量all-local-sources解析，提交队列后记录targetOffset及queueGeneration（文件更换/缩短导致代次失效，不能只比较字节数）。
3. 以实例、账号、machine为上传身份，复用现有scoped checkpoint上传到targetOffset；保留批次和时间上限，不越过不完整JSON行。
4. 每次成功ingest后推进checkpoint；当前ingest已经等待hourly及session-state写入，失败不推进该批游标。目标满足后返回published；新增尾部留待下轮。
5. 客户端校验身份、generation和published结果，更新成功时间，失效浏览器及本地代理的对应账户缓存。
6. six account reads使用fresh=1并取得能力响应头；全部必要可见卡片成功后结束刷新。局部失败保持旧值并明确错误；保留最新请求代次保护。
7. 日志写入脱敏阶段/耗时/计数/offset/结果；不写请求体、Authorization、Cookie、完整错误响应或聊天内容。

## Technical Decisions

### Decision: 自动调度与所有者

- **Choice:** 可见本地Dashboard每60秒读取认证的轻量状态；local-usage-synced、focus、online在1秒合并窗口后检查。自动发布最小间隔30秒，失败按现有退避；手动可绕过成功节流，不绕过明确的服务器Retry-After。页面隐藏暂停状态定时器，恢复立即检查。CLI后台五分钟兜底，即使页面关闭也能依托现有relay凭据发布。
- **Reason:** 既避免路由不变不上传，也避免没有新增数据时重复ingest。状态只读小型元数据，不扫描全队列，不返回token。
- **Alternatives:** 不接受仅改setInterval为30秒全量云读取，也不新建与native争抢的第二个扫描定时器。

### Decision: 单次账户操作

- **Choice:** 统一轻量采集+publishAccount+drain请求，避免先本地全扫再调用另一次全扫。服务器复用issueDeviceTokenForLocalSync，不能要求config.json必有deviceToken。设置中的立即统计与Dashboard共用协调器。
- **Reason:** 用户看到的是一个确定的发布目标，而非两次可能乱序的同步。
- **Alternatives:** 不把本地值直接相加到云总量，也不通过延长loading定时器猜测成功。

### Decision: 结构化结果与有限水位

- **Choice:** 默认CLI文本保留；新增--result-json供本地API读取。结果version=1，包含runId、local.status/completedAt、publication.status（disabled/unauthenticated/no_changes/published/partial/failed）、queueGeneration、targetOffset、uploadedOffset、pendingBytes、batches、retryAt和脱敏errorCode。目标是解析结束的固定水位。
- **Reason:** 非drain异常被吞、100批耗尽、锁未获得及缺凭据都不能误报published。
- **Alternatives:** 不解析stdout中的“Sync finished”来证明上传完成；不使用全局legacy offset判断另一身份。

### Decision: 新鲜读取与缓存

- **Choice:** 六个account endpoint接受已认证fresh=1。fresh分支跳过edge缓存和stale-if-error，调用新增五个SQL包装器：account_summary_compact_fresh、account_daily_compact_fresh、account_heatmap_compact_fresh、account_model_breakdown_compact_fresh、account_usage_grouped_fresh（hourly/monthly共用）。
- **Reason:** 需要保留原compact响应、过滤、计价及去重实现，避免复制聚合计算。
- **Implementation:** 包装器与原RPC同签名，SECURITY INVOKER，仅project_admin可执行；事务内set_config('tokentracker.account_usage_fresh','on',true)，再调用原RPC。现有account_usage_grouped_cached检查此事务标志，走account_usage_grouped_v2且不读写旧缓存；普通调用仍原样缓存。验证事务结束不会泄漏标志。六edge返回X-TokenTracker-Account-Fresh: 1并暴露给跨域浏览器；缺失时新客户端报告能力不足，不能默默接收旧服务器忽略参数的结果。
- **Concurrency:** 普通与fresh在途key隔离；fresh开始提升客户端缓存代次，旧在途请求不得重新填充已失效缓存或覆盖UI。fresh响应可以更新当前代次普通缓存，旧请求不得随后覆盖。proxy按身份失效并转发能力头。
- **Load:** fresh仅在确认有发布、用户显式刷新及受控远程账户五分钟更新时使用；自动无变化不发起fresh。保留认证、原有查询范围校验与数据库超时，同key并发合并；不以随机nonce无限扩充缓存key。
- **Failure:** fresh路径禁止浏览器、hooks持久缓存、proxy、edge各层stale-if-error伪装成功；旧数字可保留但必须标为未完成。

### Decision: 远程托管Dashboard

- **Choice:** 不调用不可达的本地发布端点；显式刷新使用fresh读取，页面可见时五分钟兜底读取，恢复焦点检查节流。不宣称已采集远端设备尚未上传的日志。
- **Reason:** 保持跨设备云视图真实边界。

## Data and API Design

- 新增认证GET /functions/tokentracker-sync-status：返回当前身份的opaque scopeId、queueGeneration、当前大小、确认offset、pendingBytes、lastPublishedAt、inFlight、retryAt；不返回身份token或本机路径。无有效凭据返回unauthenticated状态，不能隐式创建跨账号进度。
- POST /functions/tokentracker-local-sync兼容已有ok/code/stdout/stderr，新增syncResult；原生既有调用不被强制改参。后台定时调用同一个内部协调器，避免自HTTP调用。
- Dashboard账户请求增加fresh=1；普通endpoint响应形状不变，能力响应头是强制新鲜语义的确认。
- 数据库只新增函数并替换缓存函数体，不修改用量表或历史数据；保留原RPC签名和授权，不删除队列或进度文件。
- 诊断追加到trackerDir内usage-publication.log，结构化JSONL，5MiB轮转一代；状态接口只读，不对外暴露日志内容。runId连接本地处理各阶段，不把本地文件路径发给云端。
- 用户文案通过copy.csv与现有i18n系统；页面仅展示采集/上传/读取状态，不展示offset等内部概念。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 一次操作可确认新值 | 显式操作需要一次未缓存聚合 | 限制触发频率，普通浏览保留缓存 |
| 无页面也可发布 | 服务需要复用relay凭据和所有者识别 | 避免依赖React生命周期 |
| 目标可结束 | 上传时新尾部留下一轮 | 避免持续使用导致永不完成 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 缓存绕过增加SQL压力 | Medium | 按需触发、合并、现有超时，测量查询次数 |
| 身份切换/开关关闭与排队竞争 | High | 进入锁后复核、结果按scope代次隔离 |
| 新旧客户端/后端混用 | Medium | 加法协议、能力头、数据库→edge→客户端顺序 |
| 队列重建或截断 | High | generation+目标失效重新规划，禁止以更大offset直接证明完成 |
| 自动和native重复发布 | Medium | 沿用所有者规则、共享锁与在途状态 |
| 错误响应带敏感内容 | High | 仅记录枚举及有限安全字段，测试注入凭据不入日志 |

## Rollout and Rollback

- **Rollout:** 批准后完成本地代码和隔离验证；部署测试DB migration→六edge→测试CLI/Dashboard，记录版本及VER-008。用户真实实例和安装包更新作为独立部署批准步骤，先展示准确目标与已验证差异；生产部署不作为偷偷完成本地测试的手段。
- **Rollback:** 客户端/CLI恢复前版；edge恢复前版；数据库恢复迁移前account_usage_grouped_cached函数定义并移除新增fresh包装器。不得删除用量、队列或scoped checkpoint；普通旧RPC一直保留。文档提供命令及对象清单，先在测试库演练。
- **Release:** src/dashboard改动正式交付必须遵守CLAUDE.md全部平台版本与发布要求；本轮只规划，实施就绪也不自动发版。

## Open Questions

- 无设计决策待定。实施如无法获得隔离数据库/云环境，记录VER-008/009阻塞及恢复条件；不得以mock通过替代数据库能力。
