# Design: 按 Codex 配置目录筛选会话

## Context

已验证事实：`src/lib/session-analytics.js` 的 `providerRoots()` 已扫描 `resolveCodexRootPaths()` 返回的全部 Codex roots，`discoverSessionFiles()` 会递归读取每个 root 的 `sessions/` 与 `archived_sessions/`。但发现结果随后被扁平化为文件路径，`scanCodexSession()` 固定写入 `source: "codex"`，`toSessionBrowserRow()` 因而无法输出 root 身份。Sessions 页面只使用静态 provider `SOURCE_FILTERS`，按 `row.source` 在内存中筛选。

`002-aggregate-codex-root-usage` 已在 `src/lib/codex-roots.js` 提供 `{ path, key, label, stats_source }` root records，并明确 key 稳定、label 可显示、路径不进入统计 payload。`003` 复用该身份，不创建第二套 key 或 label 规则。

约束：session browser 是 loopback local-only endpoint；`source: codex` 被 thread lineage、provider icon、统计和 `codex resume` 使用，不能替换成 `codex-root:<key>`。sidecar 当前版本为 12，缓存 key 只包含 provider source 与文件路径，配置 label 变化不会自然使缓存失效。

## Architecture

```text
resolveCodexRootsSync()
  -> ordered root records { path, key, label }
  -> discover sessions + archived sessions with root ownership
  -> group duplicate Codex session IDs; first configured root owns the group
  -> scanCodexSession(files, root metadata)
  -> sidecar row: source=codex + local root identity
  -> listSessionsForBrowser(): source_instance + instance_label
  -> GET /functions/tokentracker-sessions (local only)
  -> SessionsPage: provider filter -> conditional Codex instance filter
```

`summarizeSessions()` 与 `sessionsToCsv()` 保持现有对外契约，不输出新增 root 身份。

## Components

| Component | Responsibility | Change |
| --- | --- | --- |
| Codex root resolver | 稳定 root key/label 与配置顺序 | 直接复用，不修改 |
| Session discovery | 查找 provider 会话并处理重复文件 | Codex 分支携带 root record，group 后保留第一个 root 的身份 |
| Session sidecar | 缓存 metadata-only 会话行 | 升级版本；把 root key/label/顺序纳入缓存与 signature 身份 |
| Browser row mapper | 构造 local-only Sessions API 行 | 仅对可识别 Codex 行输出 `source_instance`、`instance_label` |
| Non-browser serializers | session insights 与 CSV | 显式剥离新增 root 身份，保持契约不变 |
| Sessions API types | 描述 browser response | 增加两个可选字符串字段 |
| Sessions UI | provider、日期、项目与搜索筛选 | 从数据动态派生实例选项，Codex 下条件显示二级筛选并组合过滤 |

## Data Flow

1. Codex discovery 调用 `resolveCodexRootsSync()` 获取有序 root records，而 Claude discovery 继续使用路径数组。
2. 每个 Codex rollout 文件在发现时关联其 root key/label；同一 session ID 的多文件 group 按 resolver 顺序确定 owner，组内文件仍全部交给现有 parser 去重/合并。
3. scanner 继续生成 `source: codex`，并在 sidecar 内保存 owner 的 opaque key 与 label。sidecar 版本递增，root identity 进入缓存判定，避免复用旧版本或旧 label 行。
4. `listSessionsForBrowser()` 将内部身份映射为可选 `source_instance`、`instance_label`；local API 无需新增请求参数。
5. Dashboard 从所有 `source: codex` rows 中按 `source_instance` 去重生成选项。只有至少两个实例时，在 Codex provider control 后显示 `CODEX ALL` 与实例 labels。
6. filter predicate 先应用 provider，再在 Codex provider 活跃时应用实例，最后组合项目、日期与搜索条件。实例消失时 state 回退为 all。

## Technical Decisions

### Decision: 保持 provider source，新增正交实例字段

- **Choice:** browser row 使用 `source: "codex"`、`source_instance: <root-key>`、`instance_label: <root-label>`。
- **Reason:** provider 和实例是两个维度；保持 source 可避免破坏现有 lineage、icon、resume 与来源筛选逻辑，并与首页的实例元数据概念一致。
- **Alternatives:** 把 source 改成 `codex-root:<key>`；会要求所有 Sessions 消费者 canonicalize provider，且 `resumeCommandFor()` 和 Codex lineage 的严格判断会失效。只输出 label；label 可改名且不适合作为稳定筛选身份。

### Decision: 在发现阶段保留 owner，而非扫描后按路径反推

- **Choice:** discovery entry 携带 root metadata，重复 session group 明确保留第一个已配置 root 为 owner。
- **Reason:** 文件已经按 root 配置顺序被枚举；在扁平化后通过字符串前缀反推会受嵌套路径、符号链接和跨平台路径表示影响。
- **Alternatives:** scanner 从文件路径匹配 roots；边界模糊且会重复读取配置。允许重复行各自归属；会破坏现有跨 root 去重和 token 口径。

### Decision: 二级筛选完全在客户端从已加载 rows 派生

- **Choice:** 不增加 endpoint filter 参数；Sessions 一次加载全部 metadata 后动态生成选项并在内存过滤。
- **Reason:** 当前 provider、项目、日期和搜索均在客户端组合，继续沿用可保持切换即时且不会让选项只代表服务端截断子集。
- **Alternatives:** 增加 `source_instance` 查询参数；会增加请求与状态同步复杂度，而服务端仍需扫描全部文件。

### Decision: 只有多实例时显示 root control

- **Choice:** 可识别实例数至少为 2 才显示 `CODEX ALL` 和实例选项。
- **Reason:** 单 root 下 provider=Codex 已表达同一集合，重复 control 增加视觉与操作负担。
- **Alternatives:** 始终显示 `CODEX ALL`；单 root 用户获得无信息量的额外筛选。

### Decision: 新字段只属于 local browser contract

- **Choice:** sidecar 可保存 root 身份，但 `summarizeSessions()` 和 CSV serializer 显式排除这些字段。
- **Reason:** 需求仅涉及 local Sessions；限制传播面可维持云端/导出兼容，并避免将本地 root label 意外扩散到其他通道。
- **Alternatives:** 所有 session analytics 输出实例字段；扩大 API 与隐私审查范围，且没有当前用户价值。

## Data and API Design

- Local response `SessionRow` 新增：
  - `source_instance?: string`：Codex root 的稳定 opaque key，不含绝对路径。
  - `instance_label?: string`：resolver 提供的显示 label。
- `source` 继续为 `"claude" | "codex" | "grok"`。
- `GET /functions/tokentracker-sessions` URL、query、status 与现有字段不变。
- Database、cloud API、upload payload、configuration 和 environment variables：None。
- Sidecar：schema version 从 12 递增，旧缓存自动重建；内部字段名可与 browser 字段一致，但非 browser serializer 必须剥离。

## Trade-offs

| Benefit | Cost | Rationale |
| --- | --- | --- |
| 复用 002 的稳定身份并保持 provider 兼容 | sidecar row 增加两个小字段 | 本地 metadata 体积增量有限，避免全链路 source 变更 |
| 客户端即时组合筛选 | endpoint 仍返回全部 sessions | 当前架构本来就全量扫描和加载，未新增 I/O |
| 确定性归属防止重复 | 跨 root 副本只能显示一个 owner | 一个逻辑 session 应只计一次，配置顺序提供稳定规则 |
| 单 root UI 保持简洁 | 用户不能在单 root 下看到 `CODEX ALL` 标签 | provider Codex 已覆盖完全相同的集合 |

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| root metadata 改变但缓存命中旧行 | Medium | sidecar 版本升级，并把 key/label/顺序纳入 signature/cache 测试 |
| 重构 discovery 破坏跨 root、archive 或 subagent 合并 | High | 保留 group parser 语义，补双 root、重复 ID、archive 与 lineage 回归测试 |
| 旧行被实例 filter 静默隐藏 | Medium | 旧行始终属于 provider Codex 与 `CODEX ALL`，不伪造实例 |
| selected instance 在刷新后消失导致永久空列表 | Low | effect 校验选项并回退 all |
| label 或 root 路径进入非本地输出 | Medium | serializer 显式剥离并以自定义绝对路径测试 browser/insights/CSV |
| 多语言文案或紧凑视口溢出 | Low | 使用现有 SegmentedControl 的 wrap 行为，运行 registry/locale 校验并手工检查桌面与移动视口 |

## Rollout and Rollback

- **Rollout:** 随 CLI 与 Dashboard 同版本发布；首次构建 session analytics 时因 sidecar version 变化执行一次重扫。无需数据迁移或 feature flag。
- **Rollback:** 回退 `src/` 与 Dashboard 变更；旧版本会忽略新增 sidecar 字段，若版本不匹配则按原规则重建缓存。无云端或数据库状态需要回滚。

## Open Questions

- None.
