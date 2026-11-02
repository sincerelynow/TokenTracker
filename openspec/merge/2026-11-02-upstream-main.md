# upstream/main 合并验证记录

- 日期：2026-11-02（Asia/Shanghai）。
- 目标：合入 upstream/main，保留四项 OpenSpec 功能契约；授权来自用户本次合并请求。
- 基线：当前分支 `e696f1b3`；上游 `4c8211e1`（v1.5.3）。
- 策略：双父合并，沿用既有 merge 记录，不改写各 change 的设计及生命周期。

## 兼容处理

- README 同时说明 DSH 多目录及上游会话浏览。
- Usage Overview 保留 Codex/DSH root 汇总去重，同时呈现上游仅请求计数的 provider；model breakdown 同时保留 root 元数据与 conversation count。
- Sessions 保留 Codex root 身份及缓存签名，合入上游 Codex usage 缓存版本和 DSH 会话浏览。DSH 会话浏览使用已配置目录集合，并以目录签名使配置变更立即失效缓存；保留独立家目录 fixture 的隔离。
- 新增回归覆盖 DSH 多目录及配置变更后的缓存刷新。

## 验证

- DSH / Codex 会话及扫描目录定向测试通过；DSH 会话回归 13/13。
- Dashboard TypeScript 检查、生产构建及 copy、locale、UI hardcode、architecture、versions、bot frames 校验通过；构建保留 chunk size 提示。
- Codex 账本改为采用上游的显式 total_tokens 语义；root 回归夹具补齐该字段，相关 73 项测试通过。
- Dashboard 全量 1674/1675 通过，排行榜缓存测试并行执行时超时；该文件单独复验 18/18 通过。
- 未运行原生安装包构建、浏览器人工验收或远程 CI；未发布、部署或推送。
- Node 全量最终复验：4617 项，4599 通过、18 跳过、0 失败（53.67 秒）；使用正常进程权限和 `/tmp` Swift/Clang module cache。
