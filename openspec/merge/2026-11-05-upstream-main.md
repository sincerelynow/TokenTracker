# upstream/main 合并验证记录

- 日期：2026-11-05（Asia/Shanghai）。
- 目标：合入最新 `upstream/main`，保留 001–004 四项 OpenSpec 功能契约；授权来自用户本次合并请求。
- 基线：当前分支 `1c52d0a2431e314bc71e2312043929793cba9888`；上游 `a3079685c424ffbe81dbaac521713fd304bb834a`（版本 1.5.6）。
- 策略：双父合并，沿用既有 merge 记录，不改写各 change 的设计及生命周期。

## 兼容处理

- 保留启动不自动安装/修复第三方集成、Dashboard 手动管理集成和 CLI 五分钟非重叠统计。
- 保留 Codex/DSH 多扫描目录、稳定 root identity、目录用量拆分、synthetic ALL 汇总和本地路径隐私。
- Sessions 同时保留 Codex root 筛选及上游的服务端日期范围、lifetime facets、精简响应、刷新和压缩缓存。切换 root 仍在客户端进行；切换日期按上游行为请求对应范围。
- 将扫描目录配置文件身份加入 Sessions 响应缓存 key，避免温缓存跳过 root 配置失效检查；sidecar 升至 v29，重建已有 v28 缓存以加载 Claude/Grok 分钟用量及 Claude backend provenance，同时保留 root 签名与归属。
- 上游独立模型归属修复扩展到所有 `codex-root:*`；历史重建保留完整模型归属策略，防止随后解析重复写入刚重建的累计行。
- Codex root 复用 provider 的 reasoning 与速度档位费用规则；`CODEX ALL` 合并各 root 的请求数和 Fast/Ultrafast 明细，底层 root 和总计仍各计一次。
- 保留双方诊断和会话回归测试，增加配置缓存、root 模型迁移、速度档位定价及汇总覆盖。

## 验证

- Dashboard TypeScript 检查通过；生产构建通过（11.75 秒），保留 chunk size 提示。
- copy、locale、UI hardcode、architecture、versions、bot frames 校验均通过；统一版本为上游 1.5.6。
- 定向 Dashboard 回归 56/56 通过（4.07 秒）；Codex/WSL/历史重建及本地验收回归 67/67 通过（0.39 秒）。
- 首轮 Node 全量暴露 root 历史重建后模型归属策略未完整保留的问题；已修复并通过上述回归。
- 首轮 Dashboard 全量 1702/1703 通过，兑换码弹窗焦点断言失败；该文件单独复验 26/26 通过（2.93 秒）。
- 最终 Node 全量：4892 项，4875 通过、17 跳过、0 失败（60.18 秒）；命令为 `SWIFT_MODULECACHE_PATH=/tmp/tokentracker-merge-swift-cache CLANG_MODULE_CACHE_PATH=/tmp/tokentracker-merge-clang-cache npm test`。
- 最终 Dashboard 全量：174 个测试文件、1703/1703 通过（63.96 秒）；命令为 `npm --prefix dashboard test -- --maxWorkers=4 --minWorkers=1`。
- 按 `CLAUDE.md` 尝试 `xcodegen generate && ruby scripts/patch-pbxproj-icon.rb`；本机返回 `command not found: xcodegen`（exit 127），因此未重新生成 macOS 工程或执行后续 patch，未开展环境安装或修复。
- 未运行浏览器人工验收、原生安装包构建或远程 CI；未部署、发布或推送。
