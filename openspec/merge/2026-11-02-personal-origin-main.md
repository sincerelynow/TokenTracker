# origin/main 合并验证记录

- 日期：2026-11-02（Asia/Shanghai）。
- 目标：将 `origin/main` 合入 `feat/use-personal-insforge-sync`，保留 OpenSpec 001–007 功能设计。
- 基线：当前分支 `dcff3ff5`，origin/main `1c52d0a2`（v1.5.3，fetch 后）。
- 授权：用户要求按功能设计合并 origin/main；普通双父 merge，不改变既有 change 生命周期。

## 冲突与功能保留

- `UpdateChecker.swift` 唯一内容冲突：保留禁用更新检查的 `updateChecksEnabled = false` 门禁，同时采用上游 `UpdateReleaseClient` 发布解析重构。旧更新动作仍受门禁约束。
- 自动合并纳入 origin/main 的 v1.5.3、Codex 和 DSH 会话改进、用量限制及定价等更新；保留个人云配置、社区默认关闭、桌面更新禁用和多 root 功能。

## 验证

- Dashboard 全量：175 文件、1701 测试通过；TypeScript 检查和生产构建通过，构建报告 chunk size 提示。
- Node 全量：4637 项，4614 passed、18 skipped、4 failed、1 cancelled；受限环境中四个服务进程测试失败，Swift 单项超时取消。正常进程权限下两个相关文件复验 16/16 通过。
- copy、locale、UI hardcode、architecture、versions、bot frames 校验通过；版本均为 v1.5.3。
- `git diff --check` 和 staged whitespace 检查通过。未进行三端原生安装包构建或远程 CI；本地测试不代表安装包验收。
- 日志：`/tmp/tt-merge-node.log`、`/tmp/tt-merge-dashboard.log`、`/tmp/tt-merge-build.log`。

本次仅生成本地 merge commit，不推送、不发布或部署。
