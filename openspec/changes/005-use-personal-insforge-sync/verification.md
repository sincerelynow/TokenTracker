# Verification: 使用个人 InsForge 实例同步用量

## Summary

- Status: Passed; ready to archive
- Verified revision: 2
- Executor: Codex
- Started at: 2026-09-22
- Completed at: 2026-09-22

## Checks

| ID | Required | Requirement/Scenario | Command or method | Result | Evidence/Notes | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| VER-001 | yes | REQ-001 / 无配置与个人配置 | 配置/设备登录测试；test 账号在 `7681` Dashboard 登录并批准个人项目设备码 | Pass | 无配置 baseUrl 为 null；旧上游地址失效；本机认证代理指向 `8g8s7g8b`；真实授权成功，测试设备 token 写入隔离临时配置 | Codex |
| VER-002 | yes | REQ-002 / 旧 offset 切换 | 上传隔离测试；个人项目 test 账号四 root 队列连续调用两次 `drainQueueToCloud` | Pass | 首次 `inserted=4`，第二次 `inserted=0,batches=0`；目标 checkpoint=1100 字节，与队列长度一致；失败不推进由 Node 回归测试覆盖 | Codex |
| VER-003 | yes | REQ-003 / 四 root 聚合 | Node 四 root 载荷测试；真实 `tokentracker_hourly`、`account_model_breakdown_compact`、`account_summary_compact`、公开社区接口和排行榜 | Pass | 私有 root 精确为 101/202/303/404；账户合计 1010、4 次会话；公开社区 `codex=303,dsh=707`、总计 1010，未出现 root 标识；排行榜总计 1010，Codex 在 `gpt_tokens=303`、DSH 按现有列设计进入 `other_tokens=707` | Codex |
| VER-004 | yes | REQ-001 / 构建与回退 | `npm test`; `cd dashboard && npm test`; `npm run dashboard:build`; `npm run validate:guardrails`; `rg` 活跃连接目标 | Pass | Node 2960 通过、2 跳过；Dashboard 786 通过；构建/guardrail 成功；活跃代码没有上游 InsForge URL 请求目标，保留的主机字符串仅用于识别旧配置 | Codex |
| VER-005 | yes | REQ-001–003 / 真实个人实例 | test 账号邮箱登录、设备码批准、真实两次上传、远端私有/公共 RPC 与 Edge 查询 | Pass | 用户批准新设备码；真实 ingest 写入 4 条，二次不写入；私有 RPC 四 root 和账户总量正确；公开社区 200；排行榜初次因缺定价辅助函数 500，补迁移后刷新 200、1 条快照 | 用户与 Codex |
| VER-006 | yes | AC-001–004 / 文档一致性 | 对照 spec、设计、代码与部署说明 | Pass | fork 工作流、隐私、部署、设备验证地址更新；补充 localhost 代理配置要求及登录直达链接；修复本地 Dashboard 登录判定和设备页登录入口 | Codex |
| VER-007 | yes | REQ-004 / 空实例部署和权限 | CLI 迁移/函数清单、RPC、公有调用、匿名 SDK 私有访问检查、重复 `migrations up --all` | Pass | appkey `8g8s7g8b`：37 迁移、23 active 函数；重复迁移 0 pending；真实发码、ingest、社区和排行榜 200；匿名私有表读写拒绝 42501，匿名账户 Edge 返回 401；服务端 secrets 已部署。CLI 禁止通过 SQL `SET ROLE` 模拟认证角色；真实账号通过设备 JWT 授权完成验证 | Codex |
| VER-ARCHIVE-GATE | no | Workflow archive gate | `python3 /Users/lihairui/.agents/skills/open-spec-workflow/scripts/change_gate.py validate --repo /Volumes/NV3500/Java/project/TokenTracker --change openspec/changes/005-use-personal-insforge-sync --phase archive` | Not Run | 归档是独立操作，仅在用户明确授权后执行 | Codex |

## Acceptance Review

| Criterion ID | Expected Result | Result | Evidence |
| --- | --- | --- | --- |
| AC-001 | 无配置不请求上游；配置后只请求个人实例 | Pass | 无配置测试及个人项目登录/授权/上传；VER-001, VER-004, VER-005 |
| AC-002 | 新实例重传且连续同步幂等、失败不推进 | Pass | 真实账号首次写入 4 条、二次 0 条，失败回归测试通过；VER-002, VER-005 |
| AC-003 | 四 root 独立且公共汇总不重算、不泄露路径 | Pass | 私有精确值、公开 303/707、总量 1010，载荷无绝对路径；VER-003, VER-005 |
| AC-004 | 空实例建立应用对象、匿名私有访问被拒绝 | Pass | 37 迁移、23 函数、匿名 42501/401、真实账号授权及 ingest；VER-007, VER-005 |

## Deviations

- 初始空库缺基础 schema，已新增基础迁移及校正迁移；三条只针对上游账号的历史迁移在空库无匹配记录时跳过。所有迁移已成功应用至个人项目。
- 授权函数原先硬编码原站点设备验证 URL；现返回本机地址，并由 CLI 根据当前 Dashboard 配置覆盖旧服务端链接。真实远端 POST 返回 `http://localhost:7680/device`。
- 保留原项目的品牌、SEO 与分享链接；这些不是 InsForge 数据连接目标。工作流需在 fork 的 GitHub Variables 显式配置个人项目 URL/key。
- 本机原 `7680` 服务未带个人云配置，`/api/auth/me` 返回 503；独立 `7681` 服务带个人目标后，登录页又因检测代理的 `http://localhost` 被误判为未配置。已修复检测为查验真实远端 URL/key，重建 Dashboard，并在 `7681` 完成 test 账号登录和设备批准。
- 社区统计原按 root source 分组，已在 `20260922070000` 迁移中折叠为 provider family。排行榜聚合还缺 `leaderboard_pricing_tier` 辅助函数，已在 `20260922073000` 迁移补齐；复测刷新成功。
- 验收使用隔离临时目录中的四条人工测试行，写入 test 账号合计 1010 tokens；这些测试数据仍保留在个人实例供用户核对。未触碰用户原有本地队列。

## Blockers

- 无待解决阻塞。若日后另行验收已登录用户对私有表的直接 RLS，InsForge CLI 不允许 `SET ROLE`；本 change 的私有数据契约由仅 project_admin 可执行的 RPC、匿名拒绝以及真实账号设备授权链路验证。

## Handoff

- Current status: `ready_to_archive`
- Next action: 等待用户单独明确授权归档；届时运行 archive gate 并归档本 change。代码未提交或发布。
