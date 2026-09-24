# 个人 InsForge 配置

Token Tracker 不再隐式连接项目维护者的 InsForge 实例。使用云登录、设备上传和跨设备统计前，在 `~/.tokentracker/tracker/config.json` 中为当前用户配置同一个实例：

```json
{
  "baseUrl": "https://<your-project>.<region>.insforge.app",
  "anonKey": "<public-anon-key>",
  "dashboardUrl": "http://localhost:7680"
}
```

`baseUrl` 与 `anonKey` 同时供 `sync`、`device-login` 和本地 Dashboard 登录使用；本地 Dashboard 启动时经 CLI 读取公开 URL/key，修改后刷新页面即可生效，无需重新构建 Dashboard。`dashboardUrl` 只在自有托管 Dashboard 时需要改为该站点地址。环境变量 `TOKENTRACKER_INSFORGE_BASE_URL`、`TOKENTRACKER_INSFORGE_ANON_KEY` 和 `TOKENTRACKER_DASHBOARD_URL` 仍可作为临时覆盖项。公开 anon key 可以进入浏览器构建，但 service-role key、OAuth client secret 和数据库凭据只能配置在 InsForge 服务端。

本地 Dashboard 的 `/login` 请求会经过 CLI 服务器的认证代理，并从同一份 `config.json` 读取实例地址。登录页可直接打开 `http://localhost:7680/login`，设备批准页为 `/device`；若使用其他端口，按实际端口访问。

若使用本 fork 的 GitHub Actions 构建或发布，在仓库 Variables 中配置 `TOKENTRACKER_INSFORGE_BASE_URL` 与 `TOKENTRACKER_INSFORGE_ANON_KEY`。未配置时构建产物不包含云实例目标，三个排行榜监控工作流会跳过运行。

社区功能在本分支默认关闭。需要排行榜、成就和公共资料时，在 Dashboard 构建环境设置 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES=true`；Vite 构建会将它映射为 `VITE_TOKENTRACKER_ENABLE_COMMUNITY_FEATURES`，也可以直接设置该 `VITE_` 变量。GitHub repository Variables 中同样设置 `TOKENTRACKER_ENABLE_COMMUNITY_FEATURES=true`，才会启用三个排行榜 GitHub Actions。未设置、设置为 `false` 或其他值都会保持关闭。该开关不会停用个人同步，`TOKENTRACKER_INSFORGE_BASE_URL` 仍独立用于登录、设备授权和用量上传。改回非 `true` 值或删除变量并重新构建 Dashboard 即可恢复关闭状态；不需要删除数据库 migration 或历史数据。

空实例可从 `migrations/20260701000000_bootstrap-tokentracker.sql` 开始按版本部署，后续迁移包含基础 RPC、徽章与历史增量。三条针对上游历史作弊账号的迁移在无匹配记录的空实例上会跳过。链接自己的项目、在 InsForge Secrets 中设置 `INSFORGE_SERVICE_ROLE_KEY` 与 `LEADERBOARD_REFRESH_SECRET` 后运行：

```bash
EXPECTED_INSFORGE_APPKEY="<your-project-appkey>" bash scripts/deploy-personal-insforge.sh
```

部署脚本核对目标项目，应用所有迁移并部署 `dashboard/edge-patches/` 的 23 个 `tokentracker-*` functions。CLI 的项目连接文件 `.insforge/project.json` 及其中的管理 key 必须保持本地且不得提交。还需在自己的 InsForge 控制台配置 OAuth redirect 到自己的 Dashboard。上传 checkpoint 按实例 URL、账号 ID 和机器 ID 隔离；首次切换实例或账号时，从本地仍保留的 `queue.jsonl` 重传历史，成功后才推进对应 checkpoint。旧版仅按 URL 记录的进度归属不明，不会阻止首次重传。

设备授权页默认为 `http://localhost:7680/device`；使用自有托管 Dashboard 时，在运行 CLI 的环境中设置 `TOKENTRACKER_DASHBOARD_URL`，并在 InsForge Secrets 中设置同名 URL，使其他客户端拿到同一验证地址。本地 Dashboard 不需要 `VITE_*` 云配置；远程托管的 Dashboard 仍需在构建时提供 `VITE_INSFORGE_BASE_URL` 与 `VITE_INSFORGE_ANON_KEY`。旧版配置中指向原站点的 Dashboard URL 会被忽略。

未设置完整 URL/key 时，云功能保持禁用，本地解析和本地统计仍可用。切换实例后应验证：首次同步收到历史、第二次同步不重复增加用量、Codex/DSH root 在私有统计中独立显示且公共统计只显示 provider family。

当前个人实例已部署 38 条基础与增量迁移、RPC 和 23 个函数。test 账号验收已完成：四条 Codex/DSH root 首次写入、二次同步零新增、私有统计分别保留四个 root、公开社区按 `codex`/`dsh` 家族汇总。匿名访问私有表已验证遭拒绝。验收用 1010 个 token 的人工测试行仍保留在 test 账号中，便于核对。
